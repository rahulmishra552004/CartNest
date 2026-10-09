from rest_framework import serializers
from .models import CartItem
from products.models import Product
from products.serializers import ProductSerializer
from deliveryoptions.models import DeliveryOption

class CartItemSerializer(serializers.ModelSerializer):
    productId = serializers.PrimaryKeyRelatedField(source='product', queryset=Product.objects.all())
    deliveryOptionId = serializers.PrimaryKeyRelatedField(
            source='delivery_option',
            queryset=DeliveryOption.objects.all(),
            required=False
            )
    product = ProductSerializer(read_only=True)
    quantity = serializers.IntegerField(
            min_value = 1
            )
    class Meta:
        model = CartItem
        fields = ['productId', 'quantity', 'deliveryOptionId', 'product']

    def get_fields(self):
        fields = super().get_fields()
        request = self.context.get('request')

        if request:
            if request.method in ('PUT', 'PATCH'):
                fields['productId'].read_only = True

            expand = request.query_params.get('expand')

            if expand != 'product':
                fields.pop('product')

        return fields

    def validate(self, attrs):
        product = attrs.get('product')
        quantity = attrs.get('quantity')
        request = self.context.get('request')
        user = request.user

        if request and request.method == 'POST':
            product = (
                    Product.objects.select_for_update()
                    .get(pk = product.pk)
                )
            attrs['product'] = product


        if product is None and self.instance is not None:
            product = self.instance.product

        if quantity is None and self.instance is not None:
            quantity = self.instance.quantity

        if quantity > product.inventory_stock:
            raise serializers.ValidationError(
                    'quantity greater than inventory stock'
                    )

        if request and request.method == 'POST':
            try:
                cart_item = CartItem.objects.filter(user=user).get(product=product)
            except CartItem.DoesNotExist:
                return attrs

            new_quantity = quantity + cart_item.quantity
            if new_quantity > product.inventory_stock:
                raise serializers.ValidationError(
                        'item quantity is greater than inventory stock'
                        )

            attrs['quantity'] = new_quantity

        return attrs

    def create(self, validated_data):
        request = self.context.get('request')
        try:
            cart_item = CartItem.objects.filter(
                    user = request.user
                    ).get(product=validated_data.get('product'))
        except CartItem.DoesNotExist:
            return super().create(validated_data)
        cart_item.quantity = validated_data.get('quantity')
        cart_item.delivery_option = validated_data.get('delivery_option', cart_item.delivery_option)
        cart_item.save(update_fields=['quantity', 'delivery_option'])
        return cart_item

