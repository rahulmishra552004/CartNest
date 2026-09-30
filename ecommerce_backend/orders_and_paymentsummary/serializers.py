from rest_framework import serializers
from .models import Order, OrderItem

class OrderSerializer(serializers.ModelSerializer):
    orderTimeMs = serializers.BigIntegerField(read_only=True, source='order_time_ms')
    totalCostCents = serializers.IntegerField(read_only=True, source='total_cost_cents')
    products = serializers.JSONField(read_only=True)

    class Meta:
        model = Order
        fields = ['id', 'orderTimeMs', 'totalCostCents', 'products']

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
    class Meta:
        model = OrderItem
        fields = '__all__'
