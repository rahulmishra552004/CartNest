"""Capture pre-run state or reconcile stock/orders and report email progress.

Use only with the isolated database. Stop HTTP traffic and allow the worker to
finish before --verify. Do not reset the DB between capture and verification.
"""
import argparse
from collections import Counter
import json
import os
from pathlib import Path
import sys


def snapshot():
    from products.models import Product
    from orders_and_paymentsummary.models import Order, OrderItem
    quantities = Counter()
    for product, quantity in OrderItem.objects.values_list('product', 'quantity').iterator():
        quantities[product['id']] += quantity
    return {
        'stock': {str(pk): stock for pk, stock in Product.objects.values_list('pk', 'inventory_stock')},
        'sold': dict(quantities),
        'orders': [str(pk) for pk in Order.objects.values_list('pk', flat=True)],
    }


def reconcile(baseline, current):
    errors = []
    if set(baseline['stock']) != set(current['stock']):
        errors.append('Product set changed during run')
    if not set(baseline['orders']).issubset(current['orders']):
        errors.append('Orders disappeared: was the database reset after capture?')
    for product, initial in baseline['stock'].items():
        sold = current['sold'].get(product, 0) - baseline['sold'].get(product, 0)
        stock = current['stock'].get(product)
        if stock is None or initial - stock != sold or stock < 0:
            errors.append(f'{product}: stock deduction does not match purchased quantity')
    return errors


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    actions = parser.add_mutually_exclusive_group(required=True)
    actions.add_argument('--capture', action='store_true')
    actions.add_argument('--verify', action='store_true')
    parser.add_argument('--snapshot', type=Path, default=Path(__file__).with_name('loadtest-audit.json'))
    args = parser.parse_args()
    os.environ['DJANGO_SETTINGS_MODULE'] = 'config.loadtest'
    import django
    django.setup()
    from django.conf import settings
    from django.utils import timezone
    from setup_loadtest_postgres import validate_database
    from orders_and_paymentsummary.models import CheckoutRequest, Order
    validate_database(settings.DATABASES['default'])
    current = snapshot()
    if args.capture:
        if args.snapshot.exists():
            parser.error('Snapshot exists; choose a fresh --snapshot path for each run.')
        args.snapshot.write_text(json.dumps(current, indent=2) + '\n', encoding='utf-8')
        print(f'Captured {len(current["stock"])} products and {len(current["orders"])} existing orders.')
        return
    baseline = json.loads(args.snapshot.read_text(encoding='utf-8'))
    errors = reconcile(baseline, current)
    new_ids = set(current['orders']) - set(baseline['orders'])
    linked = CheckoutRequest.objects.filter(order_id__in=new_ids).count()
    if linked != len(new_ids):
        errors.append('New orders do not each have one checkout idempotency record')
    orders = Order.objects.filter(pk__in=new_ids)
    sent = orders.filter(confirmation_email_sent_at__isnull=False).count()
    completion_times = [
        max(0, timestamp.timestamp() - order_ms / 1000)
        for timestamp, order_ms in orders.filter(confirmation_email_sent_at__isnull=False)
            .values_list('confirmation_email_sent_at', 'order_time_ms')
    ]
    pending = orders.filter(confirmation_email_sent_at__isnull=True)
    oldest_ms = pending.order_by('order_time_ms').values_list('order_time_ms', flat=True).first()
    age = round(timezone.now().timestamp() - oldest_ms / 1000, 1) if oldest_ms else 0
    # Read only: do not consume or purge queued messages.
    from config.celery import app
    with app.connection_for_read(connect_timeout=3) as connection:
        queue = app.amqp.queues['ecommerce_loadtest']
        bound = queue(connection.default_channel)
        depth = bound.queue_declare(passive=True).message_count
    print(json.dumps({'new_orders': len(new_ids), 'confirmations_completed': sent,
                      'mean_confirmation_seconds': round(sum(completion_times) / len(completion_times), 3)
                          if completion_times else None,
                      'confirmations_pending': pending.count(), 'oldest_pending_seconds': age,
                      'queued_tasks': depth, 'errors': errors}, indent=2))
    if errors:
        sys.exit(1)


if __name__ == '__main__':
    main()
