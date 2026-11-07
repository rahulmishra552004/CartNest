import json
import random
from datetime import timedelta
from pathlib import Path
from uuid import uuid4

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone
from redis.exceptions import RedisError

from addresses.models import Address
from cart.models import CartItem
from deliveryoptions.models import DeliveryOption
from orders_and_paymentsummary.models import (
    TAX,
    CheckoutRequest,
    Order,
    OrderItem,
    get_payment_summary,
    get_product,
    get_products,
)
from products.cache_keys import PRODUCT_LIST_CACHE_KEY, product_detail_cache_key
from products.models import Product
from vendors.models import Vendor

CATALOG_PATH = Path(__file__).resolve().parents[2] / 'seed_data' / 'catalog.json'

#local-only password, documented in the README. The command refuses to run with DEBUG off.
DEMO_PASSWORD = 'DemoPass123!'

DELIVERY_OPTIONS = [
    {'id': '1', 'delivery_days': 7, 'price_cents': 0},
    {'id': '2', 'delivery_days': 3, 'price_cents': 499},
    {'id': '3', 'delivery_days': 1, 'price_cents': 999},
]

VENDORS = [
    {'username': 'tech_vendor', 'first_name': 'Maya', 'last_name': 'Chen', 'store_name': 'Tech Haven'},
    {'username': 'home_vendor', 'first_name': 'Daniel', 'last_name': 'Ross', 'store_name': 'Home Store'},
]

#phone numbers use the 555-01xx range, which is reserved for fictional use
CUSTOMERS = [
    {
        'username': 'alice_customer', 'first_name': 'Alice', 'last_name': 'Morgan',
        'addresses': [
            {
                'label': 'Home', 'phone_number': '+12025550142', 'line1': '1420 Maple Avenue',
                'line2': 'Apt 3B', 'city': 'Portland', 'state': 'Oregon', 'postal_code': '97205',
            },
            {
                'label': 'Work', 'phone_number': '+12025550142', 'line1': '500 Harbor Drive',
                'line2': 'Floor 12', 'city': 'Portland', 'state': 'Oregon', 'postal_code': '97209',
            },
        ],
    },
    {
        'username': 'bob_customer', 'first_name': 'Bob', 'last_name': 'Nguyen',
        'addresses': [
            {
                'label': 'Home', 'phone_number': '+13125550187', 'line1': '88 Lakeview Terrace',
                'line2': '', 'city': 'Chicago', 'state': 'Illinois', 'postal_code': '60614',
            },
        ],
    },
    {
        'username': 'carol_customer', 'first_name': 'Carol', 'last_name': 'Diaz',
        'addresses': [
            {
                'label': 'Home', 'phone_number': '+15125550119', 'line1': '2701 Sunset Road',
                'line2': '', 'city': 'Austin', 'state': 'Texas', 'postal_code': '78704',
            },
            {
                'label': "Mom's house", 'phone_number': '+15125550163', 'line1': '19 Oak Hollow Lane',
                'line2': '', 'city': 'San Antonio', 'state': 'Texas', 'postal_code': '78209',
            },
        ],
    },
    {
        'username': 'david_customer', 'first_name': 'David', 'last_name': 'Okafor',
        'addresses': [
            {
                'label': '', 'phone_number': '+16175550128', 'line1': '310 Beacon Street',
                'line2': 'Unit 5', 'city': 'Boston', 'state': 'Massachusetts', 'postal_code': '02116',
            },
        ],
    },
]

#(customer, days ago, delivery option). The spread fills every vendor stats range
#(7, 30, 90 days, all time), and recent orders give every delivery status.
ORDERS = [
    ('alice_customer', 140, '1'),
    ('bob_customer', 118, '2'),
    ('carol_customer', 85, '1'),
    ('alice_customer', 72, '3'),
    ('david_customer', 64, '1'),
    ('bob_customer', 51, '2'),
    ('carol_customer', 43, '1'),
    ('alice_customer', 33, '2'),
    ('david_customer', 26, '3'),
    ('carol_customer', 19, '1'),
    ('bob_customer', 12, '2'),
    ('alice_customer', 6, '1'),
    ('david_customer', 4, '2'),
    ('carol_customer', 2, '1'),
    ('bob_customer', 1, '2'),
    ('alice_customer', 0, '3'),
]

#(customer, how many products, delivery option)
CARTS = [
    ('alice_customer', 2, '1'),
    ('bob_customer', 1, '2'),
    ('carol_customer', 3, '1'),
]


class Command(BaseCommand):
    help = 'Fill an empty development database with demo accounts, products, and orders.'

    def handle(self, *args, **options):
        if not settings.DEBUG:
            raise CommandError('seed_demo creates accounts with a public password; it needs DEBUG on.')

        models = [get_user_model(), Vendor, Product, DeliveryOption, Order, CheckoutRequest]
        if any(model.objects.exists() for model in models):
            raise CommandError('The database already has data. seed_demo only fills an empty database.')

        #a fixed seed gives every new database the same demo data
        self.rng = random.Random(2026)

        with transaction.atomic():
            users = self._create_users()
            delivery_options = self._create_delivery_options()
            products = self._create_products(users)
            self._create_orders(users, products, delivery_options)
            self._create_carts(users, products, delivery_options)
            product_ids = [product.pk for product in products]
            transaction.on_commit(lambda: self._invalidate_cache(product_ids))

        self.stdout.write(self.style.SUCCESS(
            f'Created {get_user_model().objects.count()} users, '
            f'{Vendor.objects.count()} vendors, '
            f'{Product.objects.count()} products, '
            f'{Address.objects.count()} addresses, '
            f'{Order.objects.count()} orders, '
            f'{OrderItem.objects.count()} order items, and '
            f'{CartItem.objects.count()} cart items.'
        ))
        self.stdout.write(f'Log in as any demo user with the password {DEMO_PASSWORD}')

    def _create_users(self):
        User = get_user_model()
        users = {}

        User.objects.create_superuser(
            username='demo_admin',
            email='demo_admin@example.com',
            password=DEMO_PASSWORD,
            first_name='Demo',
            last_name='Admin',
        )

        for details in VENDORS:
            user = User.objects.create_user(
                username=details['username'],
                email=f"{details['username']}@example.com",
                password=DEMO_PASSWORD,
                first_name=details['first_name'],
                last_name=details['last_name'],
                role=User.Role.VENDOR,
            )
            Vendor.objects.create(user=user, store_name=details['store_name'], is_verified=True)
            users[user.username] = user

        for details in CUSTOMERS:
            user = User.objects.create_user(
                username=details['username'],
                email=f"{details['username']}@example.com",
                password=DEMO_PASSWORD,
                first_name=details['first_name'],
                last_name=details['last_name'],
            )
            for index, address in enumerate(details['addresses']):
                Address.objects.create(
                    user=user,
                    is_default=index == 0,
                    recipient_name=f'{user.first_name} {user.last_name}',
                    country_code='US',
                    **address,
                )
            users[user.username] = user

        return users

    def _create_delivery_options(self):
        options = {}
        for details in DELIVERY_OPTIONS:
            options[details['id']] = DeliveryOption.objects.create(
                estimated_delivery_time_ms=details['delivery_days'] * 24 * 60 * 60 * 1000,
                **details,
            )
        return options

    def _create_products(self, users):
        catalog = json.loads(CATALOG_PATH.read_text(encoding='utf-8'))
        return Product.objects.bulk_create([
            Product(
                id=item['id'],
                image=item['image'],
                name=item['name'],
                rating_stars=item['rating_stars'],
                rating_count=item['rating_count'],
                price_cents=item['price_cents'],
                keywords=item['keywords'],
                inventory_stock=item['inventory_stock'],
                vendor=users[item['vendor']].vendor,
            )
            for item in catalog
        ])

    def _create_orders(self, users, products, delivery_options):
        now = timezone.now()

        for username, days_ago, option_id in ORDERS:
            user = users[username]
            ordered_at = now - timedelta(days=days_ago, hours=self.rng.randint(1, 9))
            address = user.addresses.order_by('-is_default', 'created_at').first()
            delivery_option = delivery_options[option_id]

            #unsaved cart lines, so totals and snapshots come from the same code as checkout
            cart_items = [
                CartItem(
                    user=user,
                    product=product,
                    quantity=self.rng.randint(1, 3),
                    delivery_option=delivery_option,
                )
                for product in self.rng.sample(products, self.rng.randint(1, 4))
            ]
            order_time_ms = int(ordered_at.timestamp() * 1000)

            order = Order.objects.create(
                user=user,
                order_time_ms=order_time_ms,
                total_cost_cents=get_payment_summary(cart_items)['total_cost_cents'],
                products=get_products(cart_items, order_time_ms),
                status=Order.STATUS.CONFIRMED,
                paid_at=ordered_at,
                #marked as sent so the recovery task doesn't email every demo order
                confirmation_email_sent_at=ordered_at,
                confirmation_email_attempts=1,
                confirmation_email_last_attempt_at=ordered_at,
                delivery_recipient_name=address.recipient_name,
                delivery_label=address.label,
                delivery_phone_number=address.phone_number,
                delivery_address_line1=address.line1,
                delivery_address_line2=address.line2,
                delivery_city=address.city,
                delivery_state=address.state,
                delivery_postal_code=address.postal_code,
                delivery_country_code=address.country_code,
            )

            OrderItem.objects.bulk_create([
                OrderItem(
                    user=user,
                    vendor_id=item.product.vendor_id,
                    order=order,
                    product=get_product(item.product),
                    quantity=item.quantity,
                    delivery_days=delivery_option.delivery_days,
                    estimated_delivery_time_ms=(
                        order_time_ms + delivery_option.estimated_delivery_time_ms
                    ),
                    delivery_price_cents=delivery_option.price_cents,
                    delivery_status=self._delivery_status(ordered_at, now, delivery_option),
                    tax_cents=round(TAX * (
                        item.quantity * item.product.price_cents + delivery_option.price_cents
                    )),
                )
                for item in cart_items
            ])

            checkout_request = CheckoutRequest.objects.create(
                user=user,
                key=str(uuid4()),
                order=order,
            )
            #created_at is auto_now_add, so it has to be backdated separately
            CheckoutRequest.objects.filter(pk=checkout_request.pk).update(created_at=ordered_at)

    def _delivery_status(self, ordered_at, now, delivery_option):
        age = now - ordered_at
        if age >= timedelta(days=delivery_option.delivery_days):
            return OrderItem.DeliveryStatus.DELIVERED
        if age >= timedelta(hours=12):
            return OrderItem.DeliveryStatus.SHIPPING
        return OrderItem.DeliveryStatus.PREPARING

    def _create_carts(self, users, products, delivery_options):
        for username, product_count, option_id in CARTS:
            for product in self.rng.sample(products, product_count):
                CartItem.objects.create(
                    user=users[username],
                    product=product,
                    quantity=self.rng.randint(1, 2),
                    delivery_option=delivery_options[option_id],
                )

    def _invalidate_cache(self, product_ids):
        keys = [
            PRODUCT_LIST_CACHE_KEY,
            'delivery-options:v1:expanded:0',
            'delivery-options:v1:expanded:1',
            *(product_detail_cache_key(product_id) for product_id in product_ids),
        ]
        try:
            cache.delete_many(keys)
        except RedisError as exc:
            self.stderr.write(self.style.WARNING(
                f'Demo data was saved, but cache invalidation failed: {exc}'
            ))
