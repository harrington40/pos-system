#!/usr/bin/env bash
#
# Production read-only discovery + baseline verification.
#
# This is the script a Jenkins (or any CI) job calls. It:
#
#   1. runs discovery/run_discovery.py against the configured API — read-only,
#      authenticated GET only — refreshing fixtures/production_discovery.json;
#   2. runs the pytest suite against the same API, where write/destructive tests
#      are skipped by conftest.py and everything else is a read;
#   3. writes a JUnit report the pipeline can archive.
#
# Required environment:
#   OPENRX_BASELINE_API_URL  API base URL including /api (falls back to OPENRX_API_URL)
#   OPENRX_API_TOKEN         Bearer token with read access
#
# Optional:
#   OPENRX_VENV        virtualenv to use/create        (default: <api-tests>/.venv)
#   OPENRX_JUNIT_XML   JUnit report path               (default: <api-tests>/pytest-results.xml)
#   OPENRX_HTML_REPORT HTML report path                (default: <api-tests>/html-report/pytest-report.html)
#   OPENRX_PYTEST_ARGS extra pytest arguments
#
# The `auth/` module is excluded: its login tests exercise the *seeded test
# database* accounts (admin/OpenRxTest123, pending.user, ...), which do not
# exist in production. Those run in the test-DB CI stage instead.
#
set -euo pipefail

HERE="$(cd "$(dirname "$0")/.." && pwd)"
API_URL="${OPENRX_BASELINE_API_URL:-${OPENRX_API_URL:-}}"
TOKEN="${OPENRX_API_TOKEN:-}"
VENV="${OPENRX_VENV:-$HERE/.venv}"
JUNIT="${OPENRX_JUNIT_XML:-$HERE/pytest-results.xml}"
HTML="${OPENRX_HTML_REPORT:-$HERE/html-report/pytest-report.html}"

if [ -z "$API_URL" ]; then
    echo "[baseline] set OPENRX_BASELINE_API_URL (or OPENRX_API_URL)" >&2
    exit 1
fi
if [ -z "$TOKEN" ]; then
    echo "[baseline] set OPENRX_API_TOKEN; without it every authenticated test skips" >&2
    exit 1
fi

# A throwaway virtualenv by default: many CI images ship an externally-managed
# system Python that refuses a plain `pip install`.
if [ ! -x "$VENV/bin/python" ]; then
    echo "[baseline] creating virtualenv at $VENV"
    python3 -m venv "$VENV"
    "$VENV/bin/python" -m pip install --quiet --upgrade pip
    "$VENV/bin/python" -m pip install --quiet -r "$HERE/requirements.txt"
fi

export OPENRX_API_URL="$API_URL"
export OPENRX_API_TOKEN="$TOKEN"

echo "[baseline] discovering fixtures from $API_URL (read-only)"
"$VENV/bin/python" "$HERE/discovery/run_discovery.py" --quiet --api-url "$API_URL" --token "$TOKEN"

echo "[baseline] verifying API behaviour against the discovered structure"
cd "$HERE"

# Self-contained HTML report for Jenkins' HTML Publisher (and as an artifact).
# Guarded: if pytest-html is missing the run still produces the JUnit XML.
mkdir -p "$(dirname "$HTML")"
HTML_ARGS=()
if "$VENV/bin/python" -c "import pytest_html" >/dev/null 2>&1; then
    HTML_ARGS=(--html="$HTML" --self-contained-html)
else
    echo "[baseline] pytest-html is not installed; skipping the HTML report"
fi

# Write/destructive tests are skipped by conftest.py, so this is read-only.
# `auth/` is excluded: it needs the seeded test-DB accounts (see the header).
# shellcheck disable=SC2086
"$VENV/bin/python" -m pytest -v \
    --junitxml="$JUNIT" \
    "${HTML_ARGS[@]+"${HTML_ARGS[@]}"}" \
    --ignore="$HERE/auth" ${OPENRX_PYTEST_ARGS:-}

echo "[baseline] JUnit report: $JUNIT"
if [ -f "$HTML" ]; then
    echo "[baseline] HTML report:  $HTML"
fi
