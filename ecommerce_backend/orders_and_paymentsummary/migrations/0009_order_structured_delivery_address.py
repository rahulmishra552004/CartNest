from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("orders_and_paymentsummary", "0008_orderitem_delivery_snapshots"),
    ]

    operations = [
        migrations.AddField(
            model_name="order",
            name="delivery_recipient_name",
            field=models.CharField(default="Demo Customer", max_length=150),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="order",
            name="delivery_address_line1",
            field=models.CharField(default="123 Demo Street", max_length=200),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="order",
            name="delivery_address_line2",
            field=models.CharField(blank=True, default="", max_length=200),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="order",
            name="delivery_city",
            field=models.CharField(default="Test City", max_length=100),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="order",
            name="delivery_state",
            field=models.CharField(default="Test State", max_length=100),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="order",
            name="delivery_postal_code",
            field=models.CharField(default="110001", max_length=20),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="order",
            name="delivery_country_code",
            field=models.CharField(default="IN", max_length=2),
            preserve_default=False,
        ),
        migrations.RemoveField(
            model_name="order",
            name="delivery_address",
        ),
    ]
