"""Isolated PostgreSQL load tests. Start with --settings=config.loadtest."""

from copy import deepcopy

from django.core.exceptions import ImproperlyConfigured
from .database import postgres_database
from .settings import *  # noqa: F403


development_database = DATABASES['default']['NAME']  # noqa: F405
DATABASES = {'default': postgres_database('ecommerce_loadtest', loadtest=True)}
if DATABASES['default']['NAME'] == development_database:
    raise ImproperlyConfigured('Load tests must use a different database from development.')

# Test workloads must not reuse or invalidate development cache entries.
CACHES = deepcopy(CACHES)  # noqa: F405
CACHES['default']['KEY_PREFIX'] += ':loadtest'

# Product upload tests must not overwrite normal development images.
MEDIA_ROOT = BASE_DIR / 'media.loadtest'  # noqa: F405

MIDDLEWARE = ['config.loadtest_middleware.LoadtestMarkerMiddleware', *MIDDLEWARE]  # noqa: F405
