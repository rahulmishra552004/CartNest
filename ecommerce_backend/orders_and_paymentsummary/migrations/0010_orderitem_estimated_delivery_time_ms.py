from django.db import migrations, models


DAY_IN_MS = 24 * 60 * 60 * 1000


def populate_estimated_delivery_time(apps, schema_editor):
    OrderItem = apps.get_model("orders_and_paymentsummary", "OrderItem")

    for order_item in OrderItem.objects.select_related("order").iterator():
        product_id = str((order_item.product or {}).get("id", ""))
        matching_snapshot = next(
            (
                snapshot
                for snapshot in (order_item.order.products or [])
                if str(snapshot.get("productId", "")) == product_id
            ),
            None,
        )
        estimated_delivery_time_ms = (
            matching_snapshot.get("estimatedDeliveryTimeMs")
            if matching_snapshot
            else None
        )

        if not isinstance(estimated_delivery_time_ms, int):
            estimated_delivery_time_ms = (
                order_item.order.order_time_ms
                + order_item.delivery_days * DAY_IN_MS
            )

        order_item.estimated_delivery_time_ms = estimated_delivery_time_ms
        order_item.save(update_fields=["estimated_delivery_time_ms"])


class Migration(migrations.Migration):
    dependencies = [
        ("orders_and_paymentsummary", "0009_order_structured_delivery_address"),
    ]

    operations = [
        migrations.AddField(
            model_name="orderitem",
            name="estimated_delivery_time_ms",
            field=models.PositiveBigIntegerField(null=True),
        ),
        migrations.RunPython(
            populate_estimated_delivery_time,
            reverse_code=migrations.RunPython.noop,
        ),
        migrations.AlterField(
            model_name="orderitem",
            name="estimated_delivery_time_ms",
            field=models.PositiveBigIntegerField(),
        ),
    ]
