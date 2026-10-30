from rest_framework import serializers
from .models import DeliveryOption

class DeliveryOptionSerializer(serializers.ModelSerializer):
    deliveryDays = serializers.IntegerField(source = 'delivery_days', read_only=True)
    priceCents = serializers.IntegerField(source = 'price_cents', read_only=True)
    estimatedDeliveryTimeMs = serializers.IntegerField(source = 'estimated_delivery_time_ms', read_only=True)

    class Meta:
        model = DeliveryOption
        fields = ['id', 'deliveryDays', 'priceCents', 'estimatedDeliveryTimeMs']

    def get_fields(self):
        fields = super().get_fields()
        request = self.context.get('request')

        if request:
            expand = request.query_params.get('expand')

            if expand != 'estimatedDeliveryTime':
                fields.pop('estimatedDeliveryTimeMs')

        return fields
