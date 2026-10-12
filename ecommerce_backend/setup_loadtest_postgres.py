"""Initialize, reset, or snapshot the isolated PostgreSQL load-test database.

Stop Django and Locust before changing the load-test database.
"""
import argparse
import logging
import os
from pathlib import Path
import shutil
import subprocess
import tempfile


BASE_DIR = Path(__file__).resolve().parent
SNAPSHOT = BASE_DIR / 'loadtest-postgres-baseline.dump'


def postgres_tool(name):
    executable = shutil.which(name)
    if executable:
        return executable
    directory = Path(os.environ.get('ProgramFiles', 'C:/Program Files')) / 'PostgreSQL'
    candidates = sorted(directory.glob(f'*/bin/{name}.exe'), reverse=True)
    if not candidates:
        raise RuntimeError(f'{name} not found. Install PostgreSQL command-line tools.')
    return str(candidates[0])


def validate_database(config):
    if (config['ENGINE'], config['NAME'], config['HOST'], config['USER']) != (
        'django.db.backends.postgresql', 'ecommerce_loadtest', '127.0.0.1', 'ecommerce_user',
    ):
        raise RuntimeError('Refusing to change a database other than local ecommerce_loadtest.')


def run_postgres(name, config, *options):
    environment = os.environ.copy()
    environment['PGPASSWORD'] = config['PASSWORD']
    environment['PGCONNECT_TIMEOUT'] = '5'
    subprocess.run([
        postgres_tool(name), '--host', config['HOST'], '--port', config['PORT'],
        '--username', config['USER'], '--dbname', config['NAME'], '--no-password',
        *options,
    ], env=environment, check=True)


def product_ids():
    from django.db import connection
    from products.models import Product
    if Product._meta.db_table not in connection.introspection.table_names():
        return set()
    return set(Product.objects.values_list('pk', flat=True))


def invalidate_cache(ids):
    from django.core.cache import cache
    from redis.exceptions import ConnectionError, TimeoutError
    keys = ['products:list', 'delivery-options:v1:expanded:0', 'delivery-options:v1:expanded:1']
    keys.extend(f'products:{product_id}' for product_id in ids)
    try:
        cache.delete_many(keys)
    except (ConnectionError, TimeoutError):
        logging.getLogger(__name__).warning('Load-test cache invalidation failed.')


def save_baseline(config):
    validate_database(config)
    temporary = SNAPSHOT.with_suffix('.dump.tmp')
    run_postgres('pg_dump', config, '--format=custom', '--no-owner', '--no-privileges',
                 '--file', str(temporary))
    temporary.chmod(0o600)
    temporary.replace(SNAPSHOT)


def restore_baseline(config):
    from django.db import connections
    validate_database(config)
    if not SNAPSHOT.is_file():
        raise RuntimeError('No PostgreSQL baseline exists. Run initial setup first.')
    old_ids = product_ids()
    connections.close_all()
    run_postgres('pg_restore', config, '--clean', '--if-exists', '--no-owner',
                 '--no-privileges', '--single-transaction', str(SNAPSHOT))
    invalidate_cache(old_ids | product_ids())


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    actions = parser.add_mutually_exclusive_group()
    actions.add_argument('--reset', action='store_true', help='Restore the saved load-test baseline')
    actions.add_argument('--save-baseline', action='store_true', help='Replace the baseline with current load-test data')
    parser.add_argument('--stock', type=int, default=1_000_000)
    args = parser.parse_args(argv)
    if not 1 <= args.stock <= 2_147_483_647:
        parser.error('--stock must be between 1 and 2147483647.')

    os.environ['DJANGO_SETTINGS_MODULE'] = 'config.loadtest'
    import django
    django.setup()
    from django.conf import settings
    from django.core.management import call_command
    from django.db import connections
    from config.settings import DATABASES as development_databases
    from products.models import Product

    config = settings.DATABASES['default']
    validate_database(config)
    if args.reset:
        restore_baseline(config)
        print('Restored PostgreSQL load-test records and invalidated the load-test cache.')
        return
    if args.save_baseline:
        save_baseline(config)
        print('Saved the current PostgreSQL load-test baseline.')
        return
    if SNAPSHOT.exists():
        raise RuntimeError('A baseline already exists; use --reset or --save-baseline explicitly.')
    if connections['default'].introspection.table_names():
        raise RuntimeError('Destination is not empty. Initialization refuses to overwrite tables.')
    source = development_databases['default']
    if source['NAME'] == config['NAME']:
        raise RuntimeError('Development and load-test databases must be different.')

    with tempfile.TemporaryDirectory(prefix='.postgres-migration-', dir=BASE_DIR) as directory:
        export = Path(directory) / 'development.dump'
        run_postgres('pg_dump', source, '--format=custom', '--no-owner', '--no-privileges',
                     '--file', str(export))
        connections.close_all()
        run_postgres('pg_restore', config, '--no-owner', '--no-privileges',
                     '--single-transaction', str(export))
    call_command('migrate', interactive=False)
    count = Product.objects.update(inventory_stock=args.stock)
    source_media = BASE_DIR / 'media'
    if source_media.is_dir():
        shutil.copytree(source_media, settings.MEDIA_ROOT, dirs_exist_ok=True)
    invalidate_cache(product_ids())
    call_command('check')
    save_baseline(config)
    print(f'PostgreSQL load tests ready: {count} products at {args.stock:,} units each.')


if __name__ == '__main__':
    main()
