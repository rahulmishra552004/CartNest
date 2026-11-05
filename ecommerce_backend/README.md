# Ecommerce Django Backend

Last reviewed against the source code: **2026-11-05**.

The canonical architecture, API, authentication, checkout, caching, and
limitations reference is the [project README](../README.md).
See also [PostgreSQL development](../POSTGRES_DEVELOPMENT.md) and
[load testing](../locust_loadtest/LOAD_TESTING.md).

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
`redis` stays at 6.4.0 because Celery 5.6's `kombu` requires `redis<6.5`.
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

## Docker

The [project README](../README.md#run-with-docker) covers the development and
production-style stacks. This folder's `Dockerfile` serves both. Its default
command is Gunicorn, as non-root `appuser` (UID 1000, matching the WSL user so
development bind mounts stay writable). `compose.yml` replaces that command with
`migrate` and `runserver`. `collectstatic` runs during the image build into
`staticfiles/`, and WhiteNoise serves those files when debug is off.

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

`CELERY_BROKER_URL` defaults to `redis://127.0.0.1:6379/1` for development.
Load tests use cache Redis `/2`, broker `/3`, and queue `ecommerce_loadtest`.
Their worker and Beat must use `DJANGO_SETTINGS_MODULE=config.loadtest`. Tests
execute tasks eagerly with in-memory mail. Redis database numbers share one
server's memory, eviction policy, and persistence configuration.

## Applications

| App | Responsibility |
| --- | --- |
| `users` | Custom customer/vendor users, registration, profile and password updates, session login/logout, CSRF |
| `vendors` | Store profiles; vendor catalog CRUD (search, sort), order-item status updates, sales stats |
| `products` | Read-only public catalog API (search, sort, pagination), caches/locks, search throttling, history/rankings |
| `addresses` | Saved delivery addresses: at most 10 per user, one default |
| `deliveryoptions` | Public cached delivery choices |
| `cart` | User-isolated carts, stock validation, coordinated transactional writes |
| `orders_and_paymentsummary` | Totals, checkout/idempotency, snapshots, confirmation tasks/recovery |

Checkout rejects empty carts, insufficient stock, and addresses that are
missing or not the user's own. It locks the user, cart rows, and products,
then deducts stock, saves the order with a copy of the delivery address plus
its items, and clears the cart in one transaction. Product caches are
invalidated after commit. Product UUIDs are canonicalized for Redis keys,
history, rankings, and invalidation. Catalog changes come from vendors
(`/api/vendor/products/`), Django admin, or the `import_catalog` command.

List endpoints are paginated by default (`config/pagination.py`, 24 per page,
`?page=N`). The cart, addresses, and delivery options set
`pagination_class = None` and return plain lists. See the root README for the
response shape and every endpoint.

## Checkout and Redis features

- POST `/api/orders/` requires a nonempty `Idempotency-Key` header of at most 128
  characters, plus session/CSRF credentials. New purchases use new keys; retries
  reuse the key. PostgreSQL's `CheckoutRequest` uniquely links `(user, key)` to
  its order. Completed retries return the order with HTTP 201. Redis caches
  responses for one hour, separately for each expansion choice.
- Product-list, product-detail, and delivery-option caching store rendered JSON
  bytes for direct JSON responses, with legacy data entries accepted until expiry.
  Delivery expansions use separate keys, and detail hits still update tracking.
  Only the first page of the unsearched, unsorted list is cached
  (`products:v3:list`); searches, sorts, and later pages go to PostgreSQL.
  The product-list lifetime is 300 seconds;
  detail caches use 300–360 seconds
  of jitter. List rebuilds use a ten-second token-owned lock, a cache recheck,
  roughly one second of polling, and Lua-based safe release. Waiting or failed
  Redis operations can fall back to PostgreSQL.
- Search-only token buckets allow bursts of 30 requests per signed-in user
  (refill 30/minute) or 20 per guest IP (refill 20/minute). Exhaustion
  returns 429 with `Retry-After`; connection/timeout errors fail open. Only the
  first page of a search counts; `?page=2` and later are free.
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

The frontend sends checkout idempotency keys and reuses them after uncertain
failures, and has pages for recently viewed and trending products. See the root
README for API details and the load-testing guide for isolated Celery setup.

## Validation

```bash
python manage.py check
python manage.py makemigrations --check --dry-run
python manage.py migrate --check
python manage.py test --settings=config.test
```

The 56 regression tests cover read-only product routes, product-cache
invalidation, the first-page-only list cache and search throttle, cart
constraints/isolation (the cart stays unpaginated), stock validation, totals,
snapshots, deduction, rollback, required checkout headers and addresses, cached
and database-backed idempotency replay, saved addresses (limit, defaults,
validation, ownership). `users` and `vendors`
have no tests yet, so authentication and the vendor catalog, order, and stats
APIs are untested. The tests do not cover true concurrent transactions, full
browser CSRF flows, or real email providers. Test settings require Redis and
use eager tasks with in-memory mail, so tests do not publish to development
Celery.

Load-test tooling tests (runtime-cleanup scoping, audit reconciliation, and
baseline restore) live in `config/loadtest_tooling_tests.py`. The name is
outside the `test*.py` discovery pattern, so the default run skips them. They
import the scripts from `../locust_loadtest/` and skip if that folder is
missing. Run them explicitly:

```bash
python manage.py test config.loadtest_tooling_tests --settings=config.test
```

## Data-changing utilities

- `import_catalog --vendor-id <vendor-profile-id> --initial-stock 10` imports
  bundled catalog data. New products receive the selected vendor and initial
  stock (zero if omitted); existing products retain their vendor and stock.
  Product and delivery-option caches are invalidated after commit, with a
  warning if Redis is unavailable.
  Sources default to the repository's frontend starter catalog and public
  images; override them with `--catalog-dir` and `--image-root` if needed.
- Load-test scripts in `../locust_loadtest/`, run from the project root:
  - `setup_loadtest_postgres.py --reset` restores only the load-test baseline.
    Stop the load-test server, Locust, worker, and Beat first.
  - `setup_loadtest_postgres.py --save-baseline` deliberately replaces that
    baseline with current load-test records.
  - `prepare_loadtest_users.py` resets the load-test baseline, prepares dedicated
    accounts, and saves a new baseline and credentials file.

Follow the linked [load-testing guide](../locust_loadtest/LOAD_TESTING.md) before running these helpers. Preserve the
development database and keep credentials, local uploads, and baseline dumps
out of Git.
