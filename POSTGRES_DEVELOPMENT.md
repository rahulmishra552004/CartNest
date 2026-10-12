# WSL development with PostgreSQL

The active project is `/home/rahul/projects/ecommerce_project` in Ubuntu WSL.
PostgreSQL 18 listens on `127.0.0.1:5432`; Redis listens on port 6379.

| Purpose | Settings | PostgreSQL database |
| --- | --- | --- |
| Development | `config.settings` | `ecommerce` |
| Locust workloads | `config.loadtest` | `ecommerce_loadtest` |
| Automated tests | `config.test` | temporary `test_ecommerce` |

All databases use the local `ecommerce_user` role. It has `CREATEDB` so Django
can create and destroy its automated test database; it is not a superuser.

## Start development

In an Ubuntu terminal:

```bash
cd ~/projects/ecommerce_project/ecommerce_backend
source .venv/bin/activate
python manage.py migrate
python manage.py runserver
```

In another Ubuntu terminal:

```bash
cd ~/projects/ecommerce_project/ecommerce_frontend
npm run dev
```

Open `http://localhost:5173`. If services have stopped, start them with
`sudo service postgresql start` and `sudo service redis-server start`.

## Configuration

`config/database.py` reads `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, and
`DB_PORT`. Defaults are `ecommerce`, `ecommerce_user`, `127.0.0.1`, and `5432`.
The default password comes from gitignored `ecommerce_backend/.db-password`.

Load tests use `LOADTEST_DB_NAME` (default `ecommerce_loadtest`) and optional
`LOADTEST_DB_USER`, `LOADTEST_DB_PASSWORD`, `LOADTEST_DB_HOST`, and
`LOADTEST_DB_PORT`. The load-test password file is `.loadtest-db-password`, with
`.db-password` as a fallback. Load-test settings reject the development database
name and use a separate Redis prefix and `media.loadtest/`.

## Automated tests

```bash
cd ~/projects/ecommerce_project/ecommerce_backend
source .venv/bin/activate
python manage.py test --settings=config.test
```

Django creates `test_ecommerce`, applies migrations, and removes it when the
tests finish. This configuration uses a local in-memory cache. The default
database backend is PostgreSQL even when running tests without this settings
override; the override also isolates the cache from development Redis.

## Migrated data

On 2026-10-12, all 56 development model records were transferred from SQLite and
compared with their source values. The Windows PostgreSQL load-test database
was restored into WSL, with every row verified across all 16 tables. That
includes 105 users, 42 products, 186 cart rows, 2,439 orders, and 2,463 order items.
Passwords, ownership, inventory, sessions, and product snapshots were preserved.

The existing PostgreSQL load-test reset baseline remains available. See
[LOAD_TESTING.md](LOAD_TESTING.md) for isolated workloads and reset commands.
