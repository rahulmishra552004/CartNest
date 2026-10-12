"""PostgreSQL connections for development, load tests, and Django tests."""
import os
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured


BASE_DIR = Path(__file__).resolve().parent.parent


def postgres_database(default_name, *, loadtest=False):
    prefix = 'LOADTEST_DB_' if loadtest else 'DB_'
    password = os.environ.get(prefix + 'PASSWORD') or os.environ.get('DB_PASSWORD')
    if not password:
        filenames = ['.loadtest-db-password', '.db-password'] if loadtest else ['.db-password']
        for filename in filenames:
            path = BASE_DIR / filename
            if path.is_file():
                password = path.read_text(encoding='utf-8-sig').rstrip('\r\n')
                if password:
                    break
    if not password:
        raise ImproperlyConfigured(
            f'Set {prefix}PASSWORD or create ecommerce_backend/.db-password.'
        )

    name = os.environ.get(prefix + 'NAME', default_name)
    return {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': name,
        'USER': os.environ.get(prefix + 'USER', os.environ.get('DB_USER', 'ecommerce_user')),
        'PASSWORD': password,
        'HOST': os.environ.get(prefix + 'HOST', os.environ.get('DB_HOST', '127.0.0.1')),
        'PORT': os.environ.get(prefix + 'PORT', os.environ.get('DB_PORT', '5432')),
        'OPTIONS': {'connect_timeout': 5},
        'TEST': {'NAME': os.environ.get(prefix + 'TEST_NAME', f'test_{name}')},
    }
