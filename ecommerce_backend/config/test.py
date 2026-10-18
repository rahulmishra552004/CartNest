"""PostgreSQL tests with Redis sessions and an isolated cache namespace."""
from copy import deepcopy

from .settings import *  # noqa: F401,F403

CACHES = deepcopy(CACHES)
CACHES['default']['KEY_PREFIX'] += ':test'

SESSION_ENGINE = 'django.contrib.sessions.backends.cached_db'
SESSION_CACHE_ALIAS = 'default'

# Tests must never publish to the development queue or deliver real mail.
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True
MAILERS = {'default': {'BACKEND': 'django.core.mail.backends.locmem.EmailBackend'}}
