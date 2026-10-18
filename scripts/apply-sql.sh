#!/usr/bin/env bash
# Backup the database and apply new docs/sql files. Called by scripts/deploy.sh
# before the app restarts. Does not print DATABASE_URL.

set -euo pipefail

if [ -n "${APP_PATH:-}" ]; then
  cd "$APP_PATH"
else
  cd "$(dirname "$0")/.."
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Ошибка: node не найден в PATH. См. docs/deploy.md" >&2
  exit 1
fi

exec node ./scripts/apply-sql.mjs
