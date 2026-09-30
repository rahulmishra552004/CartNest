from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework import mixins, viewsets
from .models import Order, get_payment_summary, get_products, get_product
from .serializers import OrderSerializer, OrderItemSerializer
from rest_framework.response import Response
from cart.models import CartItem
from django.db import transaction

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

    def perform_create(self, serializer):
        payment_summary = get_payment_summary(self.request.user)
        products = get_products(self.request.user)

        order = serializer.save(
                user = self.request.user,
                total_cost_cents = payment_summary['total_cost_cents'],
                products=products
                )

        user = self.request.user
        cart_items = CartItem.objects.filter(user = user).select_related(
                'product__vendor'
                )
        for cart_item in cart_items:
            context={}
            context['quantity'] = cart_item.quantity
            context['delivery_option'] = cart_item.delivery_option.id
            context['user'] = user.id
            context['vendor'] = cart_item.product.vendor.id
            context['order'] = order.id
            context['product'] = get_product(cart_item.product)
            order_item_serializer = OrderItemSerializer(data=context)
            order_item_serializer.is_valid(raise_exception=True)
            order_item_serializer.save()

    def create(self, request, *args, **kwargs):
        with transaction.atomic():
            response = super().create(request, *args, **kwargs)
            CartItem.objects.filter(user = request.user).delete()
            return response

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def payment_summary_view(request):
    payment_summary = get_payment_summary(user=request.user)
    paymentSummary = {}
    paymentSummary['totalItems'] = payment_summary['total_items']
    paymentSummary['productCostCents'] = payment_summary['product_cost_cents']
    paymentSummary['shippingCostCents'] = payment_summary['shipping_cost_cents']
    paymentSummary['totalCostBeforeTaxCents'] = payment_summary['total_cost_before_tax_cents']
    paymentSummary['taxCents'] = payment_summary['tax_cents']
    paymentSummary['totalCostCents'] = payment_summary['total_cost_cents']

    return Response(paymentSummary)
