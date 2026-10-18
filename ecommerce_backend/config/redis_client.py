"""Shared Redis client for throttles, product history, rankings, and locks."""

import redis
from django.conf import settings


redis_client = redis.Redis.from_url(
    settings.REDIS_URL,
    socket_connect_timeout=1,
    socket_timeout=1,
    max_connections=20,
)
