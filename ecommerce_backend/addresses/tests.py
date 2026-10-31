from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from rest_framework.test import APITestCase

from .models import Address, MAX_ADDRESS_PER_USER

ADDRESS_FIELDS = dict(
    recipient_name="Demo Customer", phone_number="+919876543210",
    line1="12 MG Road", city="Pune", state="Maharashtra",
    postal_code="411001", country_code="IN",
)
VALID_PAYLOAD = {
    "recipientName": "Demo Customer", "phoneNumber": "+91 98765-43210",
    "line1": "12 MG Road", "city": "Pune", "state": "Maharashtra",
    "postalCode": "411001", "countryCode": "in",
}


class AddressApiTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        User = get_user_model()
        cls.user = User.objects.create_user(username="customer")
        cls.other_user = User.objects.create_user(username="other-customer")
        cls.other_address = Address.objects.create(
            user=cls.other_user, is_default=True, **ADDRESS_FIELDS,
        )

    def setUp(self):
        self.client.force_authenticate(self.user)

    def create_address(self, **overrides):
        return Address.objects.create(user=self.user, **{**ADDRESS_FIELDS, **overrides})

    def default_ids(self):
        return [
            str(pk) for pk in Address.objects.filter(user=self.user, is_default=True)
            .values_list("pk", flat=True)
        ]

    def test_first_address_becomes_default_and_is_normalized(self):
        response = self.client.post("/api/addresses/", VALID_PAYLOAD, format="json")

        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.data["isDefault"])
        self.assertEqual(response.data["phoneNumber"], "+919876543210")
        self.assertEqual(response.data["countryCode"], "IN")
        address = Address.objects.get(pk=response.data["id"])
        self.assertEqual(address.user_id, self.user.pk)

    def test_later_address_is_not_default_unless_requested(self):
        first = self.client.post("/api/addresses/", VALID_PAYLOAD, format="json")
        second = self.client.post("/api/addresses/", VALID_PAYLOAD, format="json")

        self.assertEqual(second.status_code, 201)
        self.assertFalse(second.data["isDefault"])
        self.assertEqual(self.default_ids(), [first.data["id"]])

    def test_new_default_address_replaces_old_default(self):
        old_default = self.create_address(is_default=True)

        response = self.client.post(
            "/api/addresses/", {**VALID_PAYLOAD, "isDefault": True}, format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(self.default_ids(), [response.data["id"]])
        old_default.refresh_from_db()
        self.assertFalse(old_default.is_default)

    def test_patch_moves_default_to_another_address(self):
        old_default = self.create_address(is_default=True)
        other = self.create_address(label="Office")

        response = self.client.patch(
            f"/api/addresses/{other.pk}/", {"isDefault": True}, format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.default_ids(), [str(other.pk)])
        old_default.refresh_from_db()
        self.assertFalse(old_default.is_default)

    def test_patch_keeps_fields_that_were_not_sent(self):
        address = self.create_address(is_default=True, label="Home", line2="Flat 4B")

        response = self.client.patch(
            f"/api/addresses/{address.pk}/", {"city": "Mumbai"}, format="json",
        )

        self.assertEqual(response.status_code, 200)
        address.refresh_from_db()
        self.assertEqual(address.city, "Mumbai")
        self.assertTrue(address.is_default)
        self.assertEqual(address.label, "Home")
        self.assertEqual(address.line2, "Flat 4B")

    def test_list_returns_only_own_addresses_with_default_first(self):
        older = self.create_address(label="Office")
        default = self.create_address(label="Home", is_default=True)
        newer = self.create_address(label="Parents")

        response = self.client.get("/api/addresses/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            [address["id"] for address in response.data],
            [str(default.pk), str(newer.pk), str(older.pk)],
        )

    def test_other_users_address_cannot_be_changed_or_deleted(self):
        patch = self.client.patch(
            f"/api/addresses/{self.other_address.pk}/", {"city": "Hacked"}, format="json",
        )
        delete = self.client.delete(f"/api/addresses/{self.other_address.pk}/")

        self.assertEqual(patch.status_code, 404)
        self.assertEqual(delete.status_code, 404)
        self.other_address.refresh_from_db()
        self.assertEqual(self.other_address.city, "Pune")

    def test_rejects_address_over_limit(self):
        for _ in range(MAX_ADDRESS_PER_USER):
            self.create_address()

        response = self.client.post("/api/addresses/", VALID_PAYLOAD, format="json")

        self.assertEqual(response.status_code, 400)
        self.assertIn("detail", response.data)
        self.assertEqual(
            Address.objects.filter(user=self.user).count(), MAX_ADDRESS_PER_USER,
        )

    def test_other_users_addresses_do_not_count_towards_limit(self):
        for _ in range(MAX_ADDRESS_PER_USER - 1):
            Address.objects.create(user=self.other_user, **ADDRESS_FIELDS)

        response = self.client.post("/api/addresses/", VALID_PAYLOAD, format="json")

        self.assertEqual(response.status_code, 201)

    def test_invalid_phone_and_country_code_are_rejected(self):
        response = self.client.post(
            "/api/addresses/",
            {**VALID_PAYLOAD, "phoneNumber": "98765", "countryCode": "1N"},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("phoneNumber", response.data)
        self.assertIn("countryCode", response.data)
        self.assertFalse(Address.objects.filter(user=self.user).exists())

    def test_put_is_not_allowed(self):
        address = self.create_address()

        response = self.client.put(f"/api/addresses/{address.pk}/", VALID_PAYLOAD, format="json")

        self.assertEqual(response.status_code, 405)

    def test_delete_removes_own_address(self):
        address = self.create_address()

        response = self.client.delete(f"/api/addresses/{address.pk}/")

        self.assertEqual(response.status_code, 204)
        self.assertFalse(Address.objects.filter(pk=address.pk).exists())

    def test_requires_authentication(self):
        self.client.force_authenticate(None)

        response = self.client.get("/api/addresses/")

        self.assertEqual(response.status_code, 403)

    def test_database_allows_only_one_default_per_user(self):
        self.create_address(is_default=True)

        with self.assertRaises(IntegrityError), transaction.atomic():
            self.create_address(is_default=True)
