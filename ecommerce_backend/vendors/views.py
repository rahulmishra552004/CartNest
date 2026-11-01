from rest_framework.viewsets import ModelViewSet, GenericViewSet
from rest_framework.mixins import ListModelMixin, UpdateModelMixin
from django.db import transaction
from django.db.models import Case, Value, When, IntegerField

from products.cache_invalidation import invalidate_products
from products.models import Product
from products.serializers import ProductSerializer
from orders_and_paymentsummary.serializers import OrderItemSerializer
from orders_and_paymentsummary.models import OrderItem
from .permissions import IsVendorProductOwner

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
