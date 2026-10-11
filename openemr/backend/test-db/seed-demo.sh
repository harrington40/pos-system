#!/usr/bin/env bash
#
# Apply the OpenRx demo emergency workload to the test database.
#
# Runs demo-seed.sql (emergency_visits, emergency_reassessments,
# patient_care_assignment). Those tables are created by the backend on boot, so
# boot the backend against the test database at least once first:
#
#   bash ./backend/test-db/setup-test-db.sh
#   bash ./backend/test-db/run-backend-against-test-db.sh   # Ctrl-C once it is up
#   bash ./backend/test-db/seed-demo.sh
#
# Environment overrides match setup-test-db.sh:
#   DB_HOST DB_PORT DB_SOCKET TEST_DB_NAME TEST_DB_USER TEST_DB_PASSWORD
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-3306}"
DB_SOCKET="${DB_SOCKET:-}"
TEST_DB_NAME="${TEST_DB_NAME:-openrx_test}"
TEST_DB_USER="${TEST_DB_USER:-openrx_test}"
TEST_DB_PASSWORD="${TEST_DB_PASSWORD:-openrx_test}"

if [[ -n "$DB_SOCKET" ]]; then
    TARGET=(--socket "$DB_SOCKET")
else
    TARGET=(--host "$DB_HOST" --port "$DB_PORT")
fi

echo "[seed-demo] applying demo-seed.sql to $TEST_DB_NAME"
node "$SCRIPT_DIR/run-sql.mjs" "${TARGET[@]}" \
    --user "$TEST_DB_USER" --password "$TEST_DB_PASSWORD" \
    --database "$TEST_DB_NAME" --file "$SCRIPT_DIR/demo-seed.sql"
echo "[seed-demo] done — log in as dr.chan / rn.nurse / rn.charge (OpenRxTest123)"
