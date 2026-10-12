"""PostgreSQL automated tests with a cache isolated from development."""
from .settings import *  # noqa: F401,F403

CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'ecommerce-automated-tests',
    }
}
