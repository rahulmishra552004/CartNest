"""Unit checks for load-generator recovery, without making HTTP requests."""
# Locust must patch sockets before importing unittest's networking dependencies.
import locustfile as workload
import locust_scenarios as scenarios
from locust.env import Environment
import unittest
from unittest.mock import Mock, patch
from collections import Counter
import random


class RecoveryTests(unittest.TestCase):
    def setUp(self):
        host = patch.object(workload.IsolatedUser, 'host', 'http://127.0.0.1:1')
        host.start()
        self.addCleanup(host.stop)
        chooser = patch.object(workload, 'choose_product', return_value='product-a')
        chooser.start()
        self.addCleanup(chooser.stop)
        self.user = workload.CheckoutUser(Environment())
        self.user.account = {'username': 'customer', 'password': 'secret', 'address_id': 'address-a'}
        self.user.product_id = 'product-a'
        self.user.clean_cart = Mock()
        self.user.add_item = Mock()
        self.summary = Mock()
        self.summary.json.return_value = {'totalItems': 1, 'totalCostCents': 1100}
        self.order = Mock()
        self.order.json.return_value = {'id': 'order-a'}

    def test_uncertain_checkout_reuses_key_and_does_not_add_again(self):
        self.user.request = Mock(side_effect=[self.summary, workload.FlowFailure('timeout', 0)])
        self.user.checkout()
        key = self.user.pending['key']
        self.user.request = Mock(side_effect=[self.order, Mock(), Mock()])
        self.user.checkout()
        self.assertEqual(self.user.request.call_args_list[0].kwargs['headers']['Idempotency-Key'], key)
        self.assertEqual(self.user.request.call_args_list[0].kwargs['name'], 'Checkout: resolve pending')
        self.assertEqual(self.user.request.call_args_list[0].kwargs['json'], {'addressId': 'address-a'})
        self.user.clean_cart.assert_called_once()
        self.user.add_item.assert_called_once()
        self.assertIsNone(self.user.pending)

    def test_terminal_rejection_allows_fresh_cart_next_iteration(self):
        self.user.request = Mock(side_effect=[self.summary, workload.FlowFailure('out of stock', 400)])
        self.user.checkout()
        self.assertIsNone(self.user.pending)

    def test_replay_checks_same_order_and_preserves_key_on_failure(self):
        self.user.replay = True
        self.user.request = Mock(side_effect=[self.summary, self.order, workload.FlowFailure('timeout', 0)])
        self.user.checkout()
        self.assertEqual(self.user.pending['order_id'], 'order-a')
        calls = self.user.request.call_args_list
        self.assertEqual(calls[1].kwargs['headers'], calls[2].kwargs['headers'])
        validator = calls[2].kwargs['validate']
        with self.assertRaisesRegex(ValueError, 'different order'):
            validator({'id': 'order-b', 'totalCostCents': 1100,
                       'products': [{'productId': 'product-a', 'quantity': 1}]})

    def test_failed_cart_flow_cleans_up_on_next_iteration(self):
        user = workload.CartUser(Environment())
        user.clean_cart = Mock()
        user.add_item = Mock(side_effect=workload.FlowFailure('timeout', 0))
        user.cart_lifecycle()
        user.cart_lifecycle()
        self.assertEqual(user.clean_cart.call_count, 2)

    def test_http_success_with_wrong_body_is_recorded_as_failure(self):
        user = workload.IsolatedUser(Environment())
        response = Mock(status_code=200)
        response.json.return_value = {'id': 'wrong-product'}
        user.client.request = Mock()
        user.client.request.return_value.__enter__ = Mock(return_value=response)
        user.client.request.return_value.__exit__ = Mock(return_value=False)
        with self.assertRaises(workload.FlowFailure):
            user.request('GET', '/api/products/expected/',
                         validate=lambda data: workload.check(data['id'] == 'expected', 'Wrong product'))
        response.failure.assert_called_once()

    def test_session_and_checkout_headers_are_merged_without_shared_state(self):
        user = workload.IsolatedUser(Environment())
        other = workload.IsolatedUser(Environment())
        user.headers['X-CSRFToken'] = 'rotated-token'
        response = Mock(status_code=201)
        user.client.request = Mock()
        user.client.request.return_value.__enter__ = Mock(return_value=response)
        user.client.request.return_value.__exit__ = Mock(return_value=False)
        user.request('POST', '/api/orders/', expected=201,
                     headers={'Idempotency-Key': 'purchase-key'}, json={})
        options = user.client.request.call_args.kwargs
        self.assertEqual(options['headers'], {'X-CSRFToken': 'rotated-token',
                                               'Idempotency-Key': 'purchase-key'})
        self.assertNotIn('timeout', options)
        self.assertNotIn('Idempotency-Key', user.headers)
        self.assertEqual(other.headers, {})
        self.assertIsNot(user.client.cookiejar, other.client.cookiejar)

    def test_expected_error_status_is_recorded_as_success(self):
        user = workload.IsolatedUser(Environment())
        response = Mock(status_code=400)
        user.client.request = Mock()
        user.client.request.return_value.__enter__ = Mock(return_value=response)
        user.client.request.return_value.__exit__ = Mock(return_value=False)
        user.request('POST', '/api/orders/', expected=400, json={})
        response.success.assert_called_once()
        response.failure.assert_not_called()

    def test_throttled_search_has_separate_stats_and_respects_cooldown(self):
        user = scenarios.GuestSearchUser(Environment())
        response = Mock(status_code=429, headers={'Retry-After': '20'}, request_meta={})
        user.client.get = Mock()
        user.client.get.return_value.__enter__ = Mock(return_value=response)
        user.client.get.return_value.__exit__ = Mock(return_value=False)
        with patch('locust_scenarios.sleep') as sleep:
            user.search()
        self.assertEqual(response.request_meta['name'], 'Search: throttled (429)')
        response.success.assert_called_once()
        sleep.assert_called_once_with(20)

    def test_malformed_retry_after_remains_failure(self):
        user = scenarios.GuestSearchUser(Environment())
        response = Mock(status_code=429, headers={'Retry-After': 'not-a-number'}, request_meta={})
        user.client.get = Mock()
        user.client.get.return_value.__enter__ = Mock(return_value=response)
        user.client.get.return_value.__exit__ = Mock(return_value=False)
        with patch('locust_scenarios.sleep') as sleep:
            user.search()
        response.failure.assert_called_once()
        response.success.assert_not_called()
        sleep.assert_not_called()


class DistributionTests(unittest.TestCase):
    def test_product_popularity_is_symmetric_and_peaks_in_middle(self):
        cumulative = workload.product_cumulative_weights(42)
        weights = [current - previous for previous, current in zip((0,) + cumulative, cumulative)]
        for left, right in zip(weights, reversed(weights)):
            self.assertAlmostEqual(left, right)
        self.assertTrue(all(left < right for left, right in zip(weights[:20], weights[1:21])))
        self.assertGreater(weights[20], weights[0] * 50)

    def test_sampled_product_requests_concentrate_in_middle(self):
        products = [f'product-{index:02}' for index in range(42)]
        rng = random.Random(2026)
        with patch.dict(workload.DATA, {'product_ids': products}), \
                patch.object(workload.random, 'choices', side_effect=rng.choices):
            counts = Counter(workload.choose_product() for _ in range(20000))
        middle = sum(counts[product] for product in products[14:28]) / 20000
        self.assertGreater(middle, 0.65)
        self.assertLess(middle, 0.72)
        self.assertEqual(len(counts), 42)

    def test_default_mix_favors_product_browsing_over_mutating_flows(self):
        users = (workload.CatalogUser, workload.CustomerUser, workload.CartUser, workload.CheckoutUser)
        self.assertEqual(workload.CatalogUser.weight / sum(user.weight for user in users), 0.95)
        catalog_tasks = Counter(task.__name__ for task in workload.CatalogUser.tasks)
        self.assertEqual(catalog_tasks, {'browse_product': 65, 'product_detail': 30,
                                         'view_delivery_options': 3, 'most_viewed': 2})


if __name__ == '__main__':
    unittest.main()
