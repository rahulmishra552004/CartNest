from unittest.mock import MagicMock, patch
from pathlib import Path
import shutil
import tempfile
from unittest import skipUnless

from django.db import connection
from django.test import SimpleTestCase, TransactionTestCase, override_settings

from setup_loadtest_postgres import _restore_archive, clear_loadtest_runtime, run_postgres
from audit_loadtest import reconcile


class RuntimeCleanupTests(SimpleTestCase):
    database = {'ENGINE': 'django.db.backends.postgresql', 'NAME': 'ecommerce_loadtest',
                'HOST': '127.0.0.1', 'USER': 'ecommerce_user'}

    def test_cleanup_refuses_development_database(self):
        with self.assertRaisesRegex(RuntimeError, 'Refusing'):
            clear_loadtest_runtime({**self.database, 'NAME': 'ecommerce'})

    def test_cleanup_refuses_development_cache(self):
        with self.assertRaisesRegex(RuntimeError, 'namespace'):
            clear_loadtest_runtime(self.database)

    @override_settings(CACHES={'default': {'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
                                         'KEY_PREFIX': 'ecommerce:dev:loadtest'}},
                       CELERY_TASK_DEFAULT_QUEUE='ecommerce_loadtest')
    def test_cleanup_targets_only_prefixed_keys_and_dedicated_queue(self):
        with patch('config.redis_client.redis_client') as redis, patch('config.celery.app') as app:
            redis.scan_iter.return_value = [b'ecommerce:dev:loadtest:1:checkout-result:a']
            connection = app.connection_for_write.return_value.__enter__.return_value
            channel = MagicMock()
            connection.channel.return_value = channel
            clear_loadtest_runtime(self.database)
            redis.scan_iter.assert_called_once_with(match='ecommerce:dev:loadtest:1:*', count=500)
            redis.delete.assert_called_once_with(b'ecommerce:dev:loadtest:1:checkout-result:a')
            channel.queue_purge.assert_called_once_with(queue='ecommerce_loadtest')
            redis.flushdb.assert_not_called()
            redis.flushall.assert_not_called()


class AuditTests(SimpleTestCase):
    baseline = {'stock': {'p': 10}, 'sold': {'p': 3}, 'orders': ['old']}

    def test_historical_sales_are_subtracted(self):
        current = {'stock': {'p': 8}, 'sold': {'p': 5}, 'orders': ['old', 'new']}
        self.assertEqual(reconcile(self.baseline, current), [])

    def test_unrecorded_stock_loss_fails(self):
        current = {'stock': {'p': 7}, 'sold': {'p': 5}, 'orders': ['old', 'new']}
        self.assertTrue(reconcile(self.baseline, current))

    def test_reset_or_deleted_products_fail(self):
        self.assertTrue(reconcile(self.baseline, {'stock': {}, 'sold': {}, 'orders': []}))


@skipUnless(all(shutil.which(tool) for tool in ('pg_dump', 'pg_restore', 'psql')),
            'PostgreSQL command-line tools required for archive integration test')
class ArchiveRestoreTests(TransactionTestCase):
    def test_restore_removes_newer_dependent_tables_in_temporary_database(self):
        config = connection.settings_dict.copy()
        # This primitive is exercised only against Django's temporary database.
        self.assertTrue(config['NAME'].startswith('test_'))
        with tempfile.TemporaryDirectory() as directory:
            archive = Path(directory) / 'baseline.dump'
            with connection.cursor() as cursor:
                cursor.execute('CREATE TABLE loadtest_restore_probe (id integer PRIMARY KEY)')
                cursor.execute('INSERT INTO loadtest_restore_probe VALUES (1)')
            run_postgres('pg_dump', config, '--format=custom', '--no-owner', '--no-privileges',
                         '--file', str(archive))
            with connection.cursor() as cursor:
                cursor.execute('CREATE TABLE loadtest_future_table '
                               '(probe_id integer REFERENCES loadtest_restore_probe(id))')
                cursor.execute('INSERT INTO loadtest_restore_probe VALUES (2)')
            _restore_archive(config, archive)
            with connection.cursor() as cursor:
                cursor.execute('SELECT id FROM loadtest_restore_probe')
                self.assertEqual(cursor.fetchall(), [(1,)])
                cursor.execute("SELECT to_regclass('public.loadtest_future_table')")
                self.assertIsNone(cursor.fetchone()[0])
                cursor.execute('DROP TABLE loadtest_restore_probe')
