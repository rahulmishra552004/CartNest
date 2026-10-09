# Ecommerce Django Backend

This file records the current state of the project for future development chats.
Read it before suggesting changes, but verify the referenced source files before
editing because the implementation may have changed since this document was
updated.

Last reviewed: 2026-09-28

Cart and checkout ORM behavior reviewed: 2026-10-09.

## Project location

The active Django project is this `ecommerce_backend` directory. There is no
directory named `ecommerce_project` in the workspace.

The nested `ecommerce-backend` directory contains the older bundled catalog,
images, and JSON data used by the import command. It is not the active Django
project.

## Current stack

- Python 3.14.7 Windows virtual environment in `venv/`
- Django 6.1.1
- Django REST Framework 3.18.1
- django-cors-headers 4.9.0
- Pillow 12.3.0
- SQLite database at `db.sqlite3`
- Product images under `media/products/`
- Expected React origin: `http://localhost:5173`
- Expected Django origin: `http://localhost:8000`

There is currently no `requirements.txt` or `pyproject.toml`. The installed
packages above were read from the existing Windows virtual environment.

## Starting the backend on Windows

Run these commands in PowerShell:

```powershell
cd C:\Users\rahul\OneDrive\Desktop\tutorials\django\ecommerce_backend
.\venv\Scripts\Activate.ps1
python manage.py migrate
python manage.py check
python manage.py runserver
```

The API is then available at `http://localhost:8000`.

## Django apps

| App | Current responsibility |
| --- | --- |
| `users` | Custom user model and session authentication endpoints |
| `vendors` | Vendor profiles connected one-to-one with vendor users |
| `products` | Product catalog, search, images, vendor ownership, and stock |
| `deliveryoptions` | Delivery speed, price, and duration data |
| `cart` | Authenticated, user-specific cart operations |
| `orders_and_paymentsummary` | Payment totals, order snapshots, and order history |

The project URL configuration mounts all application API routes under `/api/`.
The Django admin is at `/admin/`, and media files are served from `/media/`
during development.

## Authentication

The project uses Django session authentication rather than JWT tokens.

Relevant settings:

- `AUTH_USER_MODEL = 'users.User'`
- DRF uses `SessionAuthentication`.
- CORS allows `http://localhost:5173`.
- Cross-origin credentials are enabled.
- `http://localhost:5173` is a trusted CSRF origin.
- `localhost` and `127.0.0.1` are allowed Django hosts.

The custom user extends `AbstractUser` and adds a `role` field with two possible
values: `customer` and `vendor`. A role currently stores information only; no
role-based permissions have been implemented.

### Authentication flow

1. React requests `GET /api/auth/csrf/` with credentials included.
2. Django returns `csrfToken` and sets the CSRF cookie.
3. React posts JSON credentials to `POST /api/auth/login/`, includes cookies,
   and sends the token in the `X-CSRFToken` header.
4. Django authenticates the credentials and calls Django's login function.
5. Django sets the `sessionid` cookie and returns the user plus the rotated CSRF
   token.
6. Later requests include credentials so Django can populate `request.user`.
7. Unsafe requests such as POST, PUT, PATCH, and DELETE also send the current
   CSRF token.

The current-user endpoint is intended to restore React authentication state
after a page refresh.

## API endpoints

Routers use `trailing_slash=False`, while the manually declared authentication
routes include trailing slashes. Use the URLs exactly as shown.

| Method | URL | Authentication | Behavior |
| --- | --- | --- | --- |
| GET | `/api/auth/csrf/` | Public | Return a CSRF token and set the CSRF cookie |
| POST | `/api/auth/login/` | Public + CSRF | Authenticate and create a session |
| POST | `/api/auth/logout/` | Session + CSRF | Destroy the current session |
| GET | `/api/auth/me/` | Session checked in view | Return the current user or HTTP 401 |
| GET | `/api/products` | Public | List products; accepts `?search=...` |
| GET | `/api/delivery-options` | Public | List delivery options |
| GET | `/api/cart-items` | Required | List the current user's cart |
| POST | `/api/cart-items` | Required + CSRF | Add a product or increase its cart quantity |
| GET | `/api/cart-items/{productId}` | Required | Retrieve one current-user cart item |
| PUT | `/api/cart-items/{productId}` | Required + CSRF | Update an item; currently forced to be partial |
| PATCH | `/api/cart-items/{productId}` | Required + CSRF | Partially update an item |
| DELETE | `/api/cart-items/{productId}` | Required + CSRF | Delete an item |
| GET | `/api/payment-summary` | Required | Calculate totals from the current user's cart |
| GET | `/api/orders` | Required | List the current user's orders, newest first |
| POST | `/api/orders` | Required + CSRF | Create an order snapshot and clear that user's cart |
| GET | `/api/orders/{id}` | Required | Retrieve one current-user order |

There are no vendor API routes yet.

## Models and relationships

### User

- Extends Django `AbstractUser`.
- Adds `role`, defaulting to `customer`.
- Has reverse relations `cart_items`, `orders`, and optionally `vendor`.

### Vendor

- Has a one-to-one relation with `User`.
- Stores `store_name` and `is_verified`.
- Owns products through the `products` reverse relation.

### Product

- Uses a UUID primary key.
- Stores image, name, rating, price in cents, and JSON keywords.
- Belongs to one `Vendor`.
- Stores non-negative `inventory_stock`.

The current product serializer does not expose `vendor` or `inventory_stock`.
The public product response currently contains only `id`, `image`, `name`,
`rating`, `priceCents`, and `keywords`.

### DeliveryOption

- Uses a short string primary key such as `1`.
- Stores delivery days, price in cents, and estimated duration in milliseconds.
- `estimatedDeliveryTimeMs` appears only when the request uses
  `?expand=estimatedDeliveryTime`.

### CartItem

- Uses a UUID primary key.
- Belongs to a user, product, and delivery option.
- Quantity must be at least one.
- The `(user, product)` pair is unique, so each user has at most one cart row
  for a product.
- The default delivery option ID is `1`.

### Order

- Uses a UUID primary key.
- Belongs to a user.
- Stores creation time in milliseconds.
- Stores the final cost in cents.
- Stores a JSON snapshot of the ordered products so later product changes do
  not rewrite order history.

`get_total_cost_cents()` remains in the order model only because the historical
`0001_initial` migration imports it. Current orders use an explicit calculated
total and the model field default is zero.

## Cart behavior

All cart access is protected by `IsAuthenticated`. `get_queryset()` filters by
`request.user`, so list, retrieve, update, and delete operations cannot access
another user's cart rows.

The cart serializer maps API names to model names:

| API name | Model/validated-data name |
| --- | --- |
| `productId` | `product` |
| `deliveryOptionId` | `delivery_option` |
| `quantity` | `quantity` |

Primary-key-related fields convert submitted IDs into model objects before the
serializer's object-level validation runs.

### POST create-or-increase flow

POST currently behaves as an "add to cart" operation:

1. The view starts a transaction and locks the authenticated user's row.
2. The serializer fetches and locks the product before checking stock.
3. It looks for the same product in the authenticated user's cart.
4. If found, it calculates existing quantity plus submitted quantity and
   rejects the request if the combined quantity exceeds inventory stock.
5. The serializer's custom `create()` updates the existing row with the
   combined quantity and optionally the submitted delivery option.
6. If no row exists, the parent serializer creates one.
7. The view passes ownership with `serializer.save(user=request.user)`.

The current POST view returns HTTP 200 for both a newly created row and an
updated row. It does not distinguish HTTP 201 for creation.

### Cart representation and updates

- `?expand=product` includes the nested product representation.
- Without it, the nested `product` field is removed.
- During PUT and PATCH, `productId` is read-only. The existing cart item's
  product is used for stock validation.
- The view currently forces `partial=True` for PUT, so PUT behaves like PATCH.
- POST, PUT/PATCH, DELETE, and checkout acquire the same user-row lock inside
  a transaction before reading or changing the user's cart. This coordinates
  these API write paths even when the cart is empty.
- The database enforces `quantity > 0` in addition to serializer validation.
- Row locks require a database that supports `SELECT FOR UPDATE`, such as
  PostgreSQL. SQLite ignores `select_for_update()`, so local SQLite tests do
  not verify the concurrency guarantees.

## Payment summary

The payment summary reads only the authenticated user's cart.

For each cart row it calculates:

- Total items by summing quantities.
- Product cost as quantity multiplied by product price.
- Shipping cost by adding the delivery-option price once per cart row.
- Subtotal as product cost plus shipping.
- Tax as ten percent of the subtotal, rounded to cents.
- Final total as subtotal plus tax.

Inventory is validated when cart quantities are written and decremented during
checkout. Adding a product to a cart does not reserve its stock.

The summary helper accepts already loaded cart items. The payment-summary
endpoint fetches the current user's cart with product and delivery-option
relations; checkout reuses its existing cart list without querying it again.

## Order creation

Order APIs require authentication and filter all order reads by `request.user`.

Creating an order performs these operations inside one database transaction:

1. Lock the authenticated user's row, then load and lock their cart rows.
   `of=("self",)` keeps this query from also locking its joined relations.
2. Reject an empty cart.
3. Lock the cart's products in primary-key order. Replace the cart items'
   product references with these freshly fetched instances.
4. Check stock and decrement inventory using `bulk_update()`.
5. Calculate totals and build JSON snapshots from the same loaded cart list.
6. Save the order and create its `OrderItem` rows with `bulk_create()`.
   Foreign-key IDs come from backend-owned objects rather than client input.
7. Delete only the cart rows included in this checkout.
8. Commit the order, order items, inventory changes, and cart deletion together.

If any step fails, all database changes in this transaction roll back.
Order items retain product JSON snapshots, user and vendor ownership, quantity,
and the selected delivery option. Their product field is not a foreign key.

Order responses omit the nested product details by default. Use
`?expand=products` to include them.

## Current development data

The current SQLite database contains:

- 5 users
- 2 vendor profiles
- 42 products
- 3 delivery options
- 0 cart items
- 3 existing orders, all owned by user ID 1

Current users:

| Username | Role | Notes |
| --- | --- | --- |
| `rahul` | customer | Superuser; password is not documented here |
| `alice_customer` | customer | Demo login |
| `bob_customer` | customer | Demo login |
| `tech_vendor` | vendor | Owns Tech Haven |
| `home_vendor` | vendor | Owns Home Essentials |

The four demo accounts use the local-development password `DemoPass123!`.

Vendor data:

- Tech Haven is verified and owns 21 products.
- Home Essentials is verified and owns 21 products.
- Product stock values currently range from 15 to 100.

Do not reuse the demo password outside local development.

## Catalog import command

The project includes:

```powershell
python manage.py import_catalog
```

It reads product and delivery-option JSON from the nested `ecommerce-backend`
folder and copies images into `media/products/`.

The command does not currently supply `vendor` or `inventory_stock` when
creating a product. It can update the existing imported products while
preserving those fields, but importing a brand-new product ID will fail until
the command is extended to assign them.

## Migrations and database state

The following project-specific migrations are currently applied:

- `users.0001_initial`
- `vendors.0001_initial`
- `products.0001_initial`
- `products.0002_alter_product_id_alter_product_name`
- `products.0003_add_vendor_and_inventory_nullable`
- `products.0004_require_vendor_and_inventory`
- `cart.0001_initial`
- `cart.0002_alter_cartitem_product`
- `cart.0003_auto_20260927_1823`
- `orders_and_paymentsummary.0001_initial`
- `orders_and_paymentsummary.0002_auto_20260927_1823`
- `orders_and_paymentsummary.0003_alter_order_user_orderitem`

The new `cart.0004_enforce_positive_cart_quantity` migration adds the database
quantity check. Apply pending migrations with `python manage.py migrate` when
updating a development database.

The staged product migrations preserved the 42 pre-existing products while
adding required vendor and inventory fields. The cart and order migrations
assigned existing data to user ID 1 where a non-null user was required.

## Cart and checkout tests

Run `python manage.py test cart orders_and_paymentsummary` to check cart
additions, stock validation, per-user isolation, the quantity constraint,
payment summaries, order snapshots, and checkout rollback after an order-item
insert failure. The helper tests also verify that loaded cart items can be
reused without additional queries. These tests apply migrations to a temporary
test database and do not modify the development data. PostgreSQL concurrency
tests are still needed to verify actual row-lock contention.

## Known limitations and unfinished work

- Product API responses do not expose vendor or inventory information.
- Vendor API views and URLs are not implemented.
- `VendorSerializer` currently refers to a DRF field class named
  `ForeignKeyRelatedField`, which does not exist. It is unused because there is
  no vendor endpoint yet.
- Roles are not enforced through permission classes.
- Inventory is not reserved when items enter a cart.
- The development SQLite database does not implement the row-locking protocol.
- Cart POST returns HTTP 200 even when it creates a new row.
- PUT is treated as a partial update.
- The catalog importer cannot create new products without vendor and stock
  defaults.
- Cart and checkout have regression tests; the other apps still have generated
  test placeholders. Actual PostgreSQL concurrency tests are not implemented.
- Development settings contain a hard-coded secret key and `DEBUG=True`; they
  are not suitable for deployment.
- The project has no dependency lock file.

## Guidance for future chats

When continuing work:

1. Read this README and the live files involved in the requested change.
2. Treat session authentication, per-user cart/order isolation, and the current
   create-or-increase cart behavior as deliberate unless the user asks to
   change them.
3. Never accept a cart or order user ID from the client; use `request.user`.
4. Preserve the existing SQLite data unless the user explicitly requests a
   reset.
5. Generate and apply migrations for model changes.
6. Update this README after material changes to architecture, endpoints,
   credentials, database seed data, or request behavior.
