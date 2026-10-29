from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('orders_and_paymentsummary', '0006_checkoutrequest'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='delivery_address',
            field=models.CharField(
                default='123 Demo Street, Test City',
                max_length=256,
            ),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='orderitem',
            name='delivery_status',
            field=models.CharField(
                choices=[
                    ('preparing', 'Preparing'),
                    ('shipping', 'Shipping'),
                    ('delivered', 'Delivered'),
                ],
                default='preparing',
                max_length=10,
            ),
        ),
    ]
