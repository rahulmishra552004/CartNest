from unittest.mock import patch
from uuid import uuid4

from django.contrib.auth import get_user_model
from django.db import IntegrityError
from django.core.cache import cache
from rest_framework.test import APITestCase

from cart.models import CartItem
from deliveryoptions.models import DeliveryOption
from products.models import Product
from vendors.models import Vendor

from .models import CheckoutRequest, Order, OrderItem, get_payment_summary, get_products


class CheckoutTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        User = get_user_model()
        cls.user = User.objects.create_user(username="customer")
        cls.other_user = User.objects.create_user(username="other-customer")
        vendor_user = User.objects.create_user(username="vendor", role="vendor")
        cls.vendor = Vendor.objects.create(user=vendor_user, store_name="Test store")
        cls.product = Product.objects.create(
            vendor=cls.vendor, name="First product",
            price_cents=1000, inventory_stock=10,
        )
        cls.second_product = Product.objects.create(
            vendor=cls.vendor, name="Second product",
            price_cents=2500, inventory_stock=10,
        )
        cls.delivery = DeliveryOption.objects.create(
            id="1", delivery_days=1, price_cents=100,
            estimated_delivery_time_ms=86400000,
        )
        express = DeliveryOption.objects.create(
            id="2", delivery_days=0, price_cents=200,
            estimated_delivery_time_ms=3600000,
        )
        CartItem.objects.create(
            user=cls.user, product=cls.product, quantity=2,
            delivery_option=cls.delivery,
        )
        CartItem.objects.create(
            user=cls.user, product=cls.second_product, quantity=1,
            delivery_option=express,
        )
        cls.other_cart_item = CartItem.objects.create(
            user=cls.other_user, product=cls.product, quantity=4,
        )

    def setUp(self):
        self.client.force_authenticate(self.user)
        self.idempotency_key = str(uuid4())
        self.client.credentials(HTTP_IDEMPOTENCY_KEY=self.idempotency_key)

    def test_checkout_requires_idempotency_key(self):
        self.client.credentials()
        response = self.client.post('/api/orders/', {}, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('Idempotency-Key', response.data)
        self.assertFalse(Order.objects.exists())

    def test_replay_uses_cache_then_database_without_deducting_stock_twice(self):
        with patch('orders_and_paymentsummary.views.send_order_confirmation.delay') as enqueue:
            with self.captureOnCommitCallbacks(execute=True):
                first = self.client.post('/api/orders/', {}, format='json')
            self.assertEqual(first.status_code, 201)
            with self.captureOnCommitCallbacks(execute=True):
                replay = self.client.post('/api/orders/', {}, format='json')
            self.assertEqual(replay.data['id'], first.data['id'])
            cache.delete(f'checkout-result:user:{self.user.pk}:key:{self.idempotency_key}:expand:False')
            with self.captureOnCommitCallbacks(execute=True):
                fallback = self.client.post('/api/orders/', {}, format='json')
            self.assertEqual(fallback.status_code, 201)
            self.assertEqual(fallback.data['id'], first.data['id'])
            enqueue.assert_called_once()
        self.assertEqual(Order.objects.count(), 1)
        self.assertEqual(CheckoutRequest.objects.count(), 1)
        self.product.refresh_from_db()
        self.second_product.refresh_from_db()
        self.assertEqual(self.product.inventory_stock, 8)
        self.assertEqual(self.second_product.inventory_stock, 9)
        self.assertFalse(CartItem.objects.filter(user=self.user).exists())

    def test_helpers_reuse_loaded_cart_without_queries(self):
        items = list(
            CartItem.objects.filter(user=self.user)
            .select_related("product", "delivery_option")
        )
        with self.assertNumQueries(0):
            summary = get_payment_summary(items)
            snapshots = get_products(items)
        self.assertEqual(summary["total_items"], 3)
        self.assertEqual(summary["total_cost_cents"], 5280)
        self.assertEqual(len(snapshots), 2)

    def test_payment_summary_uses_only_authenticated_users_cart(self):
        response = self.client.get("/api/payment-summary/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["totalItems"], 3)
        self.assertEqual(response.data["totalCostCents"], 5280)

    def test_checkout_saves_items_snapshots_and_stock_atomically(self):
        response = self.client.post("/api/orders/", {}, format="json")
        self.assertEqual(response.status_code, 201)
        order = Order.objects.get(pk=response.data["id"])
        self.assertEqual(order.user_id, self.user.pk)
        self.assertEqual(order.total_cost_cents, 5280)
        self.assertEqual(len(order.products), 2)
        items = list(OrderItem.objects.filter(order=order))
        self.assertEqual(len(items), 2)
        self.assertEqual(sum(item.quantity for item in items), 3)
        self.assertTrue(all(item.user_id == self.user.pk for item in items))
        self.assertTrue(all(item.vendor_id == self.vendor.pk for item in items))
        snapshots = {entry["productId"]: entry for entry in order.products}
        for item in items:
            snapshot = snapshots[item.product["id"]]
            self.assertEqual(item.product, snapshot["product"])
            self.assertEqual(item.quantity, snapshot["quantity"])
        self.product.refresh_from_db()
        self.second_product.refresh_from_db()
        self.assertEqual(self.product.inventory_stock, 8)
        self.assertEqual(self.second_product.inventory_stock, 9)
        self.assertFalse(CartItem.objects.filter(user=self.user).exists())
        self.other_cart_item.refresh_from_db()
        self.assertEqual(self.other_cart_item.quantity, 4)

    def test_empty_cart_is_rejected(self):
        CartItem.objects.filter(user=self.user).delete()
        response = self.client.post("/api/orders/", {}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertFalse(Order.objects.exists())
        self.assertTrue(CartItem.objects.filter(pk=self.other_cart_item.pk).exists())

    def test_insufficient_stock_preserves_cart_and_inventory(self):
        Product.objects.filter(pk=self.product.pk).update(inventory_stock=1)
        response = self.client.post("/api/orders/", {}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertFalse(Order.objects.exists())
        self.assertEqual(CartItem.objects.filter(user=self.user).count(), 2)
        self.product.refresh_from_db()
        self.second_product.refresh_from_db()
        self.assertEqual(self.product.inventory_stock, 1)
        self.assertEqual(self.second_product.inventory_stock, 10)

    def test_bulk_insert_failure_rolls_back_order_and_stock(self):
        with patch(
            "orders_and_paymentsummary.views.OrderItem.objects.bulk_create",
            side_effect=IntegrityError("Simulated order-item insert failure"),
        ):
            with self.assertRaises(IntegrityError):
                self.client.post("/api/orders/", {}, format="json")

        self.assertFalse(Order.objects.exists())
        self.assertFalse(OrderItem.objects.exists())
        self.assertEqual(CartItem.objects.filter(user=self.user).count(), 2)
        self.product.refresh_from_db()
        self.second_product.refresh_from_db()
        self.assertEqual(self.product.inventory_stock, 10)
        self.assertEqual(self.second_product.inventory_stock, 10)
