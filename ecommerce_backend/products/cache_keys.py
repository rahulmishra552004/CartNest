from .identifiers import normalize_product_id


#v3: the list became paginated ({count, next, previous, results}), so the old
#plain-list entries under v2 must never be served again
PRODUCT_LIST_CACHE_KEY = 'products:v3:list'


def product_detail_cache_key(product_id):
    return f'products:v2:{normalize_product_id(product_id)}'
