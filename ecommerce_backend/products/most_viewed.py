from datetime import datetime, timezone
from django.core.cache import cache
from config.redis_client import redis_client as r
from .identifiers import normalize_product_id

increment_product_views_script = r.register_script("""
   local product_id = ARGV[1]
   local ttl = tonumber(ARGV[2])
   local score = redis.call('ZINCRBY', KEYS[1], 1, product_id)
   redis.call('EXPIRE', KEYS[1], ttl)
   return score
""")

def get_most_viewed_key():
    today = datetime.now(timezone.utc).date().isoformat()
    return cache.make_key(f"most-viewed:{today}")

def update_most_viewed(product_id):
    key = get_most_viewed_key()
    increment_product_views_script(
        keys = [key],
        args = [normalize_product_id(product_id), 2*24*60*60]
    )

def get_most_viewed_product_ids():
    product_ids = r.zrange(get_most_viewed_key(), 0, 9, desc=True)
    return list(dict.fromkeys(
        normalize_product_id(product_id.decode('utf-8'))
        for product_id in product_ids
    ))
