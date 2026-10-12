import logging
from django.db import transaction
from django.core.cache import cache
from redis.exceptions import ConnectionError as RedisConnectionError
from redis.exceptions import TimeoutError as RedisTimeoutError
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from .serializers import ProductSerializer
from .models import Product
from django.db.models import Q
from .permissions import IsVendorOwnerOrReadOnly

logger = logging.getLogger(__name__)

class ProductViewSet(ModelViewSet):
    serializer_class = ProductSerializer
    permission_classes = [IsVendorOwnerOrReadOnly]

    def get_queryset(self):
        queryset = Product.objects.all()
        search = self.request.query_params.get('search', '').strip()

        if search:
            queryset = queryset.filter(
                    Q(name__icontains=search) |
                    Q(keywords__icontains=search)
                    )

        return queryset

    def perform_create(self, serializer):
        serializer.save(vendor=self.request.user.vendor)

    def list(self, request, *args, **kwargs):
        search = self.request.query_params.get('search', '').strip()
        if search:
            return super().list(request, *args, **kwargs)

        key = 'products:list'
        cache_available = True

        try:
            data = cache.get(key)
        except (RedisConnectionError, RedisTimeoutError):
            logger.warning('products list cache read failed')
            data = None
            cache_available = False

        if data is not None:
            return Response(data)

        response = super().list(request, *args, **kwargs)

        if cache_available:
            try:
                cache.set(key, response.data)
            except (RedisConnectionError, RedisTimeoutError):
                logger.warning('products list cache write failed')

        return response

    def retrieve(self, request, *args, **kwargs):
        product_id = kwargs['pk']
        key = f"products:{product_id}"
        cache_available = True

        try:
            data = cache.get(key)
        except (RedisConnectionError, RedisTimeoutError):
            logger.warning(f"product : {product_id} cache read error")
            data = None
            cache_available = False

        if data is not None:
            return Response(data)

        response = super().retrieve(request, *args, **kwargs)

        if cache_available:
            try:
                cache.set(key, response.data)
            except (RedisConnectionError, RedisTimeoutError):
                logger.warning(f"product : {product_id} cache write error")

        return response

    def create(self, request, *args, **kwargs):
        with transaction.atomic():
            response = super().create(request, *args, **kwargs)
            transaction.on_commit(invalidate_products)

        return response

    def update(self, request, *args, **kwargs):
        product_id = kwargs['pk']
        with transaction.atomic():
            response = super().update(request, *args, **kwargs)
            transaction.on_commit(lambda: invalidate_products(product_id))

        return response

    def destroy(self, request, *args, **kwargs):
        product_id = kwargs['pk']

        with transaction.atomic():
            response = super().destroy(request, *args, **kwargs)
            transaction.on_commit(lambda: invalidate_products(product_id))

        return response

def invalidate_products(*product_ids):
    try:
        cache.delete('products:list')
    except(RedisConnectionError, RedisTimeoutError):
        logger.warning('product-list cache delete failed')

    keys = []
    for product_id in product_ids:
        keys.append(f"products:{product_id}")

    if keys:
        try:
            cache.delete_many(keys)
        except (RedisConnectionError, RedisTimeoutError):
            logger.warning('products cache delete failed')
