# Temporary Celery disablement — revert after load testing

> **Status: reverted at the user’s request.** The instructions and patches below
> are historical records; do not apply them again. Normal response/session caching,
> immediate catalog invalidation, and Celery publishing/recovery are restored.
> Validation: 35 Django tests and 12 Locust tests passed.

User requested on 2026-10-18: disable Celery for load testing, then remember the
changes because they will ask to revert them after the test. The pending revert
is the temporary Celery disablement from the most recent change, not the earlier
Locust/FastHttpUser, request-distribution, Gunicorn, database, or frontend work.
Do not perform the revert until the user requests it.

## Current behavior

- `config.settings.ORDER_CONFIRMATIONS_ENABLED = True` preserves development behavior.
- `config.loadtest` sets `ORDER_CONFIRMATIONS_ENABLED` from
  `LOADTEST_ENABLE_CELERY`, default `0` (disabled), and empties
  `CELERY_BEAT_SCHEDULE` when disabled. Capacity settings inherit this.
- Checkout's `_enqueue_order_confirmation()` returns without publishing while disabled.
- Both confirmation tasks return before database/mail/broker work while disabled.
- The load-test audit skips broker inspection while disabled and reports
  `confirmations_enabled: false` and `queued_tasks: null`.
- No load-test workers, Beat, or Gunicorn servers were running when checked.
  Development Celery Beat PID 59209 was left running. PIDs are historical; inspect
  live processes again before acting.
- Validation: 22 Django tests passed, including disabled confirmation execution
  and successful checkout without task publishing. Default-off and explicit-on
  load-test settings were checked.

## Quick re-enable without removing the feature flag

Set `LOADTEST_ENABLE_CELERY=1` on the API, worker, Beat, and audit command, then
restart the relevant processes. Use `DJANGO_SETTINGS_MODULE=config.loadtest`
(or `config.loadtest_capacity` for the API), dedicated broker `/3`, and queue
`ecommerce_loadtest`. The flag restores the inherited recovery schedule.

## Full reversal of this temporary change

Review current files first and preserve any subsequent user edits. Reverse only
these edits; do not restore entire files from Git, since most contain earlier work.

1. `ecommerce_backend/config/settings.py`: remove the newly added
   `ORDER_CONFIRMATIONS_ENABLED = True` setting.
2. `ecommerce_backend/config/loadtest.py`: remove the temporary block assigning
   `ORDER_CONFIRMATIONS_ENABLED` from `LOADTEST_ENABLE_CELERY` and conditionally
   replacing `CELERY_BEAT_SCHEDULE` with `{}`. Preserve dedicated Celery broker,
   queue, exchange, routing key, Beat filename, and dummy mail configuration.
3. `ecommerce_backend/orders_and_paymentsummary/views.py`: remove the early return
   from `_enqueue_order_confirmation()` that checks the setting; remove its new
   `from django.conf import settings` import only if otherwise unused.
4. `ecommerce_backend/orders_and_paymentsummary/tasks.py`: remove the early-return
   guards from `send_order_confirmation()` and `recover_order_confirmation()`.
   Keep the existing settings import used for `DEFAULT_FROM_EMAIL`.
5. `ecommerce_backend/orders_and_paymentsummary/tests.py`: remove
   `test_checkout_with_confirmations_disabled_still_commits_without_publishing`
   and its `override_settings` import if otherwise unused. Keep idempotency and
   replay tests introduced earlier.
6. `ecommerce_backend/config/test_loadtest.py`: remove
   `DisabledConfirmationTests` and the task-function import used by those tests.
   Preserve existing cleanup, audit, and archive-restore tests.
7. `ecommerce_backend/audit_loadtest.py`: restore unconditional inspection of the
   dedicated queue through `app.connection_for_read()`; remove the temporary
   `depth = None`/enabled conditional and `confirmations_enabled` output field.
   Preserve stock reconciliation, confirmation timing, and all other audit work.
8. `LOAD_TESTING.md`, `README.md`, and `ecommerce_backend/README.md`: remove the
   disabled-by-default/opt-in instructions and `LOADTEST_ENABLE_CELERY=1` command
   prefixes. Restore normal dedicated worker/Beat instructions and audit guidance.
9. Rerun Django tests with `--settings=config.test --noinput`, verify capacity
   settings and the load-test schedule, and restart relevant load-test processes
   if requested. Confirm task publishing is enabled again.

Orders created while disabled retain pending confirmation fields. Once enabled,
recovery may enqueue them. This note does not authorize deleting those orders,
purging unrelated queues, resetting databases, or changing development services.
