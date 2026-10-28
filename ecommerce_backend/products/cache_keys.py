from .identifiers import normalize_product_id


PRODUCT_LIST_CACHE_KEY = 'products:v2:list'


def product_detail_cache_key(product_id):
    return f'products:v2:{normalize_product_id(product_id)}'
