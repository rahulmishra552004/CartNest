# Ecommerce Project

A full-stack ecommerce learning project with a React storefront, a Django REST
Framework API, PostgreSQL, Redis, and Celery background jobs.

Last reviewed against the source code: **2026-10-28**.

The active development copy is `~/projects/ecommerce_project` in Ubuntu WSL.
This README is the main project reference; verify the relevant source when
making changes.

## Current features

- Public product catalog, API search, and individual product details.
- Database-backed sessions cached in Redis, login/logout, restored login state
  after refresh, and protected
  checkout, order-history, and tracking pages.
- Customer registration and vendor registration APIs. Vendor registration
  creates the user and store profile in one transaction.
- Read-only public product API; catalog changes currently use Django admin or
  the catalog import command.
- Per-user carts with add-or-increase quantities, delivery selection, stock
  validation, and payment summaries.
- Atomic checkout with PostgreSQL row locks, stock deduction, order and
  order-item snapshots, and cart clearing.
- Checkout idempotency persisted in PostgreSQL, with completed responses cached
  in Redis and a required `Idempotency-Key` header.
- Redis caching for the catalog, product details, and delivery options, with
  product-list rebuild locking and randomized product-detail expiry.
- Lua-based token-bucket throttling for product searches, recently viewed
  products for signed-in users, and daily most-viewed rankings.
- Celery order-confirmation tasks with retries, a total attempt limit, and
  periodic recovery through Celery Beat. Emails currently print to the console.
- PostgreSQL for development, isolated Locust workloads, and automated tests.

**Frontend integration status:** recently viewed products and rankings are
backend-only. Storefront checkout sends an idempotency key, prevents duplicate
in-flight clicks, and reuses the key after an uncertain response or failed refresh.

## Stack and repository layout

| Layer | Technologies |
| --- | --- |
| Frontend | React 19, Vite 6, React Router 7, Axios, Day.js, JavaScript/CSS |
| Backend | Python 3.12 WSL environment, Django, Django REST Framework |
| Persistence | PostgreSQL 18, psycopg |
| Cache | Redis through Django's built-in Redis cache backend |
| Background jobs | Celery with Redis as broker; Celery Beat for periodic recovery |
| Testing | Django/DRF regression tests and Locust workloads |

Exact Python pins are in `ecommerce_backend/requirements.txt`; frontend
dependencies are declared in `ecommerce_frontend/package.json` and locked in
`package-lock.json`. Locust is installed separately from backend requirements.

```text
ecommerce_project/
├── ecommerce_frontend/
│   ├── src/pages/                Storefront, login, checkout, orders, tracking
│   ├── src/utils/                Shared frontend helpers
│   └── starting-code/            Tutorial/reference files
├── ecommerce_backend/
│   ├── config/                   Settings, shared Redis client, Celery, root URLs
│   ├── users/                    Users, registration, session authentication
│   ├── vendors/                  Vendor profiles and serializer
│   ├── products/                 Catalog, cache locks, throttling, history/rankings
│   ├── deliveryoptions/          Delivery prices and durations
│   ├── cart/                     User-isolated carts
│   ├── orders_and_paymentsummary/ Checkout, idempotency, snapshots, email tasks
│   ├── media/                    Development product/UI images
│   ├── setup_loadtest_postgres.py PostgreSQL load-test setup/reset helper
│   └── prepare_loadtest_users.py  Dedicated Locust accounts and baseline
├── locustfile.py                 Load-test scenarios
├── POSTGRES_DEVELOPMENT.md        WSL services and database configuration
└── LOAD_TESTING.md                Isolated workloads and reset instructions
```

Bundled catalog JSON is in `ecommerce_frontend/starting-code/backend/`, with
source images in `ecommerce_frontend/public/`. The active Django project is
`ecommerce_backend/`.

## Run locally in WSL

The existing WSL copy already has its dependencies and databases configured.
Start PostgreSQL and Redis if they have stopped:

```bash
sudo service postgresql start
sudo service redis-server start
```

Start Django in one Ubuntu terminal:

```bash
cd ~/projects/ecommerce_project/ecommerce_backend
source .venv/bin/activate
python manage.py migrate
python manage.py runserver
```

For background confirmations, open another terminal, activate the same virtual
environment, and run from the backend directory:

```bash
celery -A config worker --loglevel=INFO
```

For scheduled confirmation recovery, use a separate terminal with the same
environment and working directory:

```bash
celery -A config beat --loglevel=INFO
```

Run one Beat scheduler for this development schedule. Beat queues tasks; the
worker executes them. Restart workers and Beat after changing their code or
configuration. The default Beat scheduler writes local `celerybeat-schedule`
state; it is generated runtime data, not application source.

Start Vite in another Ubuntu terminal:

```bash
cd ~/projects/ecommerce_project/ecommerce_frontend
npm ci
npm run dev
```

Open `http://localhost:5173`. Django serves the API at
`http://127.0.0.1:8000/api/` and admin at `http://127.0.0.1:8000/admin/`.
Vite proxies `/api` and `/media` to Django; `/images` is rewritten to
`/media`.

To rebuild the Python environment, create `.venv` with
`python3 -m venv .venv`, activate it, and run
`python -m pip install -r requirements.txt`. A fresh checkout also requires
the PostgreSQL role/databases, local credentials, and Redis; see the
[database guide](POSTGRES_DEVELOPMENT.md).

## Database and cache configuration

| Purpose | Django settings | PostgreSQL database |
| --- | --- | --- |
| Development | `config.settings` | `ecommerce` |
| Locust | `config.loadtest` | `ecommerce_loadtest` |
| Automated tests | `config.test` | Temporary `test_ecommerce` |

PostgreSQL listens on `127.0.0.1:5432`. The local `ecommerce_user` role has
`CREATEDB` so Django can create and remove its test database.

`config/database.py` reads `DB_NAME`, `DB_USER`, `DB_PASSWORD`,
`DB_HOST`, and `DB_PORT`. Development credentials fall back to the
gitignored `ecommerce_backend/.db-password`. Load tests support corresponding
`LOADTEST_DB_*` overrides and `.loadtest-db-password`.

Development data was migrated from SQLite and the existing Windows PostgreSQL
load-test database was transferred to WSL on 2026-10-12. Both transfers were
verified against their sources. Legacy SQLite files are not used by runtime
settings.

Redis defaults to `redis://127.0.0.1:6379/0`, with prefix `ecommerce:dev`.
Override these with `REDIS_URL` and `REDIS_CACHE_PREFIX`. Load tests add
`:loadtest` to the prefix and use `media.loadtest/`. Automated test settings
use Redis with a `:test` prefix and PostgreSQL's temporary test database.

`config/redis_client.py` provides one direct redis-py client/pool per process
for throttling, history, rankings, and locks. It allows up to 20 connections and
uses one-second connection and socket timeouts. Django's cache has its own pool
and reads the same `settings.REDIS_URL`. These pools open connections as needed.

Sessions use `django.contrib.sessions.backends.cached_db`: PostgreSQL stores the
session and Redis accelerates access. The cache alias is `default`.

Celery uses `CELERY_BROKER_URL`, defaulting to `redis://127.0.0.1:6379/1`.
The `/0` and `/1` databases share the same Redis process, memory limit, eviction
policy, and persistence settings. They are not separate servers.

Load-test settings use Redis `/2` for cache/state and `/3` for the Celery
broker, with queue `ecommerce_loadtest`. Run their worker and Beat with
`DJANGO_SETTINGS_MODULE=config.loadtest`; cache prefixes alone do not isolate
Celery. Test settings use eager tasks and an in-memory email backend. Redis
database numbers still share server resources.

See [POSTGRES_DEVELOPMENT.md](POSTGRES_DEVELOPMENT.md) for configuration details.

## Frontend routes and authentication

| Route | Behavior |
| --- | --- |
| `/` | Public catalog and add-to-cart actions |
| `/login` | Username/password login; redirects signed-in users home |
| `/checkout` | Protected cart, delivery selection, totals, place order |
| `/orders` | Protected order history and buy-again actions |
| `/tracking?orderId=...&productId=...` | Protected order-product view with static progress |

`App.jsx` owns user, cart, and order state. It restores the user with
`/api/auth/me/`, then fetches that user's cart and orders. Logout clears all
three states. Protected pages redirect guests to `/login`.

Authentication uses Django session cookies. `main.jsx` configures Axios to
include credentials and map Django's `csrftoken` cookie to the
`X-CSRFToken` header. Login first fetches a CSRF token, then submits the
credentials; Django rotates the token after login. Unsafe API requests require
the current CSRF token. The configured development browser origin is
`http://localhost:5173`.

Customer and vendor registration screens are available. Vendor product-management
screens and product-write API endpoints are not currently enabled.

## API reference

All API paths below include trailing slashes. Authentication is required for
cart, payment-summary, and order endpoints; writes also require CSRF protection.

| Method | Path | Access / behavior |
| --- | --- | --- |
| GET | `/api/auth/csrf/` | Public; set CSRF cookie and return token |
| POST | `/api/auth/login/` | Public + CSRF; username/password session login |
| POST | `/api/auth/logout/` | CSRF; clear session |
| GET | `/api/auth/me/` | Current user, or 401 when signed out |
| POST | `/api/auth/register_customer/` | Public + CSRF; create customer |
| POST | `/api/auth/register_vendor/` | Public + CSRF; create vendor and store |
| GET | `/api/products/` | Public catalog; accepts `?search=...` |
| GET | `/api/products/{id}/` | Public product detail |
| GET | `/api/products/recently-viewed/` | Signed-in user's ten most recent distinct products |
| GET | `/api/products/most-viewed/` | Public top ten products by detail requests today (UTC) |
| GET | `/api/delivery-options/` | Public delivery choices |
| GET, POST | `/api/cart-items/` | List own cart / add or increase quantity |
| GET, PUT, PATCH, DELETE | `/api/cart-items/{productId}/` | Read or change own cart item |
| GET | `/api/payment-summary/` | Calculate current cart totals |
| GET, POST | `/api/orders/` | List own orders / check out current cart; POST requires `Idempotency-Key` |
| GET | `/api/orders/{id}/` | Retrieve own order |

Customer registration accepts `username`, `password`, and optional `email`;
the server forces the customer role. Vendor registration also accepts
`store_name`, forces the vendor role, and creates both records atomically.
Passwords go through Django validation and are hashed with `create_user()`.
Registration does not automatically log the user in.

The product API is read-only. Catalog changes currently use Django admin or the
`import_catalog` management command. The product representation includes
`id`, `image`, `name`, `rating`,
`priceCents`, `keywords`, `inventory_stock`, and read-only `vendor`.
The API mostly uses camelCase, with these product fields retaining their
current names. Product prices must be nonnegative. Product UUIDs are normalized
to lowercase, hyphenated strings for cache keys, invalidation, and tracking;
malformed product URL UUIDs return 404.

Expansion parameters:

- `/api/cart-items/?expand=product`: include nested product details.
- `/api/delivery-options/?expand=estimatedDeliveryTime`: include
  `estimatedDeliveryTimeMs`.
- `/api/orders/?expand=products`: include nested product snapshots.

There is no standalone vendor-profile API or delivery-option write API.

## Cart, totals, and checkout

Cart rows belong to the authenticated user. Each `(user, product)` pair is
unique, quantities must be positive, and the default delivery option is `1`.
POST creates a row or adds to its existing quantity, rejecting totals above
stock. It currently returns 200 in both cases. PUT behaves as a partial update,
like PATCH, and cannot change the row's product.

Cart writes and checkout lock the same user row inside transactions.
Add-to-cart also locks the product for its stock check. Adding to a cart does
not reserve inventory.

Payment totals use current product prices, shipping once per cart row, and
10% tax on products plus shipping, rounded to cents.

Checkout follows this flow; the database writes occur in one transaction:

1. Validate the idempotency header and check for a cached completed response.
2. On a cache miss, lock the user and find/create their `CheckoutRequest`.
   Return its existing order if this key already completed checkout.
3. For a new key, lock the cart rows; reject an empty cart.
4. Lock products in primary-key order and recheck available stock.
5. Deduct inventory and create the order/items with product JSON snapshots.
6. Link the checkout request to the order and delete the checked-out cart rows.
7. After commit, queue confirmation, invalidate affected product caches, and
   cache the completed checkout response when Redis is available.

Failures roll back inventory, orders, order items, and cart changes together.
Snapshots preserve order history when the catalog changes. Order items retain
the user, vendor, order, delivery option, quantity, and product snapshot.

Vendor PUT/PATCH requests also lock the product before loading it for update.
This prevents an unrelated vendor edit from saving stale inventory over a
concurrent checkout's deduction.

### Checkout idempotency

For an authenticated API request, include a nonempty key of at most 128
characters, along with the session cookie and current CSRF token:

```http
POST /api/orders/?expand=products
Idempotency-Key: checkout-demo-001
X-CSRFToken: <current-csrf-token>
Content-Type: application/json

{}
```

Use a new key for a new purchase and reuse the same key when retrying that
purchase. Keys belong to the authenticated user. `CheckoutRequest` enforces a
unique `(user, key)` pair and links it to one order. Records currently have no
automatic retention cleanup. A repeated completed key returns that order with
HTTP 201, without changing stock/cart or queuing another confirmation.

The Redis response cache lasts one hour and includes the `expand=products`
choice in its key. Its expiration does not remove PostgreSQL's idempotency
record. A reused key returns its original order even if the cart has changed.
Responses are serialized for the requested expansion; the database stores the
order relationship rather than an immutable copy of the original HTTP response.

## Redis cache flow

| Response | Logical key | Lifetime |
| --- | --- | --- |
| Unfiltered product list | `products:list` | 300 seconds |
| Product detail | `products:{canonical-uuid}` | Randomly 300–360 seconds |
| Delivery options | `delivery-options:v1:expanded:0` or `:1` | 300 seconds |
| Completed checkout | `checkout-result:user:{user}:key:{key}:expand:{True/False}` | 3,600 seconds |

Django adds the configured prefix and cache version to these logical keys.
Non-empty product searches bypass caching. Cache hits return serialized data;
misses query PostgreSQL and populate the cache. Empty lists are valid hits.

The unfiltered product-list, product-detail, and delivery-option caches store
rendered JSON bytes and return them directly as `application/json`, avoiding
JSON rendering on warm requests. Delivery expansions retain separate keys, and
product-detail cache hits still update history and rankings.
Legacy Python-data entries remain readable until expiry or invalidation; the
next rebuild writes bytes. The existing key, five-minute lifetime, rebuild lock,
and post-commit invalidation remain in use; detail TTL jitter is also preserved.

Redis connection and timeout failures log warnings and fall back to PostgreSQL.
When a read fails, that request skips its cache write. Product create, update,
and delete operations invalidate caches only after a successful database
commit; checkout does the same after inventory changes.


The product-list cache uses `SET NX EX` with a random ownership token and a
ten-second lock lifetime. Waiting requests poll the cache every 50 ms for
roughly one second, then fall back to PostgreSQL without populating the cache.
The lock holder rechecks the cache and uses Lua to release only its own lock in
`finally`. Lock expiry and the fallback allow duplicate queries; this reduces
stampedes rather than guaranteeing one rebuild. Jitter spreads product-detail
expiry across different keys.

Catalog imports invalidate product and both delivery-option variants after
commit. Admin changes and other direct ORM writes still bypass invalidation.
Concurrent fills and invalidation can repopulate an old result; cache generation
coordination is not implemented. Redis memory-full errors are not covered by
the connection/timeout fallback handlers.

### Search throttling, history, and rankings

- Nonempty GET product searches use an atomic Lua token bucket. Signed-in users
  have capacity 5 with refill 5/minute; guests have capacity 3 with refill
  3/minute, identified by `REMOTE_ADDR`. Exhausted buckets return HTTP 429 with
  `Retry-After`. Connection/timeout failures allow the request through. Other
  endpoints are not covered by this throttle.
- Successful product-detail requests update signed-in users' recently viewed
  lists, including cache hits. Lua removes duplicate IDs, prepends the latest,
  keeps ten entries, and refreshes a 30-day expiry.
- All successful product-detail requests, including guests and repeats, add to
  a UTC-date sorted-set ranking. This counts requests rather than unique
  visitors. Daily keys expire two days after their latest recorded view.
- History/ranking endpoints load product data from PostgreSQL, preserve Redis
  order, and skip deleted products. Connection/timeout failures return an empty
  result for reads and log failed tracking writes without failing browsing.

## Background confirmations

`orders_and_paymentsummary/tasks.py` contains `send_order_confirmation` and
`recover_order_confirmation`. Checkout publishes the first task after commit;
broker connection failures are logged while the saved order remains available.

The sending task locks its order, skips already-sent confirmations and users
without email, and records attempts. Selected network/SMTP disconnection errors
trigger up to three automatic retries after 5, 10, and 20 seconds. A database
counter caps sends at five total attempts across retries and recovery tasks.
Failed-send counters commit before their exceptions are raised again.

Beat queues recovery every 60 seconds. Recovery finds unsent orders with email,
fewer than five attempts, and either no prior attempt or one at least five
minutes old. It publishes IDs in an iterator and stops if broker publishing
fails. It can include historical orders, not just recent checkouts.

`MAILERS['default']` uses Django's console backend and `DEFAULT_FROM_EMAIL` is
`store@example.com`. Messages print in the worker terminal; nothing is delivered
to an inbox. Console success also records the sent timestamp. Real delivery
requires a configured mail provider and appropriate SMTP timeouts.

The order lock reduces simultaneous duplicate sends, but sending and committing
the timestamp are not one atomic operation. A crash between them can still lead
to another email. The task also holds the database lock during the send.

## Checks and tests

From the backend directory, with the virtual environment active:

```bash
python manage.py check
python manage.py makemigrations --check --dry-run
python manage.py migrate --check
python manage.py test --settings=config.test
```

The regression suite covers cart additions, stock validation, per-user
isolation, constraints, payment totals, checkout snapshots/deduction, rejection,
and rollback. Checkout tests send idempotency keys and verify both cache-backed
and database-backed replay without duplicate stock deduction. Runtime-cleanup
tests verify cache/queue scoping. Redis must be available; test settings execute
Celery eagerly with an in-memory mail backend. Tests do not simulate concurrent
PostgreSQL transactions. Load-generator recovery tests run separately:

```bash
python -m unittest loadtest_tests
```

From the frontend directory:

```bash
npm run lint
npm run build
```

For Locust, run an isolated backend on port 8001. Follow
[LOAD_TESTING.md](LOAD_TESTING.md) for resource setup, explicit search/replay/session
scenarios, baseline reset, capacity-server configuration, and post-run auditing.
The default workload uses idempotent checkout and authenticated history/rankings;
search throttling is measured separately with accepted and rejected counts.

## Catalog import and local data

The migrated development seed includes 5 users, 2 vendor profiles, 42 products,
3 delivery options, and 3 existing orders. These are a migration snapshot,
not counts guaranteed to remain unchanged during development.

The local demo users are `alice_customer`, `bob_customer`, `tech_vendor`,
and `home_vendor`, with local-only password `DemoPass123!`. Vendor stores
are Tech Haven and Home Essentials. The `rahul` superuser password is not
documented. Do not reuse demo credentials outside local development.

`python manage.py import_catalog --vendor-id <vendor-profile-id> --initial-stock 10`
reads the bundled catalog/delivery JSON and copies product images. Create the
vendor profile first. The vendor and initial stock apply only to new products;
existing products retain their vendor and stock. Initial stock defaults to zero
if omitted and cannot be negative. After commit, the command invalidates product
and delivery-option caches. Redis failures produce a warning without undoing
the import.

By default, catalog JSON comes from `ecommerce_frontend/starting-code/backend`
and images from `ecommerce_frontend/public`. Use `--catalog-dir` and
`--image-root` to import from other directories.

## Remaining limitations

- Registration and vendor catalog management have APIs but no frontend screens.
- Recently viewed and most-viewed APIs have no frontend integration.
- Tracking progress is static; there is no fulfillment-state model or real
  payment-provider integration.
- Frontend loading/error handling is limited outside login, and tracking
  assumes valid order/product query parameters.
- Cart POST returns 200 for both creation and increase; PUT acts like PATCH.
- Cart stock is validated but not reserved.
- Cache invalidation for admin/direct writes is incomplete. Concurrent
  cache fills and invalidation are not coordinated.
- Email uses the console backend. A successful send followed by a failed
  timestamp commit can still produce duplicates; real SMTP needs a timeout.
- Authentication, vendor permissions, and Redis failure/invalidation paths
  lack dedicated regression coverage; concurrency coverage is also needed.
- Development settings use `DEBUG=True` and a fallback secret key. Production
  deployment configuration is not provided.

The older `ecommerce_backend/documentation.md` is tutorial API reference
material, not the canonical description of implemented behavior.

## Guidance for future changes

Read this README and inspect the relevant source before editing. Preserve
session/CSRF protection, user isolation, vendor ownership, atomic checkout, and
add-or-increase cart behavior unless the requested change replaces them.
Derive ownership and checkout prices/totals on the server. Preserve development
data in `ecommerce`; resets belong only to isolated `ecommerce_loadtest`.
Create migrations for model changes, run relevant checks, and update these docs
when behavior or setup changes.
