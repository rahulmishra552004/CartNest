from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from rest_framework.test import APITestCase

from deliveryoptions.models import DeliveryOption
from products.models import Product
from vendors.models import Vendor

from .models import CartItem


class CartMutationTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        User = get_user_model()
        cls.user = User.objects.create_user(username="customer")
        cls.other_user = User.objects.create_user(username="other-customer")
        vendor_user = User.objects.create_user(username="vendor", role="vendor")
        vendor = Vendor.objects.create(user=vendor_user, store_name="Test store")
        cls.product = Product.objects.create(
            vendor=vendor,
            name="Test product",
            price_cents=1000,
            inventory_stock=10,
        )
        cls.delivery = DeliveryOption.objects.create(
            id="1", delivery_days=1, price_cents=100,
            estimated_delivery_time_ms=86400000,
        )

    def setUp(self):
        self.client.force_authenticate(self.user)

    def test_post_creates_one_row_and_increments_existing_quantity(self):
        for _ in range(2):
            response = self.client.post(
                "/api/cart-items/",
                {"productId": str(self.product.pk), "quantity": 2},
                format="json",
            )
            self.assertEqual(response.status_code, 200)

        self.assertEqual(CartItem.objects.filter(user=self.user).count(), 1)
        self.assertEqual(CartItem.objects.get(user=self.user).quantity, 4)
        self.product.refresh_from_db()
        self.assertEqual(self.product.inventory_stock, 10)

    def test_rejected_addition_preserves_existing_quantity(self):
        item = CartItem.objects.create(
            user=self.user, product=self.product, quantity=8,
        )
        response = self.client.post(
            "/api/cart-items/",
            {"productId": str(self.product.pk), "quantity": 3},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        item.refresh_from_db()
        self.assertEqual(item.quantity, 8)

    def test_put_patch_and_delete_preserve_another_users_cart(self):
        own_item = CartItem.objects.create(user=self.user, product=self.product)
        other_item = CartItem.objects.create(
            user=self.other_user, product=self.product, quantity=7,
        )
        url = f"/api/cart-items/{self.product.pk}/"
        for method, quantity in (("put", 2), ("patch", 3)):
            response = getattr(self.client, method)(
                url, {"quantity": quantity}, format="json",
            )
            self.assertEqual(response.status_code, 200)
            own_item.refresh_from_db()
            self.assertEqual(own_item.quantity, quantity)

        self.assertEqual(self.client.delete(url).status_code, 204)
        self.assertFalse(CartItem.objects.filter(pk=own_item.pk).exists())
        other_item.refresh_from_db()
        self.assertEqual(other_item.quantity, 7)

    def test_database_rejects_zero_quantity(self):
        with self.assertRaises(IntegrityError), transaction.atomic():
            CartItem.objects.create(
                user=self.user, product=self.product, quantity=0,
            )
