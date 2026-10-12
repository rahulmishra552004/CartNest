from rest_framework import serializers
from .models import Product

class RatingSerializer(serializers.ModelSerializer):
    stars = serializers.DecimalField(source = 'rating_stars',
                                    decimal_places = 1,
                                    max_digits = 2,
                                    coerce_to_string = False)
    count = serializers.IntegerField(source = 'rating_count')

    class Meta:
        model = Product
        fields = ['stars', 'count']

class ProductSerializer(serializers.ModelSerializer):
    rating = RatingSerializer(source = '*', read_only = True)
    priceCents = serializers.IntegerField(source = 'price_cents')
    class Meta:
        model = Product
        fields = [
            'id',
            'image',
            'name',
            'rating',
            'priceCents',
            'keywords',
            'inventory_stock',
            'vendor'
        ]
        read_only_fields = ['vendor']

