from rest_framework.viewsets import ModelViewSet
from products.models import Product
from products.serializers import ProductSerializer
from products.cache_invalidation import invalidate_products
from .permissions import IsVendorProductOwner
from django.db import transaction

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
