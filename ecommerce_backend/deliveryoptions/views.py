import logging
from django.core.cache import cache
from redis.exceptions import ConnectionError as RedisConnectionError
from redis.exceptions import TimeoutError as RedisTimeoutError
from rest_framework.renderers import JSONRenderer
from config.cache_responses import cached_json_response
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
            return cached_json_response(data)

        response = super().list(request, *args, **kwargs)
        if response.status_code != 200:
            return response
        payload = JSONRenderer().render(response.data)

        if cache_available:
            try:
                cache.set(key, payload, timeout=300)
            except (RedisConnectionError, RedisTimeoutError):
                logger.warning('delivery-option cache write failed')

        return cached_json_response(payload)
