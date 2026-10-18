# Ecommerce Django Backend

Last reviewed against the source code: **2026-10-18**.

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

Dependencies, including `celery[redis]`, are pinned in `requirements.txt`.
Catalog import sources default to the frontend starter JSON and public images;
there is no active nested `ecommerce-backend/` server.

To process confirmation tasks, activate the same environment in separate
terminals, stay in this backend directory, and run:

```bash
celery -A config worker --loglevel=INFO
```

```bash
celery -A config beat --loglevel=INFO
```

Use one Beat scheduler. The worker executes tasks; Beat schedules confirmation
recovery every 60 seconds. Emails print in the worker console, not an inbox.

## Settings and services

| Settings module | Database | Cache |
| --- | --- | --- |
| `config.settings` | PostgreSQL `ecommerce` | Redis, development prefix |
| `config.loadtest` | PostgreSQL `ecommerce_loadtest` | Redis, isolated load-test prefix |
| `config.test` | Temporary PostgreSQL `test_ecommerce` | Redis, isolated test prefix |

`config.loadtest_postgres` remains an alias for `config.loadtest`.
Database settings are built in `config/database.py` from environment variables
or gitignored password files. Redis defaults to port 6379; PostgreSQL to 5432.
The database guide documents the supported overrides.

`REDIS_URL` defaults to `redis://127.0.0.1:6379/0`. Django's cache and the shared
direct client in `config/redis_client.py` use this setting. Throttling, history,
rankings, and locks share the direct client's 20-connection pool per process;
Django's cache keeps its own pool. Both use one-second Redis timeouts.
Sessions use `django.contrib.sessions.backends.cached_db` with cache alias
`default`, preserving database-backed sessions while caching access in Redis.

`CELERY_BROKER_URL` defaults to `redis://127.0.0.1:6379/1`. Test/load-test settings
currently inherit this broker and default queue; cache prefixes do not isolate
Celery tasks. Configure matching isolated workers/queues and Beat before running
background jobs across environments. Redis database numbers share one server's
memory, eviction policy, and persistence configuration.

## Applications

| App | Responsibility |
| --- | --- |
| `users` | Custom customer/vendor users, registration, session login/logout, CSRF |
| `vendors` | Store profiles created through vendor registration |
| `products` | Catalog, owner-controlled writes, caches/locks, search throttling, history/rankings |
| `deliveryoptions` | Public cached delivery choices |
| `cart` | User-isolated carts, stock validation, coordinated transactional writes |
| `orders_and_paymentsummary` | Totals, checkout/idempotency, snapshots, confirmation tasks/recovery |

Checkout rejects empty carts and insufficient stock. It locks the user, cart
rows, and products, then saves orders/items, deducts stock, and clears the cart
in one transaction. Product caches are invalidated after commit. Vendor updates
also lock their product row before loading it. Product UUIDs are canonicalized
for Redis keys, history, rankings, and invalidation.

## Checkout and Redis features

- POST `/api/orders/` requires a nonempty `Idempotency-Key` header of at most 128
  characters, plus session/CSRF credentials. New purchases use new keys; retries
  reuse the key. PostgreSQL's `CheckoutRequest` uniquely links `(user, key)` to
  its order. Completed retries return the order with HTTP 201. Redis caches
  responses for one hour, separately for each expansion choice.
- Product-list cache lifetime is 300 seconds; detail caches use 300–360 seconds
  of jitter. List rebuilds use a ten-second token-owned lock, a cache recheck,
  roughly one second of polling, and Lua-based safe release. Waiting or failed
  Redis operations can fall back to PostgreSQL.
- Search-only token buckets allow bursts of five requests per signed-in user
  (refill five/minute) or three per guest IP (refill three/minute). Exhaustion
  returns 429 with `Retry-After`; connection/timeout errors fail open.
- GET `/api/products/recently-viewed/` requires authentication and returns up to
  ten distinct recent products; history expires 30 days after the latest write.
- GET `/api/products/most-viewed/` is public and returns today's UTC ranking.
  Repeat and guest detail requests count. Ranking keys expire two days after
  the latest write. Both tracking features update on detail-cache hits too.
- Confirmation tasks skip sent orders, cap sending at five total attempts,
  and automatically retry selected failures up to three times with 5/10/20-second
  backoff. Recovery runs every minute, selecting orders last attempted at least
  five minutes ago or never attempted. A send can still be duplicated if recording its success
  fails; this is not an exactly-once delivery system.

The frontend does not yet send the checkout idempotency header and its current
place-order action receives HTTP 400. History/ranking frontend work is also
pending. See the root README for API details and remaining limitations.

## Validation

```bash
python manage.py check
python manage.py makemigrations --check --dry-run
python manage.py migrate --check
python manage.py test --settings=config.test
```

The 10 existing regression tests are in `cart/tests.py` and
`orders_and_paymentsummary/tests.py`. They cover cart constraints/isolation,
stock validation, totals, order snapshots, stock deduction, and rollback.
They do not test real concurrent transactions, browser CSRF flows, vendor
permissions, or Redis failure/invalidation paths.
Checkout test requests still lack the required idempotency header, so the suite
needs updating before its results represent the new flow. Test settings require
Redis; background tasks also need explicit isolation from development. Tests
were not run for this documentation update.

## Data-changing utilities

- `import_catalog --vendor-id <vendor-profile-id> --initial-stock 10` imports
  bundled catalog data. New products receive the selected vendor and initial
  stock (zero if omitted); existing products retain their vendor and stock.
  Product and delivery-option caches are invalidated after commit, with a
  warning if Redis is unavailable.
  Sources default to the repository's frontend starter catalog and public
  images; override them with `--catalog-dir` and `--image-root` if needed.
- `setup_loadtest_postgres.py --reset` restores only the load-test baseline.
  Stop the load-test server and Locust first.
- `setup_loadtest_postgres.py --save-baseline` deliberately replaces that
  baseline with current load-test records.
- `prepare_loadtest_users.py` resets the load-test baseline, prepares dedicated
  accounts, and saves a new baseline and credentials file.

Follow the linked load-testing guide before running these helpers. Preserve the
development database and keep credentials, local uploads, and baseline dumps
out of Git.
