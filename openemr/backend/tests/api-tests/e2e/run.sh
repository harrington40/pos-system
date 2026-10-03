#!/usr/bin/env bash
#
# Run the full end-to-end API sweep. Every option is an environment variable —
# see README.md. Any extra arguments are passed through to pytest.
#
#   ./run.sh
#   OPENRX_E2E_DOMAINS=imaging ./run.sh
#   OPENRX_API_URL=https://openrx.transtechologies.com/api OPENRX_API_TOKEN=... ./run.sh
#
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_TESTS="$(cd "$HERE/.." && pwd)"

cd "$API_TESTS"

PYTHON="${PYTHON:-}"
if [[ -z "$PYTHON" ]]; then
    if [[ -x "$API_TESTS/.venv/bin/python" ]]; then
        PYTHON="$API_TESTS/.venv/bin/python"
    else
        PYTHON="python3"
    fi
fi

API_URL="${OPENRX_API_URL:-${OPENRX_BASELINE_API_URL:-http://localhost:3202/api}}"
echo "[e2e] python : $PYTHON"
echo "[e2e] api url: $API_URL"
echo "[e2e] token  : $([[ -n "${OPENRX_API_TOKEN:-}" ]] && echo set || echo 'not set (authenticated cases will skip)')"
echo "[e2e] domains: ${OPENRX_E2E_DOMAINS:-<all>}"

exec "$PYTHON" -m pytest e2e/ -q "$@"
