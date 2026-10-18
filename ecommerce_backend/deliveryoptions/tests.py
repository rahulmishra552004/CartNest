from unittest.mock import patch

from django.core.cache import cache
from django.test import override_settings
from redis.exceptions import ConnectionError as RedisConnectionError
from rest_framework.test import APITestCase

from .models import DeliveryOption


@override_settings(CACHES={'default': {
    'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
    'LOCATION': 'rendered-delivery-tests',
    'KEY_PREFIX': 'rendered-delivery-tests',
}})
class RenderedDeliveryTests(APITestCase):
    keys = ['delivery-options:v1:expanded:0', 'delivery-options:v1:expanded:1']

    @classmethod
    def setUpTestData(cls):
        DeliveryOption.objects.create(id='1', delivery_days=2, price_cents=100,
                                      estimated_delivery_time_ms=172800000)

    def setUp(self):
        cache.delete_many(self.keys)
        self.addCleanup(cache.delete_many, self.keys)

    def test_normal_and_expanded_bytes_are_separate_and_skip_rendering_on_hits(self):
        normal = self.client.get('/api/delivery-options/')
        expanded = self.client.get('/api/delivery-options/', {'expand': 'estimatedDeliveryTime'})
        self.assertEqual(normal.status_code, 200)
        self.assertEqual(expanded.status_code, 200)
        self.assertNotIn('estimatedDeliveryTimeMs', normal.json()[0])
        self.assertEqual(expanded.json()[0]['estimatedDeliveryTimeMs'], 172800000)
        self.assertEqual(cache.get(self.keys[0]), normal.content)
        self.assertEqual(cache.get(self.keys[1]), expanded.content)
        self.assertIsInstance(cache.get(self.keys[0]), bytes)
        with patch('deliveryoptions.views.JSONRenderer.render', side_effect=AssertionError('Re-rendered delivery')):
            with self.assertNumQueries(0):
                warm_normal = self.client.get('/api/delivery-options/')
                warm_expanded = self.client.get('/api/delivery-options/', {'expand': 'estimatedDeliveryTime'})
        self.assertEqual(warm_normal.content, normal.content)
        self.assertEqual(warm_expanded.content, expanded.content)
        self.assertEqual(warm_expanded['Content-Type'], 'application/json')

    def test_legacy_entries_and_empty_bytes_remain_readable(self):
        for value, expected in (([{'id': 'legacy'}], [{'id': 'legacy'}]), (b'[]', [])):
            with self.subTest(value=value):
                cache.set(self.keys[0], value)
                with self.assertNumQueries(0):
                    response = self.client.get('/api/delivery-options/')
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.json(), expected)

    def test_redis_read_failure_preserves_expansion_and_skips_write(self):
        with patch('deliveryoptions.views.cache.get', side_effect=RedisConnectionError), \
                patch('deliveryoptions.views.cache.set') as write:
            response = self.client.get('/api/delivery-options/', {'expand': 'estimatedDeliveryTime'})
            write.assert_not_called()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()[0]['estimatedDeliveryTimeMs'], 172800000)

    def test_redis_write_failure_preserves_response(self):
        with patch('deliveryoptions.views.cache.set', side_effect=RedisConnectionError):
            response = self.client.get('/api/delivery-options/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), [{'id': '1', 'deliveryDays': 2, 'priceCents': 100}])
