from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('orders_and_paymentsummary', '0010_orderitem_estimated_delivery_time_ms'),
    ]

    operations = [
        # Orders placed before phone numbers were collected have none to copy,
        # so existing rows get an empty string. New orders always copy one.
        migrations.AddField(
            model_name='order',
            name='delivery_phone_number',
            field=models.CharField(default='', max_length=20),
            preserve_default=False,
        ),
    ]
