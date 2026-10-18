#!/usr/bin/env bash
# Disposable-database rehearsal for the Stroke Care up/down/up migration path.
#
# NEVER point this at a clinical database. It refuses the names "openemr",
# "prod" and "production" and requires an explicit opt-in.
#
# Required:
#   DB_HOST DB_PORT DB_USERNAME DB_PASSWORD
#   STROKE_REHEARSAL_DATABASE   dedicated disposable schema
#   ALLOW_STROKE_ROLLBACK_REHEARSAL=true
set -euo pipefail

DB="${STROKE_REHEARSAL_DATABASE:?set STROKE_REHEARSAL_DATABASE to a disposable schema}"
case "${DB,,}" in
    openemr|prod|production)
        echo "Refusing to rehearse against '$DB'. Use a disposable schema." >&2
        exit 2 ;;
esac
[ "${ALLOW_STROKE_ROLLBACK_REHEARSAL:-}" = "true" ] || {
    echo "Set ALLOW_STROKE_ROLLBACK_REHEARSAL=true to confirm this is disposable." >&2
    exit 2
}

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
UP="$ROOT/backend/migrations/2026-10-17-stroke-care.sql"
DOWN="$ROOT/backend/migrations/2026-10-18-stroke-care-modules-d-h-down.sql"
MYSQL=(mysql --protocol=TCP -h "${DB_HOST:?}" -P "${DB_PORT:?}" -u "${DB_USERNAME:?}" "-p${DB_PASSWORD:?}" "$DB")

run() {
    echo "[rehearsal] $1"
    "${MYSQL[@]}" < "$2"
}

count_stroke_tables() {
    "${MYSQL[@]}" -N -e "SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME LIKE 'stroke_%';"
}

run "apply additive migration" "$UP"
UP_COUNT="$(count_stroke_tables)"
echo "[rehearsal] stroke tables after up: $UP_COUNT"

run "apply D–H rollback" "$DOWN"
DOWN_COUNT="$(count_stroke_tables)"
echo "[rehearsal] stroke tables after down: $DOWN_COUNT"

run "re-apply additive migration" "$UP"
RESTORED_COUNT="$(count_stroke_tables)"
echo "[rehearsal] stroke tables after re-up: $RESTORED_COUNT"

[ "$UP_COUNT" = "$RESTORED_COUNT" ] || {
    echo "[rehearsal] FAILED: table count was not restored" >&2
    exit 1
}
echo "[rehearsal] PASS"
