import logging
from django.core.cache import cache
from redis.exceptions import ConnectionError as RedisConnectionError
from redis.exceptions import TimeoutError as RedisTimeoutError
from rest_framework.response import Response
from .models import DeliveryOption
from .serializers import DeliveryOptionSerializer
from rest_framework import generics

logger = logging.getLogger(__name__)

class DeliveryOptionListView(generics.ListAPIView):
    queryset = DeliveryOption.objects.all()
    serializer_class = DeliveryOptionSerializer

    def list(self, request, *args, **kwargs):
        expanded = request.query_params.get('expand') == 'estimatedDeliveryTime'
        key = f"delivery-options:v1:expanded:{int(expanded)}"
        cache_available = True

        try:
            data = cache.get(key)
        except (RedisConnectionError, RedisTimeoutError):
            logger.warning('delivery-options cache read failed')
            data = None
            cache_available = False

        if data is not None:
            return Response(data)

        response = super().list(request, *args, **kwargs)

        if cache_available:
            try:
                cache.set(key, response.data, timeout=300)
            except (RedisConnectionError, RedisTimeoutError):
                logger.warning('delivery-option cache write failed')

        return response
