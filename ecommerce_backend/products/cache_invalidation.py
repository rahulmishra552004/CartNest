import logging

from django.core.cache import cache
from redis.exceptions import ConnectionError as RedisConnectionError
from redis.exceptions import TimeoutError as RedisTimeoutError

from .cache_keys import PRODUCT_LIST_CACHE_KEY, product_detail_cache_key


logger = logging.getLogger(__name__)


def invalidate_products(*product_ids):
    try:
        cache.delete(PRODUCT_LIST_CACHE_KEY)
    except (RedisConnectionError, RedisTimeoutError):
        logger.warning('Product-list cache deletion failed')

    detail_keys = [
        product_detail_cache_key(product_id)
        for product_id in product_ids
    ]

    if not detail_keys:
        return

    try:
        cache.delete_many(detail_keys)
    except (RedisConnectionError, RedisTimeoutError):
        logger.warning('Product-detail cache deletion failed')
