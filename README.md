# Ecommerce Project

A full-stack ecommerce learning project with a React storefront, a Django REST
Framework API, PostgreSQL, Redis, and Celery background jobs.

Last reviewed against the source code: **2026-11-05**.

The active development copy is `~/projects/ecommerce_project` in Ubuntu WSL.
This README is the main project reference; verify the relevant source when
making changes.

## Current features

- Public product catalog with search (name or keywords), five sort orders, and
  pagination (24 per page), plus product details, today's most-viewed
  (trending) products, and recently viewed products for signed-in users.
- Database-backed sessions cached in Redis, login/logout, restored login state
  after refresh, and protected checkout, order-history, tracking, and profile
  pages.
- Customer and vendor registration, profile editing, password changes, and
  upgrading a customer account to a vendor store. Vendor registration creates
  the user and store profile in one transaction.
- Saved delivery addresses: up to 10 per user with one default, managed from
  the profile and chosen at checkout. Each order keeps its own copy of the
  address.
- Vendor dashboard: catalog management (add, edit, delete, search, sort), order
  items with step-by-step delivery status updates, and sales stats for the last
  7, 30, or 90 days or all time. The public product API stays read-only.
- Per-user carts with add-or-increase quantities, delivery selection, stock
  validation, and payment summaries.
- Atomic checkout with PostgreSQL row locks, stock deduction, order and
  order-item snapshots, and cart clearing.
- Checkout idempotency persisted in PostgreSQL, with completed responses cached
  in Redis and a required `Idempotency-Key` header.
- Redis caching for the catalog's first page, product details, and delivery
  options, with product-list rebuild locking and randomized product-detail
  expiry.
- Lua-based token-bucket throttling for product searches, recently viewed
  products for signed-in users, and daily most-viewed rankings.
- Celery order-confirmation tasks with retries, a total attempt limit, and
  periodic recovery through Celery Beat. Emails currently print to the console.
- PostgreSQL for development, isolated Locust workloads, and automated tests.

**Frontend integration status:** every feature above has a frontend screen.
Storefront checkout sends an idempotency key, prevents duplicate in-flight
clicks, and reuses the key after an uncertain response or failed refresh.

## Stack and repository layout

| Layer | Technologies |
| --- | --- |
| Frontend | React 19, Vite 6, React Router 7, Axios, Day.js, JavaScript/CSS |
| Backend | Python 3.12 WSL environment, Django, Django REST Framework |
| Persistence | PostgreSQL 18, psycopg |
| Cache | Redis through Django's built-in Redis cache backend |
| Background jobs | Celery with Redis as broker; Celery Beat for periodic recovery |
| Testing | Django/DRF regression tests and Locust workloads |
| Containers | Docker, Docker Compose |
| Production-style serving | Gunicorn, nginx, WhiteNoise |
| CI | GitHub Actions |

Exact Python pins are in `ecommerce_backend/requirements.txt`; frontend
dependencies are declared in `ecommerce_frontend/package.json` and locked in
`package-lock.json`. `redis` is pinned to 6.4.0 because Celery 5.6's `kombu`
requires `redis<6.5`. Locust is pinned separately in
`locust_loadtest/requirements-loadtest.txt`.

```text
ecommerce_project/
├── ecommerce_frontend/
│   ├── src/pages/                Storefront, auth, checkout, orders, tracking,
│   │                             profile/addresses, vendor catalog/orders/stats
│   ├── src/components/           Shared UI: logo, empty states, pagination controls
│   ├── src/utils/                Money, pagination, checkout keys, error messages
│   ├── public/                   Branding, avatar, tracking icons, catalog images
│   ├── starting-code/backend/    Catalog JSON read by import_catalog
│   ├── Dockerfile                Development image (Vite dev server)
│   ├── Dockerfile.prod           Production image (React build served by nginx)
│   └── nginx.conf                Production routing for React, Django, and media
├── ecommerce_backend/
│   ├── config/                   Settings, pagination, shared Redis client, Celery, URLs
│   ├── users/                    Users, registration, profile/password, session auth
│   ├── vendors/                  Vendor profiles; vendor catalog, order, and stats APIs
│   ├── products/                 Public catalog, cache locks, throttling, history/rankings
│   ├── addresses/                Saved delivery addresses
│   ├── deliveryoptions/          Delivery prices and durations
│   ├── cart/                     User-isolated carts
│   ├── orders_and_paymentsummary/ Checkout, idempotency, snapshots, email tasks
│   ├── media/                    Development product/UI images
│   └── Dockerfile                Backend image; runs Gunicorn as a non-root user
├── .github/workflows/ci.yml      GitHub Actions: runs check.sh on pushes and pull requests
├── check.sh                      Runs every check in Docker
├── compose.yml                   Docker development stack
├── compose.prod.yml              Production-style Docker stack
├── .env.example                  Template for the gitignored .env and .env.prod files
├── locust_loadtest/              Load-test tooling (its data, dumps, and reports are gitignored)
│   ├── locustfile.py             Load-test scenarios (locust_scenarios.py: opt-in extras)
│   ├── setup_loadtest_postgres.py PostgreSQL load-test setup/reset helper
│   ├── prepare_loadtest_users.py Dedicated Locust accounts and baseline
│   ├── audit_loadtest.py         Pre/post-run stock and order reconciliation
│   ├── gunicorn.loadtest.conf.py Capacity-test server configuration
│   └── LOAD_TESTING.md           Isolated workloads and reset instructions
└── POSTGRES_DEVELOPMENT.md        WSL services and database configuration
```

Bundled catalog JSON is in `ecommerce_frontend/starting-code/backend/`, with
source images in `ecommerce_frontend/public/images/products/`. The running app
loads product images from Django's `/media/`, not from `public/`. The active
Django project is `ecommerce_backend/`.

## Run with Docker

Docker runs the whole project: PostgreSQL, Redis, Django, the Celery worker,
Celery Beat, and the frontend. Install Docker Desktop with WSL integration and
keep it running.

### Development

Stop any local `runserver`, Vite, and Celery processes first, because the stack
uses ports 8000 and 5173. From the project root:

```bash
cp .env.example .env
docker compose up --build
```

Edit `.env` and replace `change_me` for `DJANGO_SECRET_KEY` and `DB_PASSWORD`
before the first start. PostgreSQL only reads the password when its volume is
first created.

Open `http://localhost:5173`. Django is at `http://localhost:8000/admin/`.
The backend runs migrations on start, so a new stack has its tables but no data.
Code changes appear without a rebuild, because `compose.yml` bind-mounts both
apps. Restart the worker after changing task code:

```bash
docker compose restart celery-worker
```

Rebuild after changing `requirements.txt`, `package.json`, or a Dockerfile.
After changing `package.json`, also replace the `node_modules` volume:

```bash
docker compose up --build -V
```

| Command | What it does |
| --- | --- |
| `docker compose up -d` | Start everything in the background |
| `docker compose ps` | Show running services and their health |
| `docker compose logs -f backend` | Follow one service's logs |
| `docker compose run --rm backend python manage.py <command>` | Run a one-off Django command |
| `docker compose down` | Remove the containers; volumes and data stay |
| `docker compose down -v` | Also delete the volumes, **including the database** |

### Production-style stack

`compose.prod.yml` runs the app the way a server would, on your machine, at
`http://localhost:8080`. It uses Gunicorn, `DEBUG=False`, a non-root user, and
nginx as the only public entry point. nginx serves the React build and
`/media/`, and forwards `/api/`, `/admin/`, and `/static/` to Django. It has its
own containers and volumes (project `ecommerce-prod`), so it can run beside the
development stack.

Create `.env.prod` from `.env.example`. It is gitignored. Use a new
`DJANGO_SECRET_KEY` and `DB_PASSWORD`, and set these values:

```text
DJANGO_DEBUG=false
DJANGO_ALLOWED_HOSTS=localhost,backend
DJANGO_CORS_ALLOWED_ORIGINS=
DJANGO_CSRF_TRUSTED_ORIGINS=http://localhost:8080
DJANGO_BEHIND_PROXY=true
REDIS_CACHE_PREFIX=ecommerce:prod
```

Every command for this stack needs the project, file, and env-file options. An
alias, which lasts for the current terminal, keeps them from being missed:

```bash
alias prod='docker compose -p ecommerce-prod -f compose.prod.yml --env-file .env.prod'
prod up -d --build
prod ps -a
```

`migrate` should show `Exited (0)`; it runs once before the backend starts.
The new stack has no product images until you copy them into its `media`
volume:

```bash
prod run --rm --no-deps -v ./ecommerce_backend/media:/seed:ro backend cp -r /seed/. /app/media/
```

Without `prod`, plain `docker compose` commands act on the development stack.

### Copy a database into Docker

**This replaces the target stack's database.** Create a dump outside the
repository, because it contains user data:

```bash
PGPASSWORD="$(cat ecommerce_backend/.db-password)" \
  pg_dump -h 127.0.0.1 -U ecommerce_user -d ecommerce -Fc -f ~/ecommerce.dump
```

Then restore it and clear the cached catalog. This example targets the
production-style stack; replace `prod` with `docker compose` for development.

```bash
prod stop backend celery-worker celery-beat
prod exec -T db pg_restore -U ecommerce_user -d ecommerce --no-owner --no-privileges --clean --if-exists < ~/ecommerce.dump
prod exec redis redis-cli -n 0 flushdb
prod start backend celery-worker celery-beat
```

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
`python -m pip install -r requirements.txt`. For editor type checking, use
`requirements-dev.txt` instead; it adds the Django, DRF and Celery type stubs
on top of `requirements.txt`. A fresh checkout also requires
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
`:loadtest` to the prefix and use `locust_loadtest/media.loadtest/`. Automated test settings
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

These environment variables have development defaults in the code. Docker
Compose supplies them from `.env` or `.env.prod`:

| Variable | Default | Purpose |
| --- | --- | --- |
| `DJANGO_SECRET_KEY` | Development-only key | Django secret key. Startup fails if this default is used with debug off |
| `DJANGO_DEBUG` | `True` | Debug mode; `true`, `1`, or `yes` turn it on |
| `DJANGO_ALLOWED_HOSTS` | `localhost,127.0.0.1` | Comma-separated hosts |
| `DJANGO_CORS_ALLOWED_ORIGINS` | `http://localhost:5173` | Comma-separated browser origins |
| `DJANGO_CSRF_TRUSTED_ORIGINS` | `http://localhost:5173` | Comma-separated browser origins |
| `DJANGO_BEHIND_PROXY` | `False` | Read the guest IP from nginx's `X-Real-IP`. Only enable behind a proxy that sets this header |
| `BACKEND_URL` | `http://127.0.0.1:8000` | Vite's proxy target in development; not used by the production build |

## Frontend routes and authentication

| Route | Behavior |
| --- | --- |
| `/` | Public catalog: search (header box), sort, pages, add to cart |
| `/products/{productId}` | Public product details |
| `/trending` | Public: today's most-viewed products |
| `/recently-viewed` | Protected: the user's recently viewed products |
| `/login`, `/logout` | Username/password login (redirects signed-in users home); logout |
| `/customer_registration`, `/vendor_registration` | Sign-up forms; redirect signed-in users home |
| `/checkout` | Protected cart, delivery address and option, totals, place order |
| `/orders` | Protected order history (paginated) and buy-again actions |
| `/orders/{orderId}/products/{productId}/tracking` | Protected order-item tracking view |
| `/profile`, `/vendor/profile` | Protected account summary, with the customer or vendor header |
| `/profile/edit`, `/profile/change-password` | Protected profile and password forms |
| `/profile/addresses` | Protected saved-address management |
| `/profile/register-vendor` | Protected, customers only: open a vendor store |
| `/about`, `/vendor/about` | About page, with the customer or vendor header |
| `/vendor/catalog`, `/vendor/catalog/new`, `/vendor/catalog/{productId}` | Vendor catalog: list (search, sort, pages), add, edit or delete |
| `/vendor/orders` | Vendor order items: delivery status updates and pending count |
| `/vendor/stats` | Vendor sales stats with a 7/30/90-day or all-time filter |

`App.jsx` owns the user, the cart, and the current page of orders with the
total order count. It restores the user with `/api/auth/me/`, then fetches that
user's cart and first page of orders; the Orders page loads other pages.
Logout clears all three states. Protected customer pages redirect guests to
`/login`. Vendor pages are not guarded in the router; the vendor APIs reject
other accounts with 403. Catalog, orders, and vendor-catalog pages keep `?page=`
(and `?sort=`/`?search=`) in the URL, so reloads and the back button keep them.

Authentication uses Django session cookies. `main.jsx` configures Axios to
include credentials and map Django's `csrftoken` cookie to the
`X-CSRFToken` header. Login first fetches a CSRF token, then submits the
credentials; Django rotates the token after login. Unsafe API requests require
the current CSRF token. The configured development browser origin is
`http://localhost:5173`.

Customer and vendor registration, profile, address, and vendor dashboard
screens are all available.

## API reference

All API paths below include trailing slashes. Authentication is required for
cart, payment-summary, address, order, and vendor endpoints; writes also require
CSRF protection. Vendor endpoints also require a vendor account, and only ever
read or change that vendor's own products and order items.

| Method | Path | Access / behavior |
| --- | --- | --- |
| GET | `/api/auth/csrf/` | Public; set CSRF cookie and return token |
| POST | `/api/auth/login/` | Public + CSRF; username/password session login |
| POST | `/api/auth/logout/` | CSRF; clear session |
| GET | `/api/auth/me/` | Current user, or 401 when signed out |
| POST | `/api/auth/change_password/` | Signed in + CSRF; `password` and `new_password` |
| POST, PATCH | `/api/auth/register_customer/` | POST: public, create customer. PATCH: signed-in customer updates own username/email |
| POST, PATCH | `/api/auth/register_vendor/` | POST: public, create vendor and store. PATCH: a vendor updates details/store name; a customer upgrades to vendor |
| GET | `/api/products/` | Public catalog, paginated; `?search=`, `?sort=`, `?page=` |
| GET | `/api/products/{id}/` | Public product detail |
| GET | `/api/products/recently-viewed/` | Signed-in user's ten most recent distinct products |
| GET | `/api/products/most-viewed/` | Public top ten products by detail requests today (UTC) |
| GET | `/api/delivery-options/` | Public delivery choices (plain list) |
| GET, POST | `/api/cart-items/` | List own cart (plain list) / add or increase quantity |
| GET, PUT, PATCH, DELETE | `/api/cart-items/{productId}/` | Read or change own cart item |
| GET | `/api/payment-summary/` | Calculate current cart totals |
| GET, POST | `/api/addresses/` | List own addresses, default first (plain list) / add one (at most 10) |
| PATCH, DELETE | `/api/addresses/{id}/` | Change or delete own address; PUT returns 405 |
| GET, POST | `/api/orders/` | List own orders, newest first, paginated / check out the cart; POST requires `Idempotency-Key` and `addressId` |
| GET | `/api/orders/{orderId}/products/{productId}/tracking/` | Retrieve one owned order item for tracking |
| GET, POST | `/api/vendor/products/` | Own products, paginated, with `?search=`, `?sort=`, `?page=` / create one (multipart form with image) |
| GET, PUT, PATCH, DELETE | `/api/vendor/products/{id}/` | Read, change, or delete own product |
| GET | `/api/vendor/orders/` | Own order items, preparing first then by estimated delivery; paginated, plus `pending_count` |
| PUT, PATCH | `/api/vendor/orders/{id}/` | Move `deliveryStatus` one step forward: preparing → shipping → delivered |
| GET | `/api/vendor/stats/` | Sales stats; `?range=7d`, `30d`, `90d`, or `all` (the default) |

There is no endpoint for a single order; the orders list and the tracking
endpoint cover the frontend's needs.

Customer registration accepts `username`, `password`, and optional `email`;
the server forces the customer role. Vendor registration also accepts
`store_name`, forces the vendor role, and creates both records atomically.
Passwords go through Django validation and are hashed with `create_user()`.
Registration does not automatically log the user in. PATCH on either endpoint
edits the signed-in user instead; it cannot change the password, which has its
own endpoint and keeps the session signed in after the change.

The public product API is read-only; vendors change their catalog through
`/api/vendor/products/`, and Django admin and the `import_catalog` command also
write products. The product representation includes `id`, `image`, `name`,
`rating`, `priceCents`, `keywords`, `inventoryStock`, and read-only `vendor`.
The API uses camelCase, except `store_name` in auth/user data, the
`password`/`new_password` inputs, and `pending_count` in the vendor order list.
Product prices must be nonnegative. Product UUIDs are normalized to lowercase,
hyphenated strings for cache keys, invalidation, and tracking; malformed product
URL UUIDs return 404.

Saved addresses take `recipientName`, `phoneNumber` (with country code, e.g.
`+919876543210`; spaces, dashes, and brackets are removed), `line1`, `city`,
`state`, `postalCode`, `countryCode` (letters), and optional `line2`, `label`,
and `isDefault`. A user's first address
becomes the default, and choosing another default clears the old one; the
database allows only one default per user.

### Pagination

List endpoints use DRF page-number pagination (`config/pagination.py`, 24 items
per page) and return `{"count", "next", "previous", "results"}`. Request
another page with `?page=N`; a page past the end returns 404 with
`{"detail": "Invalid page."}`. Paginated: products, orders, vendor products,
and vendor orders. The cart, addresses, and delivery options opt out with
`pagination_class = None` and return plain lists, because their pages need the
whole list. Recently viewed and most-viewed build their own short lists. New list
endpoints are paginated by default. The frontend's `PAGE_SIZE` in
`src/utils/pagination.js` must match the backend page size.

### Search and sort

`?search=` matches product names or keywords, ignoring case. `?sort=` takes
`name_asc` (the default), `name_desc`, `price_asc`, `price_desc`, or
`rating_desc`; products with equal values stay in a fixed order by id.
Unknown sort values return 400. The vendor catalog compares names in lowercase
and breaks rating ties by review count. The public catalog sorts names as
stored, so with the database's `C.UTF-8` collation capital letters come first.

### Vendor stats

`/api/vendor/stats/` returns one flat object. Sales numbers cover the chosen
range: `totalRevenueCents`, `unitsSold`, `ordersCount`, `avgOrderValue`,
`topProducts` (top five by revenue), and `graph` (one `{day, revenue}` per UTC
day, oldest first, including days without sales). Revenue is the product price
stored on each order item times its quantity, so shipping and tax are not
included. "Last 7 days" means today plus the six whole UTC days before it.
Delivery numbers always cover every order item, whatever the range:
`preparingItemsCount`, `shippingItemsCount`, `deliveredItemsCount`, and
`overdueItemsCount` (past the estimated delivery time and not delivered).
`lowStockProducts` lists products with `lowStockThreshold` (5) or fewer units.

Expansion parameters:

- `/api/cart-items/?expand=product`: include nested product details.
- `/api/delivery-options/?expand=estimatedDeliveryTime`: include
  `estimatedDeliveryTimeMs`.
- `/api/orders/?expand=products`: include nested product snapshots.

There is no delivery-option write API. Vendor store details are edited through
`PATCH /api/auth/register_vendor/`.

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
5. Deduct inventory, then create the order: `addressId` must be one of the
   user's own saved addresses, and the order stores a copy of it. Order items
   get product JSON snapshots. A missing or unknown address returns 400 and
   rolls back the deduction.
6. Link the checkout request to the order and delete the checked-out cart rows.
7. After commit, queue confirmation, invalidate affected product caches, and
   cache the completed checkout response when Redis is available.

Failures roll back inventory, orders, order items, and cart changes together.
Snapshots preserve order history when the catalog changes, and each order keeps
its delivery address after the saved address is edited or deleted. Order items retain
the user, vendor, order, quantity, product, delivery timing, delivery price,
and tax snapshots.

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

{"addressId": "<id of one of your saved addresses>"}
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
| First page of the unsearched, unsorted product list | `products:v3:list` | 300 seconds |
| Product detail | `products:v2:{canonical-uuid}` | Randomly 300–360 seconds |
| Delivery options | `delivery-options:v1:expanded:0` or `:1` | 300 seconds |
| Completed checkout | `checkout-result:user:{user}:key:{key}:expand:{True/False}` | 3,600 seconds |

Django adds the configured prefix and cache version to these logical keys.
Searches, `?sort=` requests, and pages after the first bypass the list cache;
`?page=1` and no `page` share the cached first page. The key moved to `v3`
when the list became paginated, so older plain-list entries are never served.
Cache hits return serialized data; misses query PostgreSQL and populate the
cache. Empty lists are valid hits.

The first-page product-list, product-detail, and delivery-option caches store
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
  get a burst of 30 with refill 30/minute per account; guests get a burst of 20
  with refill 20/minute per IP, identified by `REMOTE_ADDR`. Every catalog load
  with a search costs a token (submitting, changing the sort, returning to the
  results, retrying), so these limits leave room for normal browsing while
  slowing scripts to one search every 2-3 seconds. Exhausted buckets return HTTP 429 with
  `Retry-After`. Connection/timeout failures allow the request through. Only
  the first page of a search counts; requests for `?page=2` and later are not
  charged. Other endpoints, including the vendor catalog search, are not
  covered by this throttle.
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

To run the backend tests, the missing-migration check, frontend lint, and the
frontend build in Docker, from the project root:

```bash
./check.sh
```

GitHub Actions (`.github/workflows/ci.yml`) runs the same script on every push
and pull request, using `.env.example` for its throwaway stack. It tests the
development stack; it does not start `compose.prod.yml`.

To run checks without Docker, from the backend directory, with the virtual
environment active:

```bash
python manage.py check
python manage.py makemigrations --check --dry-run
python manage.py migrate --check
python manage.py test --settings=config.test
```

The regression suite (56 tests) covers cart additions, stock validation,
per-user isolation, constraints, payment totals, checkout snapshots/deduction,
rejection, and rollback. Checkout tests send idempotency keys and verify both
cache-backed and database-backed replay without duplicate stock deduction, and
reject missing, unknown, and other users' addresses. Address tests cover the
10-address limit, default handling, validation, and ownership. Product tests
cover the list cache (including that later pages bypass it), the
first-page-only search throttle, and cache invalidation. The `users` and
`vendors` apps have no tests yet. Redis must be available; test settings execute
Celery eagerly with an in-memory mail backend. Tests do not simulate concurrent
PostgreSQL transactions.

Load-test tooling tests are excluded from the default run. The Django-side
ones (runtime-cleanup cache/queue scoping, audit reconciliation, baseline
restore) live in `config/loadtest_tooling_tests.py`; run them from the backend
directory:

```bash
python manage.py test config.loadtest_tooling_tests --settings=config.test
```

Load-generator recovery tests for the tooling in `locust_loadtest/` run from
the project root:

```bash
python -m unittest discover -s locust_loadtest -p loadtest_tests.py
```

From the frontend directory:

```bash
npm run lint
npm run build
```

For Locust, run an isolated backend on port 8001. Follow
[LOAD_TESTING.md](locust_loadtest/LOAD_TESTING.md) for resource setup, explicit search/replay/session
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

- Tracking details and progress use the stored order-item snapshot and delivery
  status, but there is no carrier or real payment-provider integration.
- Vendor pages are not guarded in the frontend router; non-vendors reach them
  and see the API's 403 errors.
- Some pages show nothing while they load (for example vendor orders and stats).
- Paging quickly on the customer Orders page can let an older response win,
  because `App.jsx` owns that request and does not cancel the previous one.
- Deleting the default address does not make another address the default.
- Vendor stats use UTC days, so late-evening orders in other time zones count
  toward the next day.
- Guest search limits use `REMOTE_ADDR`, or nginx's `X-Real-IP` when
  `DJANGO_BEHIND_PROXY` is on. Docker Desktop can show every visitor with the
  same address, so local production-style runs may share one bucket.
- The cached first catalog page stores absolute image URLs built from the host
  of the request that filled it, so it assumes one public host. Requests that
  reach Django under another host can fill the cache with unusable URLs.
- Login and registration have no rate limit.
- Cart POST returns 200 for both creation and increase; PUT acts like PATCH.
- Cart stock is validated but not reserved.
- Cache invalidation for admin/direct writes is incomplete. Concurrent
  cache fills and invalidation are not coordinated.
- Email uses the console backend. A successful send followed by a failed
  timestamp commit can still produce duplicates; real SMTP needs a timeout.
- Authentication, the vendor dashboard APIs (catalog, orders, stats), vendor
  permissions, and Redis failure/invalidation paths lack dedicated regression
  coverage; concurrency coverage is also needed.
- Development settings use `DEBUG=True` and a fallback secret key.
  `compose.prod.yml` is a local production-style setup, not a deployment: it
  has no HTTPS or secure-cookie settings, and `manage.py check --deploy` reports
  those gaps plus the console email backend. There is no automated deployment.

## Guidance for future changes

Read this README and inspect the relevant source before editing. Preserve
session/CSRF protection, user isolation, vendor ownership, atomic checkout, and
add-or-increase cart behavior unless the requested change replaces them.
Derive ownership and checkout prices/totals on the server. Preserve development
data in `ecommerce`; resets belong only to isolated `ecommerce_loadtest`.
Create migrations for model changes, run relevant checks, and update these docs
when behavior or setup changes.
