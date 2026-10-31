# PostgreSQL load tests in WSL

The default workload now matches checkout idempotency, Redis history/rankings,
search throttling, and asynchronous order confirmations. All commands below are
run from the project root unless a block explicitly changes directory.

## Resources and installation

Development uses database `ecommerce`. `config.loadtest` uses
`ecommerce_loadtest`, `media.loadtest/`, Redis cache database `/2` with a
`:loadtest` key prefix, and Celery broker database `/3` with queue
`ecommerce_loadtest`. `config.loadtest_postgres` is a compatibility alias.
`LOADTEST_REDIS_URL` and `LOADTEST_CELERY_BROKER_URL` can override Redis URLs;
`LOADTEST_DB_*` configures PostgreSQL. Keep these settings consistent for the
server, workers, Beat, preparation, reset, and audit commands.

Redis database numbers share server CPU/memory and eviction policy. These
namespaces isolate data and messages, not machine capacity. Do not run development
and load testing concurrently when collecting comparable capacity results.

```bash
source ecommerce_backend/.venv/bin/activate
python -m pip install -r ecommerce_backend/requirements-loadtest.txt
```

Gunicorn is used for capacity measurements on Linux/WSL. Locust's `FastHttpUser`
measures explicit HTTP requests; it does not render React or automatically fetch
images, JavaScript, or CSS. The faster client reduces generator CPU overhead.
It uses a separate cookie jar and CSRF header dictionary per simulated user,
merges checkout idempotency headers into each request, and uses ten-second
connection/network timeouts with automatic transport retries disabled.

## Prepare or restore data

Stop Locust, the isolated server, the load-test worker, and load-test Beat first.
Preparation restores the baseline, applies current migrations, clears only the
load-test Redis key namespace, and purges only its dedicated queue. Redis and the
broker must be available; cleanup fails instead of leaving stale checkout state.
It then prepares customers with unique credentials, empty carts, a saved default
delivery address, one historical order fixture each, and `@example.invalid`
emails, and saves a fresh baseline. Checkout sends each account's saved
`address_id`, so rerun this script if `loadtest_data.json` predates addresses.
Historical fixtures precede the saved stock baseline and do not enqueue mail:

```bash
python ecommerce_backend/prepare_loadtest_users.py --users 200
```

The gitignored `loadtest_data.json` is written with owner-only permissions.
Prepare enough accounts for all authenticated users created during a run; an
account is assigned once and is not returned on ramp-down. Each run refills the
pool. Never share accounts between active workers or classes.

To restore the prepared baseline between comparable runs:

```bash
python ecommerce_backend/setup_loadtest_postgres.py --reset
```

This replaces only the isolated database's public schema in a single restore
transaction, then reapplies migrations, including tables absent from older dumps.
It clears checkout responses,
search buckets, history, rankings, cached sessions, and caches in the isolated
namespace, plus pending messages in `ecommerce_loadtest`. Uploaded files and
Beat's local schedule file are not reset. Stopping workers is required: purging a
queue cannot cancel tasks already reserved by a worker.

To deliberately replace the baseline:

```bash
python ecommerce_backend/setup_loadtest_postgres.py --save-baseline
```

For initial setup only, if both destination tables and baseline are absent:

```bash
python ecommerce_backend/setup_loadtest_postgres.py
```

Initialization clones development into the isolated database, migrates, copies
media, and sets initial stock to 1,000,000 per product. Reset does not replenish
stock beyond whatever the saved baseline contains. `setup_loadtest_db.py` forwards
to the PostgreSQL helper for compatibility.

## Start services

For functional smoke testing only:

```bash
python ecommerce_backend/manage.py runserver 127.0.0.1:8001 --noreload --settings=config.loadtest
```

For capacity measurements, use a dedicated terminal:

```bash
ecommerce_backend/.venv/bin/gunicorn \
  --config ecommerce_backend/gunicorn.loadtest.conf.py config.wsgi:application
```

The Gunicorn configuration selects `config.loadtest_capacity`, binds port 8001,
and uses two `gthread` workers with four threads each. Capacity settings disable
DEBUG and reuse PostgreSQL connections for up to 60 seconds. Keep the worker/thread counts and
machine resources fixed across comparisons; tune them separately from the load
profile. API load tests do not need Gunicorn to serve media files.

Start the dedicated worker in another terminal with the same virtual environment:

```bash
cd ecommerce_backend
DJANGO_SETTINGS_MODULE=config.loadtest celery -A config worker \
  --queues=ecommerce_loadtest --concurrency=2 --loglevel=WARNING
```

Start exactly one load-test Beat scheduler in another terminal:

```bash
cd ecommerce_backend
DJANGO_SETTINGS_MODULE=config.loadtest celery -A config beat --loglevel=WARNING
```

These settings use a dummy mail backend: confirmations execute and record their
completion without external delivery or console output. To inspect messages in a
smoke test, set `LOADTEST_EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend`
on the worker. This measures job processing, not a real SMTP provider's latency.

## Default storefront workload

```bash
locust -f locustfile.py --host http://127.0.0.1:8001
```

Open `http://localhost:8089`. Start with one user and spawn rate one.

| Class | Weight | Behavior |
| --- | --- | --- |
| `CatalogUser` | 95 | Catalog, details, expanded delivery options, most-viewed |
| `CustomerUser` | 3 | Cart, totals, profile, orders/details, authenticated details and recent history |
| `CartUser` | 1 | Deterministic add/read/PATCH/PUT/totals/delete lifecycle |
| `CheckoutUser` | 1 | Clean cart, one-item purchase with a fresh key, verify order and empty cart |

Select classes explicitly for individual smoke tests:

```bash
locust -f locustfile.py CheckoutUser --host http://127.0.0.1:8001 \
  --headless -u 1 -r 1 -t 30s --stop-timeout 15
```

Startup checks `X-Loadtest-Database: isolated` before login or writes. Invalid
startup/login stops that user. Runtime failures are recorded and abort the
iteration while keeping the user alive. Cart mutations clean up after failed
iterations. Checkout retains an uncertain key across timeouts/5xx/409 and resolves
it before another purchase. Definitive client rejections permit a fresh attempt.
Do not interpret lower traffic caused by repeated failures as available capacity.

Response assertions check product identity, cart quantities, order contents and
totals, cleared carts, recent-history order/deduplication, and ranking list shape.
Checkout retry resolution and deliberate replay have separate statistics names.
Customer users seed a one-item cart once after login for meaningful read traffic.
Default workload tasks have zero think time (`constant(0)`) to measure capacity;
requests within a flow remain sequential. Explicit search scenarios retain their
own rate-aware wait times. Use a separate profile with think time when modeling
normal browsing behavior.
Class weights describe user proportions, not request proportions.

The default user mix is **95% catalog, 3% customer reads, 1% cart lifecycle,
and 1% checkout** (subject to rounding at small user counts). Within catalog
browsing, task probabilities are:

| Request | Share of catalog tasks |
| --- | --- |
| GET product list | 65% |
| GET individual product | 30% |
| GET delivery options | 3% |
| GET most-viewed products | 2% |

Multi-request cart/checkout flows mean HTTP shares differ from user weights.
With zero think time, task rates depend strongly on each flow's response times;
actual shares also depend on failures, user-count rounding, and startup. Use
Locust's actual request counts to measure the mix. Categorical request
types use these explicit weights; product popularity follows the bell curve.

## Explicit search, replay, and session scenarios

These classes live in a separate file so they never enter the default mix:

| Class | Purpose |
| --- | --- |
| `CheckoutReplayUser` | Purchase, replay identical key, assert same order ID/content |
| `GuestSearchUser` | Shared-IP token bucket, separate accepted/429 rows, check and respect Retry-After |
| `AuthSearchUser` | Successful searches, paced 13–17 seconds apart per account |
| `AuthSessionUser` | Repeated logout/CSRF/login with recovery after failed iterations |

```bash
locust -f locust_scenarios.py CheckoutReplayUser --host http://127.0.0.1:8001
locust -f locust_scenarios.py GuestSearchUser --host http://127.0.0.1:8001
```

Always select the intended classes when using `locust_scenarios.py`. Otherwise all
four participate. Guest search allows a burst of three and refills three/minute
per remote IP. A single local generator shares that bucket across guests.
Authenticated search allows a burst of five and refills five/minute per account.
The guest scenario marks a well-formed 429 as an expected outcome in its own row;
report rejection percentage as `throttled / (accepted + throttled)` instead of
claiming those responses are successful searches. Unexpected statuses and malformed
Retry-After values remain failures. Do not spoof forwarding headers to bypass the
limiter; the app uses REMOTE_ADDR.

## Measurement and audit

Before a run, capture stock and existing purchases using a new snapshot path:

```bash
python ecommerce_backend/audit_loadtest.py --capture --snapshot /tmp/loadtest-run-01.json
```

Ramp through 10, 25, 50, and 100 users with spawn rate 1–5 users/second. Hold each
level for at least ten minutes after warming up. Save p95/p99 per endpoint,
throughput, failure counts, active users, generator/server CPU, PostgreSQL lock
waits/connections, Redis memory/errors, and worker processing rates.

For example, one independently reproducible plateau:

```bash
locust -f locustfile.py --host http://127.0.0.1:8001 --headless \
  -u 25 -r 2 -t 12m --stop-timeout 15 \
  --csv /tmp/loadtest-25 --csv-full-history --html /tmp/loadtest-25.html
```

Run separate experiments for:

1. Cold catalog: reset the stopped environment, then start `CatalogUser` directly.
2. Warm catalog: warm up first and exclude warm-up from steady-state comparisons.
3. Expiry/rebuild: run `CatalogUser` for over six minutes to cross 300–360 second TTLs.
4. Write invalidation: run the default mix or select catalog plus checkout.
5. Hot inventory contention: use a separate data file containing one shared product
   ID, adequate stock, and unique accounts, then run checkout users.
6. Search admission, session churn, and checkout replay: run each explicitly.


After stopping HTTP traffic, allow the worker to drain, then verify:

```bash
python ecommerce_backend/audit_loadtest.py --verify --snapshot /tmp/loadtest-run-01.json
```

The audit exits nonzero if stock deductions differ from new order-item quantities,
products/orders disappeared, stock is negative, or new orders lack a unique
checkout record. It reports new orders, completed/pending confirmations, oldest
pending age, mean confirmation completion time, and queued messages. Queue depth excludes tasks already reserved or
executing; inspect worker logs/active tasks as well. A zero HTTP failure rate does
not prove the confirmation pipeline kept up. Do not reset between capture and
verification. Historical order/stock data is subtracted from the capture.

Product IDs are sorted into stable popularity ranks. Product selection uses a
discrete Gaussian centered on the middle rank, with standard deviation equal to
one sixth of the catalog size. For 42 products, roughly 68% of selections hit the
middle 14 products and roughly 95% hit the middle 28. Every product remains
reachable. The rank is synthetic popularity, independent of UUID meaning or real
sales. Detail/history requests and each new cart/checkout iteration sample this
same distribution. An unresolved checkout keeps its product and idempotency key
until resolved. Cumulative weights are cached to reduce generator overhead.

For distributed
Locust, set `LOADTEST_DATA_PATH` to a different file with disjoint account subsets
on every worker. Do not use `--processes` with the same account file: each process
would allocate the same accounts.

## Validation

```bash
python -m unittest loadtest_tests
python ecommerce_backend/manage.py check --settings=config.loadtest_capacity
python ecommerce_backend/manage.py test --settings=config.test --noinput
locust -f locustfile.py --list
locust -f locust_scenarios.py --list
```

The Django suite uses its temporary PostgreSQL database, a `:test` cache prefix,
eager Celery tasks, and an in-memory mail backend. It does not publish to the
development queue. Tests cover checkout header validation and both cached and
database-backed replay without double deduction. Load-generator unit tests cover
uncertain checkout recovery and cart cleanup. Full browser behavior, true parallel
checkout races, and real SMTP performance need separate testing.
