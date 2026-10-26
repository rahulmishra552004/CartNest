import logging
import random
import time
from django.db import transaction
from django.db.models import Q
from django.core.cache import cache
from redis.exceptions import ConnectionError as RedisConnectionError
from redis.exceptions import TimeoutError as RedisTimeoutError
from rest_framework.response import Response
from rest_framework.renderers import JSONRenderer
from rest_framework.viewsets import ModelViewSet
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.exceptions import NotFound, ValidationError
from .serializers import ProductSerializer
from .models import Product
from .permissions import IsVendorOwnerOrReadOnly
from .throttles import ProductSearchThrottle
from .recent_views import record_product_view, get_recent_product_ids
from .most_viewed import update_most_viewed, get_most_viewed_product_ids
from .cache_locks import acquire_cache_lock, release_cache_lock
from .identifiers import normalize_product_id
from config.cache_responses import cached_json_response

logger = logging.getLogger(__name__)


class ProductViewSet(ModelViewSet):
    serializer_class = ProductSerializer
    permission_classes = [IsVendorOwnerOrReadOnly]
    throttle_classes = [ProductSearchThrottle]

    def get_queryset(self):
        queryset = Product.objects.all()

        if self.action in ('update', 'partial_update'):
            queryset = queryset.select_for_update()

        if self.action == 'list':
            search = self.request.query_params.get('search', '').strip()

            if search:
                queryset = queryset.filter(
                        Q(name__icontains=search) |
                        Q(keywords__icontains=search)
                        )

            sort_options = {
                'price_asc': 'price_cents',
                'price_desc': '-price_cents',
                'rating_desc': '-rating_stars',
                'name_asc': 'name',
                'name_desc': '-name',
            }

            sort = self.request.query_params.get('sort', '').strip() or 'name_asc';

            if sort not in sort_options:
                raise ValidationError({
                    'sort': 'invalid sort option'
                })

            queryset = queryset.order_by(sort_options[sort], 'id')

        return queryset

    def perform_create(self, serializer):
        serializer.save(vendor=self.request.user.vendor)

    def _normalize_product_lookup(self, product_id):
        try:
            return normalize_product_id(product_id)
        except ValueError as exc:
            raise NotFound('Product not found.') from exc

    def list(self, request, *args, **kwargs):
        search = self.request.query_params.get('search', '').strip()
        sort = self.request.query_params.get('sort', '').strip()
        if search or sort:
            return super().list(request, *args, **kwargs)

        key = 'products:list'

        try:
            data = cache.get(key)
        except (RedisConnectionError, RedisTimeoutError):
            logger.warning('products list cache read failed')
            return super().list(request, *args, **kwargs)

        if data is not None:
            return cached_json_response(data)

        deadline = time.monotonic()+1

        while True:
            try:
                token = acquire_cache_lock(key, ttl=10)
            except (RedisConnectionError, RedisTimeoutError):
                logger.warning('cache lock aquisition failed')
                return super().list(request, *args, **kwargs)

            if token is not None:
                break

            if time.monotonic() >= deadline:
                return super().list(request, *args, **kwargs)

            time.sleep(0.05)

            try:
                data = cache.get(key)
            except (RedisConnectionError, RedisTimeoutError):
                logger.warning('product list cache read failed')
                return super().list(request, *args, **kwargs)

            if data is not None:
                return cached_json_response(data)

        try:
            try:
                data = cache.get(key)
            except(RedisConnectionError, RedisTimeoutError):
                logger.warning('product list cache recheck failed')
                return super().list(request, *args, **kwargs)

            if data is not None:
                return cached_json_response(data)

            response = super().list(request, *args, **kwargs)

            if response.status_code == 200:
                payload = JSONRenderer().render(response.data)
                try:
                    cache.set(key, payload, timeout=300)
                except (RedisConnectionError, RedisTimeoutError):
                    logger.warning('product list cache write failed')
                return cached_json_response(payload)

            return response

        finally:
            try:
                release_cache_lock(key, token)
            except (RedisConnectionError, RedisTimeoutError):
                logger.warning('product list cache lock release failed')


    def retrieve(self, request, *args, **kwargs):
        product_id = self._normalize_product_lookup(kwargs['pk'])
        key = f"products:{product_id}"
        cache_available = True

        try:
            data = cache.get(key)
        except (RedisConnectionError, RedisTimeoutError):
            logger.warning(f"product : {product_id} cache read error")
            data = None
            cache_available = False

        if data is not None:
            self._record_recent_view(request, product_id)
            self._record_most_viewed(request, product_id)
            return cached_json_response(data)

        response = super().retrieve(request, *args, **kwargs)
        if response.status_code != 200:
            return response

        self._record_most_viewed(request, product_id)
        self._record_recent_view(request, product_id)
        payload = JSONRenderer().render(response.data)

        if cache_available:
            try:
                ttl = 300 + random.randint(0, 60)
                cache.set(key, payload, timeout=ttl)
            except (RedisConnectionError, RedisTimeoutError):
                logger.warning(f"product : {product_id} cache write error")

        return cached_json_response(payload)

    def _record_recent_view(self, request, product_id):
        if not request.user.is_authenticated:
            return

        try:
            record_product_view(request.user.id, product_id)
        except (RedisConnectionError, RedisTimeoutError):
            logger.warning('Recently viewed product cache write failed')

    def _record_most_viewed(self, request, product_id):
        try:
            update_most_viewed(product_id)
        except (RedisConnectionError, RedisTimeoutError):
            logger.warning('most viewed write failed')

    def create(self, request, *args, **kwargs):
        with transaction.atomic():
            response = super().create(request, *args, **kwargs)
            transaction.on_commit(invalidate_products)

        return response

    def update(self, request, *args, **kwargs):
        product_id = self._normalize_product_lookup(kwargs['pk'])
        with transaction.atomic():
            response = super().update(request, *args, **kwargs)
            transaction.on_commit(lambda: invalidate_products(product_id))

        return response

    def destroy(self, request, *args, **kwargs):
        product_id = self._normalize_product_lookup(kwargs['pk'])

        with transaction.atomic():
            response = super().destroy(request, *args, **kwargs)
            transaction.on_commit(lambda: invalidate_products(product_id))

        return response

    @action(
        detail = False,
        methods = ['get'],
        url_path = 'recently-viewed',
        permission_classes = [IsAuthenticated]
    )
    def recently_viewed(self, request, *args, **kwargs):
        try:
            product_ids = get_recent_product_ids(request.user.pk)
        except (RedisConnectionError, RedisTimeoutError):
            logger.warning('Recently viewed products read failed')
            return Response([])

        if not product_ids:
            return Response([])

        products = Product.objects.filter(pk__in=product_ids)
        products_by_id = {
            str(product.pk) : product
            for product in products
        }

        ordered_products = [
            products_by_id[product_id] for product_id in product_ids
            if product_id in products_by_id
        ]

        serializer = self.get_serializer(
            ordered_products,
            many = True
        )

        return Response(serializer.data)

    @action(
        detail = False,
        methods = ['get'],
        url_path = 'most-viewed',
        permission_classes = [AllowAny]
    )
    def most_viewed(self, request, *args, **kwargs):
        try:
            product_ids = get_most_viewed_product_ids()
        except (RedisConnectionError, RedisTimeoutError):
            logger.warning('most viewed products cache read failed')
            return Response([])

        if not product_ids:
            return Response([])

        products = Product.objects.filter(pk__in=product_ids)
        products_by_id = {
            str(product.pk) : product
            for product in products
        }
        ordered_products = [
            products_by_id[product_id]
            for product_id in product_ids
            if product_id in products_by_id
        ]

        serializer = self.get_serializer(
            ordered_products,
            many = True
        )
        return Response(serializer.data)

def invalidate_products(*product_ids):
    try:
        cache.delete('products:list')
    except(RedisConnectionError, RedisTimeoutError):
        logger.warning('product-list cache delete failed')

    keys = []
    for product_id in product_ids:
        keys.append(f"products:{normalize_product_id(product_id)}")

    if keys:
        try:
            cache.delete_many(keys)
        except (RedisConnectionError, RedisTimeoutError):
            logger.warning('products cache delete failed')
