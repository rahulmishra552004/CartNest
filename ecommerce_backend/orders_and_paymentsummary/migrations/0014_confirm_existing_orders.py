from django.db import migrations
from django.utils import timezone


def confirm_existing_orders(apps, schema_editor):
    Order = apps.get_model('orders_and_paymentsummary', 'Order')
    Order.objects.update(status='confirmed', paid_at=timezone.now())


class Migration(migrations.Migration):

    dependencies = [
        ('orders_and_paymentsummary', '0013_order_status_and_payment_fields'),
    ]

    operations = [
        migrations.RunPython(confirm_existing_orders, migrations.RunPython.noop),
    ]
