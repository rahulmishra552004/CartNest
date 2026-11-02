from rest_framework.viewsets import ModelViewSet, GenericViewSet
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.mixins import ListModelMixin, UpdateModelMixin
from django.db import transaction
from django.db.models import (
    Case,
    Value,
    When,
    IntegerField,
    F,
    Q,
    Sum,
    Count,
    CharField,
    Max,
)
from django.db.models.functions import Cast, Concat
from django.db.models.fields.json import KT
from django.conf import settings
from datetime import datetime, timezone

from products.cache_invalidation import invalidate_products
from products.models import Product
from products.serializers import ProductSerializer
from orders_and_paymentsummary.serializers import OrderItemSerializer
from orders_and_paymentsummary.models import OrderItem
from .permissions import IsVendorProductOwner

#products with this many units or fewer show up as low stock on the stats page
LOW_STOCK_THRESHOLD = 5

class VendorProductViewSet(ModelViewSet):
    permission_classes = [IsVendorProductOwner]
    serializer_class = ProductSerializer

    def get_queryset(self):
        queryset = Product.objects.filter(vendor=self.request.user.vendor)
        if self.action in ['update', 'partial_update', 'destroy']:
            queryset = queryset.select_for_update()
        return queryset

    def perform_create(self, serializer):
        serializer.save(vendor = self.request.user.vendor)

    def create(self, request, *args, **kwargs):
        with transaction.atomic():
            response = super().create(request, *args, **kwargs)
            transaction.on_commit(lambda: invalidate_products())
        return response

    def update(self, request, *args, **kwargs):
        with transaction.atomic():
            response = super().update(request, *args, **kwargs)
            transaction.on_commit(lambda: invalidate_products(kwargs['pk']))
        return response

    def destroy(self, request, *args, **kwargs):
        with transaction.atomic():
            response = super().destroy(request, *args, **kwargs)
            transaction.on_commit(lambda: invalidate_products(kwargs['pk']))
        return response

class VendorOrderViewSet(
    ListModelMixin,
    UpdateModelMixin,
    GenericViewSet,
    ):
    serializer_class = OrderItemSerializer
    permission_classes = [IsVendorProductOwner]

    def get_queryset(self):
        queryset = (
            OrderItem.objects
            .filter(vendor_id=self.request.user.vendor.id)
            .select_related('order')
        )
        if self.action in ['update', 'partial_update']:
            queryset = queryset.select_for_update(of=('self',))

        Status = OrderItem.DeliveryStatus
        queryset = queryset.annotate(
            status_rank = Case(
                When(delivery_status=Status.PREPARING, then=Value(0)),
                When(delivery_status=Status.SHIPPING, then=Value(1)),
                When(delivery_status=Status.DELIVERED, then=Value(2)),
                output_field = IntegerField(),
            )
        ).order_by('status_rank', 'estimated_delivery_time_ms')
        return queryset

    def update(self, request, *args, **kwargs):
        with transaction.atomic():
            return super().update(request, *args, **kwargs)

@api_view(['GET'])
@permission_classes([IsVendorProductOwner])
def get_stats_view(request):
    queryset = (
        OrderItem.objects
        .filter(vendor_id = request.user.vendor.id)
    )

    #one "now" for the whole request, so overdue and the graph agree on the time
    now = datetime.now(timezone.utc)
    current_time = int(now.timestamp()*1000)
    Status = OrderItem.DeliveryStatus

    summary = queryset.aggregate(
        totalRevenueCents = Sum(
            Cast(F('product__priceCents'), IntegerField())
            * F('quantity')
        ),
        unitsSold = Sum(
            'quantity'
        ),
        ordersCount = Count(
            'order', distinct=True
        ),
        overdueItemsCount = Count(
            'id',
            filter = (
                Q(estimated_delivery_time_ms__lte = current_time)
                & ~Q(delivery_status = Status.DELIVERED)
            ),
        ),
        preparingItemsCount = Count(
            'id',
            filter = Q(delivery_status = Status.PREPARING),
        ),
        shippingItemsCount = Count(
            'id',
            filter = Q(delivery_status = Status.SHIPPING),
        ),
        deliveredItemsCount = Count(
            'id',
            filter = Q(delivery_status = Status.DELIVERED),
        ),
    )

    top_products = list(
        queryset.values(productId=KT('product__id')).annotate(
            name = Max(KT('product__name')),
            image = Max(KT('product__image')),
            totalRevenueCents = Sum(Cast(F('product__priceCents'), IntegerField()) * F('quantity')),
            unitsSold = Sum('quantity')
        ).order_by('-totalRevenueCents')[0:5]
    )

    low_stock_products = list(
        Product.objects
        .filter(vendor=request.user.vendor, inventory_stock__lte = LOW_STOCK_THRESHOLD)
        .order_by('inventory_stock')
        .values(
            'id',
            'name',
            inventoryStock = F('inventory_stock'),
            imageUrl = Concat(
                Value(settings.MEDIA_URL),
                'image',
                output_field=CharField()
            )
        )
    )

    graph_array = []
    midnight = now.replace(
        hour = 0,
        minute = 0,
        second = 0,
        microsecond = 0,
    )
    cutoff_time = int(midnight.timestamp()*1000)
    qs_list = list(
        queryset
        .values(
            revenue_cents = (
                F('quantity') *
                Cast(F('product__priceCents'), IntegerField())
            ),
            order_time = F('order__order_time_ms')
        )
        .order_by('-order_time')
    )
    i = 0
    while(i < len(qs_list)):
        revenue = 0
        while(i < len(qs_list) and qs_list[i]['order_time'] >= cutoff_time):
            revenue += qs_list[i]['revenue_cents']
            i += 1
        graph_array.append({
            'day': (
                datetime
                .fromtimestamp(
                    cutoff_time/1000,
                    tz = timezone.utc
                )
                .date()
                .isoformat()
            ),
            'revenue': revenue,
        })
        cutoff_time -= 24 * 60 * 60 * 1000
    graph_array.reverse()

    summary['totalRevenueCents'] = summary['totalRevenueCents'] or 0
    summary['unitsSold'] = summary['unitsSold'] or 0
    summary['avgOrderValue'] = (
        0 if summary['ordersCount'] == 0
        else summary['totalRevenueCents']//summary['ordersCount']
    )
    summary['topProducts'] = top_products
    summary['lowStockProducts'] = low_stock_products
    summary['lowStockThreshold'] = LOW_STOCK_THRESHOLD
    summary['graph'] = graph_array

    return Response(summary)
