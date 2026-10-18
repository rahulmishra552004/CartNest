# Revert the temporary five-second catalog refresh feature

> **Status: reverted at the user’s request.** The instructions and patches below
> are historical records; do not apply them again. Normal response/session caching,
> immediate catalog invalidation, and Celery publishing/recovery are restored.
> Validation: 35 Django tests and 12 Locust tests passed.

User explicitly requested remembering ALL files changed for the five-second
refresh point, and will ask for this feature to be reverted later. Recorded on
2026-10-18. Do not revert until the user requests it.

A narrowly scoped reverse patch is saved at
`notes/revert-catalog-refresh.patch`. It reverses this feature in nine files;
`git apply --check notes/revert-catalog-refresh.patch` succeeded when recorded.
The patch has NOT been applied. It is already a reverse patch: do not pass `-R`.
Recheck current changes and patch applicability before applying it in the future.
Preserve subsequent user edits; resolve context changes carefully rather than
restoring entire files from Git.

## All nine affected files

1. `ecommerce_backend/products/catalog_cache.py` — NEW module. Defines
   `CatalogState`, cache metadata/version/epoch keys, `read_catalog()`,
   `store_catalog()`, `invalidate_inventory()`, and hard `invalidate_products()`.
   Constants: list TTL 300 seconds, refresh interval 5 seconds, maximum outdated
   snapshot age 10 seconds. Remove this file when fully reverting the feature.
2. `ecommerce_backend/products/views.py` — imports the new helpers. `list()` now
   reads state with one MGET, coalesces inventory updates, serves bounded stale
   data while a refresh lock is busy, and stores body/metadata with original
   generation tags. The former local `invalidate_products()` was moved to the
   new module. Revert to the previous byte-caching list path using `cache.get()`
   and `cache.set()`, the existing lock/poll/fallback logic, and the original
   local hard invalidation function. KEEP rendered JSON caching for product
   list and details, canonical IDs, and detail history/ranking side effects.
3. `ecommerce_backend/orders_and_paymentsummary/views.py` — changed import from
   `products.views.invalidate_products` to
   `products.catalog_cache.invalidate_inventory`; checkout's post-commit callback
   uses the latter. Restore the original import/callback to hard-invalidate
   product list and affected details after every checkout. KEEP idempotency,
   transactions, row locks, order snapshots, and the temporary Celery-disable
   guards from the separate Celery task.
4. `ecommerce_backend/products/management/commands/import_catalog.py` — now calls
   shared `invalidate_products()` and separately clears delivery caches. Restore
   its original `cache.delete_many()` key list containing `products:list`, both
   delivery-option expansion keys, and all imported product-detail keys.
5. `ecommerce_backend/setup_loadtest_postgres.py` — its `invalidate_cache(ids)`
   now calls shared product invalidation, then clears delivery caches. Restore
   the former combined list/detail/delivery `cache.delete_many()` implementation.
   KEEP transactional archive restore, migrations, isolated runtime cleanup,
   account/baseline tooling, and development-database protection.
6. `ecommerce_backend/products/tests.py` — imports cache-state helpers; setup and
   cleanup cover metadata/version/epoch; list tests mock `read_catalog()` and
   `store_catalog()` instead of direct cache methods. Six tests were added:
   - `test_inventory_changes_coalesce_until_five_seconds_then_refresh`
   - `test_busy_refresh_uses_stale_data_but_never_extends_ten_second_deadline`
   - `test_vendor_edit_during_rebuild_prevents_reusing_old_generation`
   - `test_checkout_during_rebuild_keeps_original_version_tag`
   - `test_inventory_invalidation_forces_legacy_cache_to_upgrade`
   - `test_checkout_keeps_list_bytes_and_invalidates_product_details_after_commit`
   Remove these six tests and restore earlier cache mocks/cleanup. KEEP all
   rendered product-list/detail, legacy compatibility, tracking, error handling,
   canonical-ID, and vendor-invalidation regression tests.
7. `README.md` — documents inventory versions, separate vendor epochs, bounded
   staleness and generation coordination; updates the concurrent-fill limitation.
   Restore its earlier hard-invalidation explanation and limitation text.
8. `ecommerce_backend/README.md` — added a bullet describing five-second
   coalescing, ten-second stale snapshots, detail invalidation, and no Celery.
   Remove only this bullet.
9. `LOAD_TESTING.md` — added the paragraph explaining coalescing, staleness,
   stock validation, and restarting workers for the metadata protocol. Remove
   only that paragraph.

No database schema/migrations or stock records were changed for this feature.
The application files listed above are the complete feature change set; this
note and its reverse patch are bookkeeping artifacts.

## Runtime behavior and validation at recording

- Checkout retains list bytes, advances an inventory version, and expires details.
- An outdated snapshot younger than 5 seconds can be reused without rebuilding.
- A request holding the existing lock refreshes synchronously when eligible.
- Competitors may reuse outdated snapshots only while younger than 10 seconds;
  repeated checkouts do not extend snapshot age.
- An old snapshot already older than the window is not served stale, even if
  its inventory version changed only recently; lock polling/DB fallback applies.
- Vendor writes/imports hard-invalidate via a separate epoch. A build tagged
  before a concurrent invalidation cannot appear current afterward.
- PostgreSQL checkout stock checks/locks remain authoritative.
- Validation passed: 44 Django tests, 12 load-generator tests, Django system
  checks, and an actual Redis smoke check in a unique cleaned-up test namespace.

## Future revert procedure

1. Read this note, the separate Celery revert note, and current user instructions
   to establish the requested scope. This patch reverses ONLY catalog coalescing.
2. Stop the relevant API workers before changing the metadata protocol.
3. Run `git apply --check notes/revert-catalog-refresh.patch`. If it fails,
   inspect subsequent edits and reverse the listed changes manually. If it
   passes and scope still matches, apply with
   `git apply notes/revert-catalog-refresh.patch`.
4. Clear ONLY these logical keys in each affected environment's configured
   cache namespace: `products:list`, `products:list:metadata`,
   `products:inventory-version`, `products:catalog-epoch`. Use Django cache key
   names and the intended settings. Do not FLUSHDB/FLUSHALL, reset PostgreSQL,
   recreate users, or purge unrelated queues for this revert.
5. Run Django tests with `--settings=config.test --noinput`, the load-generator
   tests, system checks, and a diff check. The feature added six Django tests
   (38 -> 44 at implementation), but future test counts may differ.
6. Restart relevant API workers and verify checkout once again invalidates the
   product list immediately.

Preserve the earlier rendered-JSON caching for product list/details/delivery,
`config/cache_responses.py`, delivery-option tests, FastHttpUser, zero think time,
request weights/bell-curve sampling, Gunicorn configuration, persistent database
connections, frontend idempotency, and isolated database preparation. Temporary
Celery disablement has its OWN note: `notes/loadtest-celery-revert.md`.
