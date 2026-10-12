# Ecommerce Django Backend

Last reviewed against the source code: **2026-10-12**.

The canonical architecture, API, authentication, checkout, caching, and
limitations reference is the [project README](../README.md).
See also [PostgreSQL development](../POSTGRES_DEVELOPMENT.md) and
[load testing](../LOAD_TESTING.md).

## Start in WSL

The active backend is `~/projects/ecommerce_project/ecommerce_backend`.
PostgreSQL and Redis must be running:

```bash
sudo service postgresql start
sudo service redis-server start
cd ~/projects/ecommerce_project/ecommerce_backend
source .venv/bin/activate
python manage.py migrate
python manage.py runserver
```

The development API is at `http://127.0.0.1:8000/api/`; admin is at
`http://127.0.0.1:8000/admin/`. API routes use trailing slashes.

Dependencies are pinned in `requirements.txt`. The nested
`ecommerce-backend/` directory is bundled import data, not the active server.

## Settings and services

| Settings module | Database | Cache |
| --- | --- | --- |
| `config.settings` | PostgreSQL `ecommerce` | Redis, development prefix |
| `config.loadtest` | PostgreSQL `ecommerce_loadtest` | Redis, isolated load-test prefix |
| `config.test` | Temporary PostgreSQL `test_ecommerce` | Isolated in-memory cache |

`config.loadtest_postgres` remains an alias for `config.loadtest`.
Database settings are built in `config/database.py` from environment variables
or gitignored password files. Redis defaults to port 6379; PostgreSQL to 5432.
The database guide documents the supported overrides.

## Applications

| App | Responsibility |
| --- | --- |
| `users` | Custom customer/vendor users, registration, session login/logout, CSRF |
| `vendors` | Store profiles created through vendor registration |
| `products` | Public catalog/search/details, owner-controlled writes, Redis cache |
| `deliveryoptions` | Public cached delivery choices |
| `cart` | User-isolated carts, stock validation, coordinated transactional writes |
| `orders_and_paymentsummary` | Totals, atomic checkout, stock deduction, order snapshots |

Checkout rejects empty carts and insufficient stock. It locks the user, cart
rows, and products, then saves orders/items, deducts stock, and clears the cart
in one transaction. Product caches are invalidated after commit.

## Validation

```bash
python manage.py check
python manage.py makemigrations --check --dry-run
python manage.py migrate --check
python manage.py test --settings=config.test
```

All 10 current regression tests are in `cart/tests.py` and
`orders_and_paymentsummary/tests.py`. They cover cart constraints/isolation,
stock validation, totals, order snapshots, stock deduction, and rollback.
They do not test real concurrent transactions, browser CSRF flows, vendor
permissions, or Redis failure/invalidation paths.

## Data-changing utilities

- `import_catalog` updates bundled catalog data. Brand-new products still
  need vendor/stock defaults; imports bypass view-level cache invalidation.
- `setup_loadtest_postgres.py --reset` restores only the load-test baseline.
  Stop the load-test server and Locust first.
- `setup_loadtest_postgres.py --save-baseline` deliberately replaces that
  baseline with current load-test records.
- `prepare_loadtest_users.py` resets the load-test baseline, prepares dedicated
  accounts, and saves a new baseline and credentials file.

Follow the linked load-testing guide before running these helpers. Preserve the
development database and keep credentials, local uploads, and baseline dumps
out of Git.
