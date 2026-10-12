"""Reset test activity, seed unique customers, and save the reset baseline.

Stop Django and Locust before running. Never touches the normal database.
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
    from cart.models import CartItem
    from deliveryoptions.models import DeliveryOption
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
            user.save()
            CartItem.objects.get_or_create(
                user=user, product_id=products[(index - 1) % len(products)],
                defaults={'quantity': 1, 'delivery_option': delivery},
            )
            accounts.append({'username': user.username, 'password': password})
    save_baseline(config)
    data = {'accounts': accounts, 'product_ids': [str(p) for p in products],
            'delivery_option_id': str(delivery.pk)}
    destination = Path(__file__).resolve().parent.parent / 'loadtest_data.json'
    destination.write_text(json.dumps(data, indent=2) + '\n', encoding='utf-8')
    print(f'Prepared {len(accounts)} customers in the test DB and baseline; credentials in {destination.name}.')


if __name__ == '__main__':
    main()
