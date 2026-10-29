from rest_framework import serializers
from .models import Order, OrderItem

class OrderSerializer(serializers.ModelSerializer):
    orderTimeMs = serializers.BigIntegerField(read_only=True, source='order_time_ms')
    totalCostCents = serializers.IntegerField(read_only=True, source='total_cost_cents')
    products = serializers.JSONField(read_only=True)
    deliveryAddress = serializers.CharField(
        source='delivery_address',
        max_length=256,
    )

    class Meta:
        model = Order
        fields = ['id', 'orderTimeMs', 'totalCostCents', 'products', 'deliveryAddress']
        read_only_fields = ['id', 'orderTimeMs', 'totalCostCents', 'products',]

    def to_representation(self, instance):
        order = super().to_representation(instance)
        request = self.context.get('request')

        if request:
            expand = request.query_params.get('expand')

            if expand != 'products':
                for product in order['products']:
                    product.pop('product', None)
        return order

class OrderItemSerializer(serializers.ModelSerializer):
    deliveryOption = serializers.PrimaryKeyRelatedField(source='delivery_option', read_only=True)
    deliveryStatus = serializers.ChoiceField(source='delivery_status', choices=OrderItem.DeliveryStatus.choices)
    class Meta:
        model = OrderItem
        fields = ['id', 'user', 'vendor', 'order', 'deliveryOption', 'deliveryStatus', 'product', 'quantity']
        read_only_fields = ['id', 'user', 'vendor', 'order', 'deliveryOption', 'product', 'quantity']
