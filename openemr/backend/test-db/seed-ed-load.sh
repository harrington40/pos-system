#!/usr/bin/env bash
#
# Apply the 50-patient emergency-department load to the test database.
#
# Runs ed-load-seed.sql (patient_data + form_vitals + patient_care_assignment +
# emergency_visits for pids 10..59). It depends on the ward/ED tables the
# backend creates on boot and on the demo clinicians in seed.sql, so set the
# database up first:
#
#   bash ./backend/test-db/setup-test-db.sh
#   bash ./backend/test-db/run-backend-against-test-db.sh   # Ctrl-C once it is up
#   bash ./backend/test-db/seed-ed-load.sh                  # 50 ED patients
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

echo "[seed-ed-load] applying ed-load-seed.sql to $TEST_DB_NAME"
node "$SCRIPT_DIR/run-sql.mjs" "${TARGET[@]}" \
    --user "$TEST_DB_USER" --password "$TEST_DB_PASSWORD" \
    --database "$TEST_DB_NAME" --file "$SCRIPT_DIR/ed-load-seed.sql"
echo "[seed-ed-load] done — 50 ED patients are now on the nurse + provider dashboards"
