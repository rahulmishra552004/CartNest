from django.db import migrations, models


TAX_RATE = 0.1


def populate_delivery_snapshots(apps, schema_editor):
    OrderItem = apps.get_model("orders_and_paymentsummary", "OrderItem")

    for order_item in OrderItem.objects.select_related("delivery_option").iterator():
        delivery_option = order_item.delivery_option
        product_price_cents = int((order_item.product or {}).get("priceCents", 0))
        taxable_cost_cents = (
            order_item.quantity * product_price_cents
            + delivery_option.price_cents
        )

        order_item.delivery_days = delivery_option.delivery_days
        order_item.delivery_price_cents = delivery_option.price_cents
        order_item.tax_cents = round(TAX_RATE * taxable_cost_cents)
        order_item.save(
            update_fields=[
                "delivery_days",
                "delivery_price_cents",
                "tax_cents",
            ]
        )


class Migration(migrations.Migration):
    dependencies = [
        ("orders_and_paymentsummary", "0007_order_delivery_address_orderitem_delivery_status"),
    ]

    operations = [
        migrations.AddField(
            model_name="orderitem",
            name="delivery_days",
            field=models.PositiveIntegerField(null=True),
        ),
        migrations.AddField(
            model_name="orderitem",
            name="delivery_price_cents",
            field=models.PositiveIntegerField(null=True),
        ),
        migrations.AddField(
            model_name="orderitem",
            name="tax_cents",
            field=models.PositiveIntegerField(null=True),
        ),
        migrations.RunPython(
            populate_delivery_snapshots,
            reverse_code=migrations.RunPython.noop,
        ),
        migrations.RemoveField(
            model_name="orderitem",
            name="delivery_option",
        ),
        migrations.AlterField(
            model_name="orderitem",
            name="delivery_days",
            field=models.PositiveIntegerField(),
        ),
        migrations.AlterField(
            model_name="orderitem",
            name="delivery_price_cents",
            field=models.PositiveIntegerField(),
        ),
        migrations.AlterField(
            model_name="orderitem",
            name="tax_cents",
            field=models.PositiveIntegerField(),
        ),
    ]
