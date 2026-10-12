# Ecommerce Project

A full-stack ecommerce learning project with a React storefront, a Django REST
Framework API, PostgreSQL, and Redis caching.

Last reviewed against the source code: **2026-10-12**.

The active development copy is `~/projects/ecommerce_project` in Ubuntu WSL.
This README is the main project reference; verify the relevant source when
making changes.

## Current features

- Public product catalog, API search, and individual product details.
- Session login/logout, restored login state after refresh, and protected
  checkout, order-history, and tracking pages.
- Customer registration and vendor registration APIs. Vendor registration
  creates the user and store profile in one transaction.
- Product creation by vendors, with updates and deletion restricted to the
  product's vendor owner.
- Per-user carts with add-or-increase quantities, delivery selection, stock
  validation, and payment summaries.
- Atomic checkout with PostgreSQL row locks, stock deduction, order and
  order-item snapshots, and cart clearing.
- Redis caching for the catalog, product details, and delivery options, with
  database fallback when Redis connections fail.
- PostgreSQL for development, isolated Locust workloads, and automated tests.

## Stack and repository layout

| Layer | Technologies |
| --- | --- |
| Frontend | React 19, Vite 6, React Router 7, Axios, Day.js, JavaScript/CSS |
| Backend | Python 3.12 WSL environment, Django, Django REST Framework |
| Persistence | PostgreSQL 18, psycopg |
| Cache | Redis through Django's built-in Redis cache backend |
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
│   ├── config/                   Settings, database/cache config, root URLs
│   ├── users/                    Users, registration, session authentication
│   ├── vendors/                  Vendor profiles and serializer
│   ├── products/                 Catalog, vendor permissions, cache, import
│   ├── deliveryoptions/          Delivery prices and durations
│   ├── cart/                     User-isolated carts
│   ├── orders_and_paymentsummary/ Checkout, totals, order snapshots
│   ├── media/                    Development product/UI images
│   ├── setup_loadtest_postgres.py PostgreSQL load-test setup/reset helper
│   └── prepare_loadtest_users.py  Dedicated Locust accounts and baseline
├── locustfile.py                 Load-test scenarios
├── POSTGRES_DEVELOPMENT.md        WSL services and database configuration
└── LOAD_TESTING.md                Isolated workloads and reset instructions
```

The backend's nested `ecommerce-backend/` folder contains bundled tutorial
catalog data. The active Django project is `ecommerce_backend/`.

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
use an isolated in-memory cache while keeping PostgreSQL as the database.

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

Registration is currently available through the API; there are no registration
screens or vendor-management screens in the frontend.

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
| POST | `/api/products/` | Vendor with profile; create own product |
| PUT, PATCH, DELETE | `/api/products/{id}/` | Owning vendor only |
| GET | `/api/delivery-options/` | Public delivery choices |
| GET, POST | `/api/cart-items/` | List own cart / add or increase quantity |
| GET, PUT, PATCH, DELETE | `/api/cart-items/{productId}/` | Read or change own cart item |
| GET | `/api/payment-summary/` | Calculate current cart totals |
| GET, POST | `/api/orders/` | List own orders / check out current cart |
| GET | `/api/orders/{id}/` | Retrieve own order |

Customer registration accepts `username`, `password`, and optional `email`;
the server forces the customer role. Vendor registration also accepts
`store_name`, forces the vendor role, and creates both records atomically.
Passwords go through Django validation and are hashed with `create_user()`.
Registration does not automatically log the user in.

Product creation assigns the vendor from the authenticated user's profile.
The product representation includes `id`, `image`, `name`, `rating`,
`priceCents`, `keywords`, `inventory_stock`, and read-only `vendor`.
The API mostly uses camelCase, with these product fields retaining their
current names.

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

Checkout performs the following in one transaction:

1. Lock the user and their cart rows; reject an empty cart.
2. Lock products in primary-key order and recheck available stock.
3. Deduct inventory and calculate totals from the loaded cart.
4. Create the order and its order items with product JSON snapshots.
5. Delete only the checked-out cart rows.
6. After commit, invalidate the catalog and affected product caches.

Failures roll back inventory, orders, order items, and cart changes together.
Snapshots preserve order history when the catalog changes. Order items retain
the user, vendor, order, delivery option, quantity, and product snapshot.

## Redis cache flow

| Response | Logical key | Lifetime |
| --- | --- | --- |
| Unfiltered product list | `products:list` | 300 seconds |
| Product detail | `products:{id}` | 300 seconds |
| Delivery options | `delivery-options:v1:expanded:0` or `:1` | 300 seconds |

Django adds the configured prefix and cache version to these logical keys.
Non-empty product searches bypass caching. Cache hits return serialized data;
misses query PostgreSQL and populate the cache. Empty lists are valid hits.

Redis connection and timeout failures log warnings and fall back to PostgreSQL.
When a read fails, that request skips its cache write. Product create, update,
and delete operations invalidate caches only after a successful database
commit; checkout does the same after inventory changes.

Admin changes, catalog imports, and direct ORM writes do not currently trigger
this view-level invalidation. Delivery options have no write API; changes made
elsewhere rely on expiry or explicit invalidation.

## Checks and tests

From the backend directory, with the virtual environment active:

```bash
python manage.py check
python manage.py makemigrations --check --dry-run
python manage.py migrate --check
python manage.py test --settings=config.test
```

The current 10 regression tests cover cart additions, stock validation,
per-user isolation, the positive-quantity constraint, payment totals, checkout
snapshots and stock deduction, empty-cart rejection, and transaction rollback.
They also check that summary/snapshot helpers can reuse loaded cart rows without
extra queries. They do not simulate concurrent PostgreSQL transactions.

From the frontend directory:

```bash
npm run lint
npm run build
```

On 2026-10-12, Django checks, migration checks, all 10 backend tests, frontend
lint, and the frontend production build passed in WSL.

For Locust, run a separate backend on port 8001 with `config.loadtest`, then
target that server. Follow [LOAD_TESTING.md](LOAD_TESTING.md) for scenarios,
account preparation, and baseline resets. Never target the development database
with reset commands.

## Catalog import and local data

The migrated development seed includes 5 users, 2 vendor profiles, 42 products,
3 delivery options, and 3 existing orders. These are a migration snapshot,
not counts guaranteed to remain unchanged during development.

The local demo users are `alice_customer`, `bob_customer`, `tech_vendor`,
and `home_vendor`, with local-only password `DemoPass123!`. Vendor stores
are Tech Haven and Home Essentials. The `rahul` superuser password is not
documented. Do not reuse demo credentials outside local development.

`python manage.py import_catalog` reads the bundled catalog/delivery JSON and
copies product images. It can update existing catalog rows, but does not supply
required vendor and inventory values for brand-new products. Extend it before
using it to populate an empty product database. It also bypasses view-level
cache invalidation.

## Remaining limitations

- Registration and vendor catalog management have APIs but no frontend screens.
- Tracking progress is static; there is no fulfillment-state model or real
  payment-provider integration.
- Frontend loading/error handling is limited outside login, and tracking
  assumes valid order/product query parameters.
- Cart POST returns 200 for both creation and increase; PUT acts like PATCH.
- Cart stock is validated but not reserved.
- Cache invalidation for admin/import/direct writes is incomplete. Concurrent
  cache fills and invalidation are not coordinated.
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
