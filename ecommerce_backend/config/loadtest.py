"""Isolated PostgreSQL load tests. Start with --settings=config.loadtest."""

from copy import deepcopy
from kombu import Queue

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
REDIS_URL = os.environ.get('LOADTEST_REDIS_URL', 'redis://127.0.0.1:6379/2')
CACHES['default']['LOCATION'] = REDIS_URL

# Both producer and worker/Beat must use these settings.
CELERY_BROKER_URL = os.environ.get('LOADTEST_CELERY_BROKER_URL', 'redis://127.0.0.1:6379/3')
CELERY_TASK_DEFAULT_QUEUE = 'ecommerce_loadtest'
CELERY_TASK_DEFAULT_EXCHANGE = 'ecommerce_loadtest'
CELERY_TASK_DEFAULT_ROUTING_KEY = 'ecommerce_loadtest'
CELERY_TASK_QUEUES = (Queue('ecommerce_loadtest', routing_key='ecommerce_loadtest'),)
CELERY_BEAT_SCHEDULE_FILENAME = str(BASE_DIR / 'celerybeat-schedule.loadtest')

# Use console mail for smoke tests; a non-delivering sink avoids console I/O
# dominating capacity measurements in a long-lived worker.
MAILERS = {'default': {'BACKEND': os.environ.get(
    'LOADTEST_EMAIL_BACKEND', 'django.core.mail.backends.dummy.EmailBackend',
)}}

# Product upload tests must not overwrite normal development images.
MEDIA_ROOT = BASE_DIR / 'media.loadtest'  # noqa: F405

MIDDLEWARE = ['config.loadtest_middleware.LoadtestMarkerMiddleware', *MIDDLEWARE]  # noqa: F405
