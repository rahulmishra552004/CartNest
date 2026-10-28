from .identifiers import normalize_product_id


PRODUCT_LIST_CACHE_KEY = 'products:list'


def product_detail_cache_key(product_id):
    return f'products:{normalize_product_id(product_id)}'
