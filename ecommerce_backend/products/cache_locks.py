import uuid
from django.core.cache import cache
from config.redis_client import redis_client as r

release_lock_script = r.register_script("""
    if redis.call('GET', KEYS[1]) == ARGV[1] then
        return redis.call('DEL', KEYS[1])
    end
    return 0
""")

def acquire_cache_lock(cache_key, ttl=10):
    lock_key = cache.make_key(f"lock:{cache_key}")
    token = uuid.uuid4().hex

    acquired = r.set(
        lock_key,
        token,
        nx = True,
        ex = ttl,
    )

    return token if acquired else None

def release_cache_lock(cache_key, token):
    lock_key = cache.make_key(f"lock:{cache_key}")
    return bool(
        release_lock_script(
            keys = [lock_key],
            args = [token],
        )
    )
