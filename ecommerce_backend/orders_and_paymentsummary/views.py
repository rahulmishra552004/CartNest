import logging
from kombu.exceptions import OperationalError
from products.cache_invalidation import invalidate_products
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework import mixins, viewsets
from rest_framework.generics import RetrieveAPIView
from .models import (
    Order,
    OrderItem,
    get_payment_summary,
    get_products,
    get_product,
    CheckoutRequest,
    TAX,
    current_time_ms,
)
from .serializers import OrderSerializer, OrderItemSerializer
from rest_framework.response import Response
from cart.models import CartItem
from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework.exceptions import ValidationError
from products.models import Product
from django.contrib.auth import get_user_model
from django.core.cache import cache
from redis.exceptions import ConnectionError as RedisConnectionError
from redis.exceptions import TimeoutError as RedisTimeoutError
from .tasks import send_order_confirmation

logger = logging.getLogger(__name__)

class OrderViewSet(
        mixins.ListModelMixin,
        mixins.CreateModelMixin,
        viewsets.GenericViewSet
        ):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).order_by('-order_time_ms')

    def create(self, request, *args, **kwargs):
        idempotency_key = request.headers.get('Idempotency-Key', '').strip()

        if not idempotency_key:
            raise ValidationError({
                'Idempotency-Key': 'This header is required'
            })

        if len(idempotency_key) > 128:
            raise ValidationError({
                'Idempotency-Key': 'idempotency key cannot be more than 128 characters'
            })

        expand_products = request.query_params.get('expand') == 'products'
        cache_key = (
            f"checkout-result:user:{request.user.pk}:"
            f"key:{idempotency_key}:expand:{expand_products}"
        )

        cache_available = True
        try:
            cached_data = cache.get(cache_key)
        except (RedisConnectionError, RedisTimeoutError):
            logger.warning('Checkout result cache read failed')
            cached_data = None
            cache_available = False
        if cached_data is not None:
            return Response(cached_data, status=201)

        with transaction.atomic():
            #lock user row to prevent user to proceed with another order creating, adding another cart item, deadlock condition, adding cart item also locks user.
            get_user_model().objects.select_for_update().get(pk = request.user.pk)

            checkout_request, created = CheckoutRequest.objects.get_or_create(
                user = request.user,
                key = idempotency_key,
            )

            if not created:
                if checkout_request.order_id is None:
                    return Response(
                        {'detail' : 'checkout result is not available yet'},
                        status = 409
                    )

                serializer = self.get_serializer(checkout_request.order)
                data = serializer.data
                if cache_available:
                    transaction.on_commit(lambda: self._cache_checkout_response(cache_key, data))
                return Response(serializer.data, status=201)

            self.checkout_request = checkout_request

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
            if cache_available:
                transaction.on_commit(lambda: self._cache_checkout_response(cache_key, response.data))
            return response

    def perform_create(self, serializer):
        payment_summary = get_payment_summary(self.checkout_cart_items)
        order_time_ms = current_time_ms()
        products = get_products(self.checkout_cart_items, order_time_ms)
        user = self.request.user
        cart_items = self.checkout_cart_items

        order = serializer.save(
                user = self.request.user,
                order_time_ms = order_time_ms,
                total_cost_cents = payment_summary['total_cost_cents'],
                products=products
                )

        order_items = []
        for cart_item in cart_items:
            context={}
            context['quantity'] = cart_item.quantity
            context['user_id'] = user.id
            context['vendor_id'] = cart_item.product.vendor_id
            context['order_id'] = order.id
            context['product'] = get_product(cart_item.product)
            context['delivery_days'] = cart_item.delivery_option.delivery_days
            context['estimated_delivery_time_ms'] = (
                order_time_ms
                + cart_item.delivery_option.estimated_delivery_time_ms
            )
            context['delivery_price_cents'] = cart_item.delivery_option.price_cents
            context['tax_cents'] = round(
                TAX * (
                cart_item.quantity * cart_item.product.price_cents +
                cart_item.delivery_option.price_cents
            ))
            order_item = OrderItem(**context)
            order_items.append(order_item)

        OrderItem.objects.bulk_create(order_items)

        self.checkout_request.order = order
        self.checkout_request.save(update_fields=['order'])

        transaction.on_commit(
            lambda: self._enqueue_order_confirmation(order.pk)
        )

    def _enqueue_order_confirmation(self, order_id):
        try:
            send_order_confirmation.delay(str(order_id))
        except OperationalError:
            logger.exception('order confirmation mail could not be queued for %s', order_id)

    def _cache_checkout_response(self, key, data):
        try:
            cache.set(key, data, timeout=60*60)
        except (RedisConnectionError, RedisTimeoutError):
            logger.warning('Checkout result cache write failed')

class OrderItemRetrieveView(RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = OrderItemSerializer

    def get_object(self):
        order_id = self.kwargs['order_id']
        product_id = str(self.kwargs['product_id'])

        queryset = OrderItem.objects.select_related(
            'order',
        )
        order_item = get_object_or_404(
            queryset,
            order_id=order_id,
            product__id=product_id,
            user=self.request.user
        )

        return order_item


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
