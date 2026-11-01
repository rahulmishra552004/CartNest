from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('orders_and_paymentsummary', '0011_order_delivery_phone_number'),
    ]

    operations = [
        # The label ("Home", "Office") is optional on saved addresses, so orders
        # placed before it was copied simply have none.
        migrations.AddField(
            model_name='order',
            name='delivery_label',
            field=models.CharField(blank=True, default='', max_length=50),
            preserve_default=False,
        ),
    ]
