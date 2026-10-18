import logging
from django.core.cache import cache
from redis.exceptions import ConnectionError, TimeoutError
from rest_framework.throttling import BaseThrottle
from config.redis_client import redis_client as r

logger = logging.getLogger(__name__)

counter_script = r.register_script("""
                                   local capacity = tonumber(ARGV[1])
                                   local refill_rate = tonumber(ARGV[2])

                                   if not capacity or capacity < 1 or capacity ~= math.floor(capacity) then
                                       return redis.error_reply('Capacity must be a positive integer')
                                   end

                                   if not refill_rate or refill_rate <= 0 then
                                       return redis.error_reply('Refil rate must be positive')
                                   end

                                   local time = redis.call('TIME')
                                   local now = tonumber(time[1]) + tonumber(time[2])/1000000

                                   local state = redis.call('HMGET', KEYS[1], 'tokens', 'last_updated')

                                   local tokens = tonumber(state[1])
                                   local last_updated = tonumber(state[2])

                                   if not tokens or not last_updated then
                                       tokens = capacity
                                       last_updated = now
                                   end

                                   now = math.max(now, last_updated)

                                   local elapsed = now - last_updated
                                   tokens = math.min(capacity, tokens+elapsed*refill_rate)

                                   local allowed = 0
                                   local retry_after = 0

                                   if tokens >= 1 then
                                       tokens = tokens - 1
                                       allowed = 1
                                   else
                                       retry_after = math.ceil((1 - tokens) / refill_rate)
                                   end

                                   redis.call('HSET', KEYS[1], 'tokens', tostring(tokens), 'last_updated', tostring(now))

                                   local ttl = math.max(1, math.ceil(capacity / refill_rate))

                                   redis.call('EXPIRE', KEYS[1], ttl)

                                   return {allowed, retry_after}
                                   """)

class ProductSearchThrottle(BaseThrottle):
    user_capacity = 5
    user_refill_rate = 5/60

    guest_capacity = 3
    guest_refill_rate = 3/60

    def allow_request(self, request, view):
        self.retry_after = None

        if request.method != 'GET' or view.action != 'list':
            return True

        search = request.query_params.get('search', '').strip()

        if not search:
            return True

        if request.user.is_authenticated:
            identity = f"user:{request.user.pk}"
            capacity = self.user_capacity
            refill_rate = self.user_refill_rate
        else:
            ip = request.META.get("REMOTE_ADDR") or 'unknown'
            identity = f"ip:{ip}"
            capacity = self.guest_capacity
            refill_rate = self.guest_refill_rate
        key = cache.make_key(
                f"rate-limit:v3:product-search:{identity}"
            )

        try:
            allowed, retry_after = counter_script(
                    keys = [key],
                    args = [capacity, refill_rate]
                )
        except (ConnectionError, TimeoutError):
            logger.warning('Product search rate limiter unavailable')
            return True

        if not allowed:
            self.retry_after = retry_after
            return False

        return True

    def wait(self):
        return self.retry_after
