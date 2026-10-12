from products.views import invalidate_products
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework import mixins, viewsets
from .models import Order, OrderItem, get_payment_summary, get_products, get_product
from .serializers import OrderSerializer
from rest_framework.response import Response
from cart.models import CartItem
from django.db import transaction
from rest_framework.exceptions import ValidationError
from products.models import Product
from django.contrib.auth import get_user_model

class OrderViewSet(
        mixins.ListModelMixin,
        mixins.CreateModelMixin,
        mixins.RetrieveModelMixin,
        viewsets.GenericViewSet
        ):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).order_by('-order_time_ms')

    def create(self, request, *args, **kwargs):
        with transaction.atomic():
            get_user_model().objects.select_for_update().get(pk = request.user.pk)
            cart_items = list(
                    CartItem.objects.select_for_update(of=('self',)).filter(
                    user=request.user
                    ).select_related('product__vendor', 'delivery_option')
                )

            if not cart_items:
                raise ValidationError({
                    'detail' : 'no item in cart'
                    })

            product_ids = [cart_item.product.id for cart_item in cart_items]

            products = {
                    product.id : product
                    for product in Product.objects.select_for_update()
                        .filter(pk__in = product_ids)
                        .order_by('pk')
                    }

            for cart_item in cart_items:
                product = products[cart_item.product.id]
                cart_item.product = product
                if cart_item.quantity > product.inventory_stock:
                    raise ValidationError({
                        'detail' : (f'only {product.inventory_stock} units of'
                                    f'{product.name} are available'),
                        'product_id' : str(product.id)
                    })

            for cart_item in cart_items:
                product = products[cart_item.product.id]
                product.inventory_stock -= cart_item.quantity

            Product.objects.bulk_update(
                    products.values(),
                    ['inventory_stock']
                )

            self.checkout_cart_items = cart_items
            response =  super().create(request, *args, **kwargs)

            CartItem.objects.filter(
                    pk__in = [cart_item.pk for cart_item in cart_items]
                ).delete()

            transaction.on_commit(lambda: invalidate_products(*product_ids))
            return response

    def perform_create(self, serializer):
        payment_summary = get_payment_summary(self.checkout_cart_items)
        products = get_products(self.checkout_cart_items)
        user = self.request.user
        cart_items = self.checkout_cart_items

        order = serializer.save(
                user = self.request.user,
                total_cost_cents = payment_summary['total_cost_cents'],
                products=products
                )

        order_items = []
        for cart_item in cart_items:
            context={}
            context['quantity'] = cart_item.quantity
            context['delivery_option_id'] = cart_item.delivery_option.id
            context['user_id'] = user.id
            context['vendor_id'] = cart_item.product.vendor_id
            context['order_id'] = order.id
            context['product'] = get_product(cart_item.product)

            order_item = OrderItem(**context)
            order_items.append(order_item)

        OrderItem.objects.bulk_create(order_items)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def payment_summary_view(request):
    cart_items = (
            CartItem.objects.filter(user=request.user)
            .select_related('product', 'delivery_option')
        )
    payment_summary = get_payment_summary(cart_items)
    paymentSummary = {}
    paymentSummary['totalItems'] = payment_summary['total_items']
    paymentSummary['productCostCents'] = payment_summary['product_cost_cents']
    paymentSummary['shippingCostCents'] = payment_summary['shipping_cost_cents']
    paymentSummary['totalCostBeforeTaxCents'] = payment_summary['total_cost_before_tax_cents']
    paymentSummary['taxCents'] = payment_summary['tax_cents']
    paymentSummary['totalCostCents'] = payment_summary['total_cost_cents']

    return Response(paymentSummary)
