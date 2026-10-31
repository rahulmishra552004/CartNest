from rest_framework import serializers
from .models import Order, OrderItem

class OrderSerializer(serializers.ModelSerializer):
    orderTimeMs = serializers.BigIntegerField(read_only=True, source='order_time_ms')
    totalCostCents = serializers.IntegerField(read_only=True, source='total_cost_cents')
    products = serializers.JSONField(read_only=True)
    #the client picks one of its saved addresses; the view copies it onto the order
    addressId = serializers.UUIDField(write_only=True)
    deliveryRecipientName = serializers.CharField(
        source = 'delivery_recipient_name',
        read_only = True,
    )
    deliveryPhoneNumber = serializers.CharField(
        source = 'delivery_phone_number',
        read_only = True,
    )
    deliveryAddressLine1 = serializers.CharField(
        source = 'delivery_address_line1',
        read_only = True,
    )
    deliveryAddressLine2 = serializers.CharField(
        source = 'delivery_address_line2',
        read_only = True,
    )
    deliveryCity = serializers.CharField(
        source = 'delivery_city',
        read_only = True,
    )
    deliveryState = serializers.CharField(
        source = 'delivery_state',
        read_only = True,
    )
    deliveryPostalCode = serializers.CharField(
        source = 'delivery_postal_code',
        read_only = True,
    )
    deliveryCountryCode = serializers.CharField(
        source = 'delivery_country_code',
        read_only = True,
    )
    class Meta:
        model = Order
        fields = [
            'id',
            'orderTimeMs',
            'totalCostCents',
            'products',
            'addressId',
            'deliveryRecipientName',
            'deliveryPhoneNumber',
            'deliveryAddressLine1',
            'deliveryAddressLine2',
            'deliveryCity',
            'deliveryState',
            'deliveryPostalCode',
            'deliveryCountryCode',
        ]
        read_only_fields = [
            'id',
            'orderTimeMs',
            'totalCostCents',
            'products',
       ]

    def to_representation(self, instance):
        order = super().to_representation(instance)
        request = self.context.get('request')

        if request:
            expand = request.query_params.get('expand')

            if expand != 'products':
                for product in order['products']:
                    product.pop('product', None)
        return order

class TrackingOrderSerializer(serializers.ModelSerializer):
    orderTimeMs = serializers.IntegerField(source='order_time_ms', read_only=True)
    deliveryRecipientName = serializers.CharField(
        source = 'delivery_recipient_name',
        read_only=True,
    )
    deliveryAddressLine1 = serializers.CharField(
        source = 'delivery_address_line1',
        read_only=True,
    )
    deliveryAddressLine2 = serializers.CharField(
        source = 'delivery_address_line2',
        read_only=True,
    )
    deliveryCity = serializers.CharField(
        source = 'delivery_city',
        read_only=True,
    )
    deliveryState = serializers.CharField(
        source = 'delivery_state',
        read_only=True,
    )
    deliveryPostalCode = serializers.CharField(
        source = 'delivery_postal_code',
        read_only=True,
    )
    deliveryCountryCode = serializers.CharField(
        source = 'delivery_country_code',
        read_only=True,
    )
    class Meta:
        model = Order
        fields = [
            'id',
            'orderTimeMs',
            'deliveryRecipientName',
            'deliveryAddressLine1',
            'deliveryAddressLine2',
            'deliveryCity',
            'deliveryState',
            'deliveryPostalCode',
            'deliveryCountryCode',
        ]

class OrderItemSerializer(serializers.ModelSerializer):
    order = TrackingOrderSerializer(read_only=True)
    deliveryStatus = serializers.ChoiceField(
        source='delivery_status',
        choices=OrderItem.DeliveryStatus.choices,
    )
    deliveryDays = serializers.IntegerField(
        source='delivery_days',
        read_only=True,
    )
    estimatedDeliveryTimeMs = serializers.IntegerField(
        source='estimated_delivery_time_ms',
        read_only=True,
    )
    deliveryPriceCents = serializers.IntegerField(
        source='delivery_price_cents',
        read_only=True,
    )
    taxCents = serializers.IntegerField(
        source='tax_cents',
        read_only=True,
    )
    class Meta:
        model = OrderItem
        fields = ['id', 'product', 'quantity', 'vendor', 'order', 'deliveryDays', 'estimatedDeliveryTimeMs', 'deliveryPriceCents', 'deliveryStatus', 'taxCents']
        read_only_fields = ['id', 'product', 'quantity', 'vendor', 'order', 'deliveryDays', 'estimatedDeliveryTimeMs', 'deliveryPriceCents', 'taxCents']
