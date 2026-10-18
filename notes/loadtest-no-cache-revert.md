# Temporary load-test no-cache mode — reversal record

> **Status: reverted at the user’s request.** The instructions and patches below
> are historical records; do not apply them again. Normal response/session caching,
> immediate catalog invalidation, and Celery publishing/recovery are restored.
> Validation: 35 Django tests and 12 Locust tests passed.

Requested on 2026-10-18: disable caching completely for the load test and remember
all changes for a future revert. The user explicitly clarified the scope:
**disable all response/session caches; keep Redis history/rankings enabled**.
Do not reverse this change until requested.

## Current behavior

- Development settings retain caching (`API_CACHING_ENABLED = True`).
- `config.loadtest` and `config.loadtest_capacity` default to
  `API_CACHING_ENABLED = False`, Django `DummyCache`, and database-only sessions.
- `LOADTEST_ENABLE_CACHE=1` opts load-test processes back into the previous Redis
  response caches and cached database sessions; cleanup is required first (below).
- Product-list requests query PostgreSQL without reading catalog metadata,
  acquiring a Redis cache lock, or using five-second refresh coalescing.
- Product-detail, normal/expanded delivery-option, and checkout response caches
  are bypassed for reads and writes.
- Cache invalidations and cache-lock helpers do no work in this mode.
- PostgreSQL checkout idempotency, transactions, stock locks/deduction, and order
  snapshots remain active. Same-key replay resolves through the database.
- Redis-backed history and rankings still read/write normally, using the same
  load-test namespace. Redis still needs to run.
- The user's commented-out search throttle and temporary Celery disablement
  were preserved. This feature does not re-enable either.
- Load-test responses report `X-Loadtest-Caching: disabled` (or `enabled`).
- Existing Redis entries were not flushed, modified for migration, or deleted
  merely to disable caches. Database records and schema were not reset.
- Restart ALL API workers before measuring the no-cache workload; do not mix
  old cached workers and new no-cache workers in one measurement.

## Exact reverse patch

`notes/revert-loadtest-no-cache.patch` reverses only this feature. It is already
written in the undo direction; use `git apply`, NOT `git apply -R`.

The patch was checked with `git apply --check` against the real project without
applying it. A disposable copy under `/tmp` was also used to apply this reverse
patch and then check `notes/revert-catalog-refresh.patch`. Both succeeded. No
application files in the actual project were reverted during that verification.

## All 12 affected application/documentation files

1. `ecommerce_backend/config/settings.py`: added `API_CACHING_ENABLED = True`.
2. `ecommerce_backend/config/loadtest.py`: added `LOADTEST_ENABLE_CACHE` parsing,
   disabled-by-default load-test flag, DummyCache selection, removal of Redis
   cache pool options from the dummy backend, and PostgreSQL session selection.
3. `ecommerce_backend/config/loadtest_middleware.py`: imports settings and adds
   `X-Loadtest-Caching` to responses.
4. `ecommerce_backend/products/views.py`: list short-circuits to the database;
   detail cache reads/writes honor the flag. Detail history/rankings remain active.
5. `ecommerce_backend/products/catalog_cache.py`: early-return guards disable
   inventory/product cache invalidation while caching is off. Earlier five-second
   generation/coalescing code remains intact for later restoration.
6. `ecommerce_backend/products/cache_locks.py`: acquire/release return without
   touching Redis when caching is disabled.
7. `ecommerce_backend/deliveryoptions/views.py`: bypasses both response variants'
   caches and returns database-backed serialized results.
8. `ecommerce_backend/orders_and_paymentsummary/views.py`: bypasses response-cache
   reads/writes while retaining database idempotency. `_cache_checkout_response`
   also has a no-op guard. Existing Celery guard is unchanged.
9. `ecommerce_backend/config/test_no_cache.py`: NEW regression-test module with
   six no-cache tests. A full source revert deletes this file.
10. `LOAD_TESTING.md`: documents the temporary mode, header, preserved Redis data
    features, restart/cleanup steps, and that cache-specific experiments require
    explicitly re-enabling caches.
11. `README.md`: documents load-test caching/session disablement and its scope.
12. `ecommerce_backend/README.md`: same scope clarification in backend setup docs.

This note and its reverse patch are bookkeeping artifacts, not runtime changes.
The unchanged Locust files, product tracking modules, serializers, and tests for
existing rendered caching are not part of the reverse patch.

## Validation

- 50 Django tests passed (44 earlier tests plus six no-cache tests).
- Repeated catalog/detail/delivery requests query PostgreSQL and show direct
  database changes immediately; mocks fail the tests if response caches or
  catalog locks are accessed.
- Real CSRF/login/logout with PostgreSQL sessions passed.
- Checkout replay without cache access created one order and deducted stock once.
- Both default-off and explicit-on settings were checked in separate processes.
- A temporary Gunicorn API and FastHttpUser smoke test completed 20 HTTP requests
  with zero failures: disabled-cache marker, rotated CSRF, cookies/login/logout,
  search/expansion, and preserved Redis history/ranking behavior.
- The temporary smoke server was terminated after validation.

## Revert/re-enable procedure

1. Inspect current user instructions and edits. Stop relevant API workers before
   switching session/cache protocols. Do not reset the database unless requested.
2. Before bringing cached workers back, clear stale response and cached-session
   entries ONLY from the intended environment's isolated cache namespace.
   No-cache writes deliberately skipped invalidation, and a database-session
   logout does not remove a pre-existing Redis cached-session entry. Reusing
   those entries can expose stale data or resurrect an old session.
3. Use the actual configured Redis URL and `cache.make_key('')` namespace prefix.
   A Redis SCAN can select that prefix, then restrict deletion to logical names:
   - `products:` (list bytes, metadata, versions/epochs, and product details)
   - `delivery-options:`
   - `checkout-result:`
   - the prefix from
     `django.contrib.sessions.backends.cached_db.SessionStore.cache_key_prefix`
   Preserve `recently-viewed:`, `most-viewed:`, and `rate-limit:` keys. Do not use
   FLUSHDB/FLUSHALL and do not purge queues for this revert. If necessary, remove
   the isolated `lock:products:list` key only with all related workers stopped;
   otherwise its existing ten-second expiry suffices.
4. For a full code revert, run:
   `git apply --check notes/revert-loadtest-no-cache.patch`, then apply it if
   scope still matches. If subsequent edits conflict, reverse the listed hunks
   carefully rather than restoring entire files from Git. Alternatively, opt in
   with `LOADTEST_ENABLE_CACHE=1` after the same cleanup to retain the toggle.
5. Run Django tests, load-generator tests, capacity system checks, and diff check.
6. Restart the API in the intended mode and confirm the caching header if the
   toggle remains installed (the full patch removes that extra header).

## Reverting multiple temporary changes

For the earlier five-second refresh feature, first revert this no-cache layer,
then follow `notes/catalog-refresh-revert.md` and its patch. That order was
verified in a disposable copy. Preserve rendered-JSON caching and the earlier
load-testing improvements unless explicitly asked to revert them as well.
Celery has a separate record: `notes/loadtest-celery-revert.md`.
