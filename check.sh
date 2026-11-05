#!/usr/bin/env bash
# Runs every check in Docker. The same script runs locally and in CI.
# Usage: ./check.sh

set -e                  # stop at the first command that fails
cd "$(dirname "$0")"    # go to the repo root, wherever the script is called from

echo "==> Backend tests"
docker compose run --rm backend python manage.py test --settings=config.test --noinput

echo "==> Missing migrations"
docker compose run --rm backend python manage.py makemigrations --check --dry-run

echo "==> Frontend lint"
docker compose run --rm --no-deps frontend npm run lint

echo "==> Frontend build"
docker compose run --rm --no-deps frontend npm run build -- --outDir /tmp/dist --emptyOutDir

echo "All checks passed."

