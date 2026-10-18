# PostgreSQL load tests in WSL

Development uses PostgreSQL database `ecommerce`. Locust uses the separate
`ecommerce_loadtest` database through `config.loadtest`. The old
`config.loadtest_postgres` settings name remains a compatibility alias.

Load tests use isolated `media.loadtest/` uploads and a separate Redis key
prefix. The load-test middleware adds `X-Loadtest-Database: isolated`; workloads
check this marker before login or writes.

Current integration gaps: `CheckoutUser` does not yet send the required
`Idempotency-Key` header, so order creation returns HTTP 400 until the scenario
is updated. Search requests are now throttled and can return HTTP 429; the
current workload treats that as a failure. Cache isolation does not isolate
Celery: `config.loadtest` still inherits the development broker/default queue.
Configure dedicated queues or broker namespaces and matching workers/Beat before
running background tasks for the load-test database.

The current Windows PostgreSQL load-test records were migrated into WSL without
resetting stock, carts, or orders. The existing `loadtest_data.json` account
credentials and product IDs were preserved. A native PostgreSQL reset baseline
is kept at `ecommerce_backend/loadtest-postgres-baseline.dump`.

## Start the isolated backend

In an Ubuntu WSL terminal:

```bash
cd ~/projects/ecommerce_project/ecommerce_backend
source .venv/bin/activate
python manage.py migrate --settings=config.loadtest
python manage.py runserver 127.0.0.1:8001 --noreload --settings=config.loadtest
```

Development can continue on port 8000 while the isolated backend uses 8001.

## Run Locust

In another Ubuntu terminal:

```bash
cd ~/projects/ecommerce_project
source ecommerce_backend/.venv/bin/activate
locust -f locustfile.py --host http://127.0.0.1:8001
```

Open `http://localhost:8089`. Start with one user and a spawn rate of one.
Each authenticated simulated user gets a unique account from `loadtest_data.json`.
There are 100 prepared accounts. The pool refills for each new run and stops
excess users when it is exhausted.

| Class | Behavior |
| --- | --- |
| `CatalogUser` | Product list, search, detail, expanded delivery options |
| `CustomerUser` | Current user, expanded cart, totals, order list and detail |
| `CartUser` | Add, retrieve, PATCH, PUT, totals, DELETE |
| `CheckoutUser` | Add, totals, create order, retrieve order, cleared cart |
| `AuthSessionUser` | Current user, logout, CSRF, login |

Select one or more classes by adding their names:

```bash
locust -f locustfile.py CustomerUser CartUser CheckoutUser --host http://127.0.0.1:8001
```

Without class names, all five run with weights 5:3:1:1:1 in table order.
Product choices follow Gaussian weights over the saved product IDs; order
choices are uniform among the current customer's orders. Tasks wait 1–3 seconds
between flows. Requests within a flow execute sequentially without think time.
Failed requests are recorded and stop that user, so inspect both failures and
the active user count. These workloads do not make body-level business assertions.
Distributed workers need separate account files; the shared account pool supports
one Locust process.

## Reset or save a baseline

Stop the isolated Django server and Locust before resetting. From the project root:

```bash
source ecommerce_backend/.venv/bin/activate
python ecommerce_backend/setup_loadtest_postgres.py --reset
python ecommerce_backend/manage.py migrate --settings=config.loadtest
```

Reset restores only `ecommerce_loadtest`, including accounts/passwords, stock,
carts, and orders. It invalidates the isolated catalog/delivery cache entries.
Uploaded files are not reset. The helper refuses to operate on development.

To deliberately replace the baseline with the current load-test state:

```bash
python ecommerce_backend/setup_loadtest_postgres.py --save-baseline
```

`setup_loadtest_db.py` forwards to the same PostgreSQL helper for compatibility.
For an empty database without a baseline, running the helper without flags clones
development into the load-test database, sets stock to 1,000,000, copies media,
and saves a baseline. Existing tables or baselines prevent accidental initialization.

## Prepare more accounts

With Django and Locust stopped:

```bash
python ecommerce_backend/prepare_loadtest_users.py --users 200
```

This first resets the load-test database to its baseline, creates or updates
dedicated customers, writes fresh credentials to gitignored `loadtest_data.json`,
and saves the new PostgreSQL baseline. Development data is unaffected.
