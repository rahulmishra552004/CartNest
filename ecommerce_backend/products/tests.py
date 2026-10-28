from unittest.mock import call, patch
from uuid import uuid4

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import SimpleTestCase, override_settings
from redis.exceptions import ConnectionError as RedisConnectionError
from redis.exceptions import TimeoutError as RedisTimeoutError
from rest_framework.test import APITestCase

from vendors.models import Vendor
from .cache_invalidation import invalidate_products
from .cache_keys import PRODUCT_LIST_CACHE_KEY, product_detail_cache_key
from .models import Product


class ProductCacheInvalidationTests(SimpleTestCase):
    def test_invalidates_list_and_normalized_product_details(self):
        product_id = uuid4()

        with patch('products.cache_invalidation.cache.delete') as delete, \
                patch('products.cache_invalidation.cache.delete_many') as delete_many:
            invalidate_products(str(product_id).upper())

        delete.assert_called_once_with(PRODUCT_LIST_CACHE_KEY)
        delete_many.assert_called_once_with([
            product_detail_cache_key(product_id),
        ])

    def test_list_is_invalidated_when_no_product_ids_are_given(self):
        with patch('products.cache_invalidation.cache.delete') as delete, \
                patch('products.cache_invalidation.cache.delete_many') as delete_many:
            invalidate_products()

        delete.assert_called_once_with(PRODUCT_LIST_CACHE_KEY)
        delete_many.assert_not_called()

    def test_redis_failures_do_not_escape(self):
        product_id = uuid4()

        with patch(
            'products.cache_invalidation.cache.delete',
            side_effect=RedisConnectionError('cache unavailable'),
        ), patch(
            'products.cache_invalidation.cache.delete_many',
            side_effect=RedisTimeoutError('cache timeout'),
        ), self.assertLogs('products.cache_invalidation', level='WARNING') as logs:
            invalidate_products(product_id)

        self.assertEqual(len(logs.output), 2)



@override_settings(CACHES={'default': {
    'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
    'LOCATION': 'rendered-catalog-tests',
    'KEY_PREFIX': 'rendered-catalog-tests',
}})
class RenderedCatalogTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.owner = get_user_model().objects.create_user(username='catalog-vendor', role='vendor')
        vendor = Vendor.objects.create(user=cls.owner, store_name='Catalog store')
        cls.product = Product.objects.create(
            vendor=vendor, name='Test shirt', price_cents=1200,
            rating_stars='4.5', rating_count=12, inventory_stock=10, keywords=['shirt'],
        )

    def setUp(self):
        self.detail_key = product_detail_cache_key(self.product.pk)
        self.detail_url = f'/api/products/{self.product.pk}/'
        cache.delete_many([PRODUCT_LIST_CACHE_KEY, self.detail_key])
        acquire = patch('products.views.acquire_cache_lock', return_value='test-token')
        release = patch('products.views.release_cache_lock')
        self.acquire = acquire.start()
        self.release = release.start()
        self.addCleanup(acquire.stop)
        self.addCleanup(release.stop)
        self.addCleanup(cache.delete_many, [PRODUCT_LIST_CACHE_KEY, self.detail_key])
        recent = patch('products.views.record_product_view')
        ranking = patch('products.views.update_most_viewed')
        self.recent = recent.start()
        self.ranking = ranking.start()
        self.addCleanup(recent.stop)
        self.addCleanup(ranking.stop)

    def test_warm_cache_returns_identical_json_without_queries_or_rendering(self):
        first = self.client.get('/api/products/')
        self.assertEqual(first.status_code, 200)
        payload = cache.get(PRODUCT_LIST_CACHE_KEY)
        self.assertIsInstance(payload, bytes)
        self.assertEqual(first.content, payload)
        product = first.json()[0]
        self.assertEqual(product['id'], str(self.product.pk))
        self.assertEqual(product['rating'], {'stars': 4.5, 'count': 12})
        self.assertEqual(product['priceCents'], 1200)
        self.assertEqual(product['inventoryStock'], 10)
        self.assertNotIn('inventory_stock', product)
        with patch('products.views.JSONRenderer.render', side_effect=AssertionError('Re-rendered cache hit')):
            with self.assertNumQueries(0):
                second = self.client.get('/api/products/')
        self.assertEqual(second.content, first.content)
        self.assertEqual(second['Content-Type'], 'application/json')
        self.acquire.assert_called_once_with(PRODUCT_LIST_CACHE_KEY, ttl=10)
        self.release.assert_called_once_with(PRODUCT_LIST_CACHE_KEY, 'test-token')

    def test_legacy_and_empty_entries_remain_readable(self):
        for cached, expected in (([{'id': 'legacy'}], [{'id': 'legacy'}]), (b'[]', [])):
            with self.subTest(cached=cached):
                cache.set(PRODUCT_LIST_CACHE_KEY, cached)
                with self.assertNumQueries(0):
                    response = self.client.get('/api/products/')
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.json(), expected)
        self.acquire.assert_not_called()

    def test_rendered_entries_work_during_lock_polling_and_recheck(self):
        for token in (None, 'test-token'):
            with self.subTest(token=token):
                self.release.reset_mock()
                self.acquire.return_value = token
                with patch('products.views.cache.get', side_effect=[None, b'[]']), \
                        patch('products.views.time.sleep'), self.assertNumQueries(0):
                    response = self.client.get('/api/products/')
                self.assertEqual(response.content, b'[]')
                if token:
                    self.release.assert_called_once_with(PRODUCT_LIST_CACHE_KEY, token)
                else:
                    self.release.assert_not_called()

    def test_redis_read_failure_returns_database_json(self):
        expected = self.client.get('/api/products/').json()
        with patch('products.views.cache.get', side_effect=RedisConnectionError):
            response = self.client.get('/api/products/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), expected)

    def test_redis_write_failure_still_returns_rendered_json_and_releases_lock(self):
        with patch('products.views.cache.set', side_effect=RedisConnectionError):
            response = self.client.get('/api/products/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()[0]['id'], str(self.product.pk))
        self.assertEqual(response['Content-Type'], 'application/json')
        self.release.assert_called_once_with(PRODUCT_LIST_CACHE_KEY, 'test-token')

    def test_search_bypasses_rendered_list_cache(self):
        self.client.get('/api/products/')
        original = cache.get(PRODUCT_LIST_CACHE_KEY)
        response = self.client.get('/api/products/', {'search': 'no-matching-product'})
        self.assertEqual(response.json(), [])
        self.assertEqual(cache.get(PRODUCT_LIST_CACHE_KEY), original)

    def test_product_write_methods_are_disabled(self):
        self.client.force_authenticate(self.owner)

        requests = (
            ('post', '/api/products/'),
            ('put', self.detail_url),
            ('patch', self.detail_url),
            ('delete', self.detail_url),
        )
        for method, url in requests:
            with self.subTest(method=method):
                response = getattr(self.client, method)(url, {}, format='json')
                self.assertEqual(response.status_code, 405)

        self.product.refresh_from_db()
        self.assertEqual(self.product.inventory_stock, 10)

    def test_vendor_api_writes_inventory_stock_with_camel_case_field(self):
        self.client.force_authenticate(self.owner)

        response = self.client.patch(
            f'/api/vendor/products/{self.product.pk}/',
            {'inventoryStock': 7},
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['inventoryStock'], 7)
        self.assertNotIn('inventory_stock', response.json())
        self.product.refresh_from_db()
        self.assertEqual(self.product.inventory_stock, 7)

    def test_detail_hit_skips_queries_and_rendering_but_still_tracks_views(self):
        self.client.force_authenticate(self.owner)
        first = self.client.get(self.detail_url)
        self.assertEqual(first.status_code, 200)
        self.assertEqual(cache.get(self.detail_key), first.content)
        self.assertIsInstance(cache.get(self.detail_key), bytes)
        with patch('products.views.JSONRenderer.render', side_effect=AssertionError('Re-rendered detail')):
            with self.assertNumQueries(0):
                second = self.client.get(f'/api/products/{str(self.product.pk).upper()}/')
        self.assertEqual(second.content, first.content)
        self.assertEqual(second['Content-Type'], 'application/json')
        self.recent.assert_has_calls([call(self.owner.pk, str(self.product.pk))] * 2)
        self.ranking.assert_has_calls([call(str(self.product.pk))] * 2)
        self.assertEqual(self.recent.call_count, 2)
        self.assertEqual(self.ranking.call_count, 2)

    def test_legacy_detail_entry_still_tracks_guest_ranking(self):
        expected = self.client.get(self.detail_url).json()
        cache.set(self.detail_key, expected)
        with self.assertNumQueries(0):
            response = self.client.get(self.detail_url)
        self.assertEqual(response.json(), expected)
        self.recent.assert_not_called()
        self.assertEqual(self.ranking.call_count, 2)

    def test_detail_read_failure_skips_cache_write_and_preserves_json(self):
        expected = self.client.get(self.detail_url).json()
        with patch('products.views.cache.get', side_effect=RedisConnectionError), \
                patch('products.views.cache.set') as write:
            response = self.client.get(self.detail_url)
            write.assert_not_called()
        self.assertEqual(response.json(), expected)

    def test_detail_write_failure_preserves_successful_response(self):
        with patch('products.views.cache.set', side_effect=RedisConnectionError):
            response = self.client.get(self.detail_url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['id'], str(self.product.pk))
        self.ranking.assert_called_once_with(str(self.product.pk))

    def test_missing_or_malformed_detail_is_not_cached_or_tracked(self):
        with patch('products.views.cache.set') as write:
            for product_id in (str(uuid4()), 'not-a-uuid'):
                with self.subTest(product_id=product_id):
                    response = self.client.get(f'/api/products/{product_id}/')
                    self.assertEqual(response.status_code, 404)
            write.assert_not_called()
        self.recent.assert_not_called()
        self.ranking.assert_not_called()
