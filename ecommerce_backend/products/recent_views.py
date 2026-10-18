from django.core.cache import cache
from config.redis_client import redis_client as r
from .identifiers import normalize_product_id

record_view_script = r.register_script("""
                                           local product_id = ARGV[1]
                                           local ttl = tonumber(ARGV[2])

                                           redis.call('LREM', KEYS[1], 0, product_id)
                                           redis.call('LPUSH', KEYS[1], product_id)
                                           redis.call('LTRIM', KEYS[1], 0, 9)
                                           redis.call('EXPIRE', KEYS[1], ttl)

                                           return 1
                                        """)

def record_product_view(user_id, product_id):
    key = cache.make_key(f"recently-viewed:user:{user_id}")
    record_view_script(
            keys = [key],
            args = [normalize_product_id(product_id), 30*24*60*60],
    )

def get_recent_product_ids(user_id):
    key = cache.make_key(f"recently-viewed:user:{user_id}")
    product_ids = r.lrange(key, 0, 9)
    return list(dict.fromkeys(
        normalize_product_id(product_id.decode('utf-8'))
        for product_id in product_ids
    ))
