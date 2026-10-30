"""Reset test activity, seed unique customers, and save the reset baseline.

Stop Django, Locust, the load-test worker, and Beat before running.
"""
import argparse
import json
import os
from pathlib import Path
import secrets

from setup_loadtest_postgres import SNAPSHOT, restore_baseline, save_baseline, validate_database


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--users', type=int, default=100)
    args = parser.parse_args()
    if not 1 <= args.users <= 10000:
        parser.error('--users must be between 1 and 10000')
    if not SNAPSHOT.is_file():
        parser.error('Run setup_loadtest_postgres.py first.')
    os.environ['DJANGO_SETTINGS_MODULE'] = 'config.loadtest'
    import django
    django.setup()
    from django.conf import settings
    from django.contrib.auth import get_user_model
    from django.db import transaction
    from django.utils import timezone
    from cart.models import CartItem
    from deliveryoptions.models import DeliveryOption
    from orders_and_paymentsummary.models import (
        CheckoutRequest, Order, OrderItem, current_time_ms, get_payment_summary,
        get_product, get_products,
    )
    from products.models import Product

    config = settings.DATABASES['default']
    validate_database(config)
    restore_baseline(config)
    products = list(Product.objects.filter(inventory_stock__gte=2).values_list('pk', flat=True))
    delivery = DeliveryOption.objects.first()
    if not products or delivery is None:
        parser.error('Baseline needs in-stock products and delivery options.')
    accounts = []
    with transaction.atomic():
        for index in range(1, args.users + 1):
            user, _ = get_user_model().objects.get_or_create(username=f'locust_customer_{index:05d}')
            password = secrets.token_urlsafe(24)
            user.set_password(password)
            user.role = 'customer'
            user.is_active = True
            user.is_staff = False
            user.is_superuser = False
            user.email = f'locust_customer_{index:05d}@example.invalid'
            user.save()
            # All scenarios start with an empty cart; read scenarios seed their
            # own data explicitly rather than silently affecting checkout.
            user.cart_items.all().delete()
            # Historical fixtures make order-history reads useful from the first
            # run. They precede the saved stock baseline and send no email.
            history, _ = CheckoutRequest.objects.get_or_create(user=user, key='loadtest-seed-history')
            if history.order_id is None:
                product = Product.objects.get(pk=products[(index - 1) % len(products)])
                item = CartItem(user=user, product=product, quantity=1, delivery_option=delivery)
                payment_summary = get_payment_summary([item])
                order_time_ms = current_time_ms()
                order = Order.objects.create(
                    user=user,
                    order_time_ms=order_time_ms,
                    products=get_products([item], order_time_ms),
                    total_cost_cents=payment_summary['total_cost_cents'],
                    confirmation_email_sent_at=timezone.now(),
                    delivery_recipient_name='Demo Customer',
                    delivery_address_line1='123 Demo Street',
                    delivery_address_line2='',
                    delivery_city='Test City',
                    delivery_state='Test State',
                    delivery_postal_code='110001',
                    delivery_country_code='IN',
                )
                OrderItem.objects.create(
                    order=order, user=user, vendor=product.vendor,
                    product=get_product(product), quantity=1,
                    delivery_days=delivery.delivery_days,
                    estimated_delivery_time_ms=(
                        order_time_ms + delivery.estimated_delivery_time_ms
                    ),
                    delivery_price_cents=delivery.price_cents,
                    tax_cents=payment_summary['tax_cents'],
                )
                history.order = order
                history.save(update_fields=['order'])
            accounts.append({'username': user.username, 'password': password})
    save_baseline(config)
    data = {'accounts': accounts, 'product_ids': [str(p) for p in products],
            'delivery_option_id': str(delivery.pk)}
    destination = Path(__file__).resolve().parent.parent / 'loadtest_data.json'
    destination.write_text(json.dumps(data, indent=2) + '\n', encoding='utf-8')
    destination.chmod(0o600)
    print(f'Prepared {len(accounts)} customers in the test DB and baseline; credentials in {destination.name}.')


if __name__ == '__main__':
    main()
