"""Deployment-style load-test settings, e.g. gunicorn config.wsgi:application."""
from .loadtest import *  # noqa: F401,F403

DEBUG = False

# Reuse database connections under Gunicorn's WSGI workers.
DATABASES['default']['CONN_MAX_AGE'] = 60
