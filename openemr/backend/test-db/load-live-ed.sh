#!/usr/bin/env bash
#
# Load the 50-patient emergency-department set into the LIVE dev database that
# the running app uses (backend/.env → MySQL, the DB the UI talks to via /api).
#
# Safe for a populated database: the loader uses pids 900001+ and never
# overwrites an existing patient. See live-ed-load.sql for details and the
# matching cleanup statements.
#
# Usage:
#   bash ./backend/test-db/load-live-ed.sh
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"   # backend/test-db
ENV_FILE="$SCRIPT_DIR/../.env"

if [[ ! -f "$ENV_FILE" ]]; then
    echo "[load-live-ed] missing $ENV_FILE" >&2
    exit 1
fi

envval() { grep -E "^$1=" "$ENV_FILE" | tail -1 | cut -d= -f2-; }

DB_HOST="$(envval DB_HOST)"
DB_PORT="$(envval DB_PORT)"
DB_USERNAME="$(envval DB_USERNAME)"
DB_PASSWORD="$(envval DB_PASSWORD)"
DB_DATABASE="$(envval DB_DATABASE)"

echo "[load-live-ed] target: mysql://$DB_USERNAME@$DB_HOST:$DB_PORT/$DB_DATABASE"
node "$SCRIPT_DIR/run-sql.mjs" \
    --host "$DB_HOST" --port "$DB_PORT" \
    --user "$DB_USERNAME" --password "$DB_PASSWORD" \
    --database "$DB_DATABASE" \
    --file "$SCRIPT_DIR/live-ed-load.sql"
echo "[load-live-ed] done — 50 ED patients (pids 900001..900050) are now visible to the app"
