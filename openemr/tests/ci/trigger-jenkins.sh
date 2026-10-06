#!/usr/bin/env bash
#
# Trigger the OpenRx tests Jenkins job with parameters (RUN_JS_TESTS by
# default), so a build runs the Jest/Vitest stage and the reliability report.
#
# Usage:
#   JENKINS_URL=https://jenkins.example.com \
#   JENKINS_JOB=openrx-tests \
#   JENKINS_USER=harrington JENKINS_TOKEN=11a2b3c4... \
#   bash tests/ci/trigger-jenkins.sh
#
# Job inside folders works too: JENKINS_JOB="team/openrx-tests".
#
# Flags (override the environment):
#   --js / --no-js              run (default) the Jest/Vitest stage, RUN_JS_TESTS
#   --ui                        also run the Playwright sweep (needs a base URL)
#   --ui-base-url URL           SPA origin for the UI sweep
#   -h, --help                  show this help
#
# Example with the UI sweep:
#   JENKINS_URL=... JENKINS_JOB=... \
#       bash tests/ci/trigger-jenkins.sh --ui --ui-base-url https://openrx.transtechologies.com
#
# Optional environment knobs:
#   RUN_JS_TESTS=true|false     default: true   (matches the pipeline default)
#   RUN_UI_TESTS=true           default: unset  (opt into the Playwright sweep)
#   UI_BASE_URL=https://...     required only when RUN_UI_TESTS=true
#   JENKINS_TOKEN               a Jenkins API token (User > Configure > API Token).
#                               Without JENKINS_USER/JENKINS_TOKEN it is assumed
#                               the endpoint needs no auth (e.g. behind a proxy).
#
set -euo pipefail

JENKINS_URL="${JENKINS_URL:-}"
JENKINS_JOB="${JENKINS_JOB:-}"
JENKINS_USER="${JENKINS_USER:-}"
JENKINS_TOKEN="${JENKINS_TOKEN:-}"
RUN_JS_TESTS="${RUN_JS_TESTS:-true}"
RUN_UI_TESTS="${RUN_UI_TESTS:-}"
UI_BASE_URL="${UI_BASE_URL:-}"

# --- CLI flags (override the environment defaults above) --------------------
while [[ $# -gt 0 ]]; do
    case "$1" in
        --js)             RUN_JS_TESTS=true; shift ;;
        --no-js)          RUN_JS_TESTS=false; shift ;;
        --ui)             RUN_UI_TESTS=true; shift ;;
        --no-ui)          RUN_UI_TESTS=false; shift ;;
        --ui-base-url)    UI_BASE_URL="${2:?--ui-base-url needs a value}"; shift 2 ;;
        --ui-base-url=*)  UI_BASE_URL="${1#*=}"; shift ;;
        -h|--help)        awk 'NR==1{next} /^set -euo/{exit} {sub(/^# ?/,""); print}' "$0"; exit 0 ;;
        *) echo "error: unknown option: $1 (try --help)" >&2; exit 2 ;;
    esac
done

if [[ -z "$JENKINS_URL" || -z "$JENKINS_JOB" ]]; then
    echo "error: set JENKINS_URL and JENKINS_JOB (see header)." >&2
    exit 2
fi

if [[ "$RUN_UI_TESTS" == "true" && -z "$UI_BASE_URL" ]]; then
    echo "error: --ui / RUN_UI_TESTS=true needs UI_BASE_URL (--ui-base-url)." >&2
    exit 2
fi

# --- Build the job URL, expanding folder separators -------------------------
JENKINS_URL="${JENKINS_URL%/}"
JOB_PATH="${JENKINS_JOB#/}"
JOB_PATH="${JOB_PATH%/}"
JOB_PATH="${JOB_PATH//\//\/job\/}"
BASE="$JENKINS_URL/job/$JOB_PATH"

# --- Query string -----------------------------------------------------------
ARGS="RUN_JS_TESTS=${RUN_JS_TESTS:-true}"
if [[ -n "${RUN_UI_TESTS:-}" ]]; then
    ARGS="$ARGS&RUN_UI_TESTS=$RUN_UI_TESTS"
fi
if [[ -n "${UI_BASE_URL:-}" ]]; then
    # URL-encode the value (':' and '/' are the only risky characters here).
    enc="${UI_BASE_URL//:/%3A}"; enc="${enc//\//%2F}"
    ARGS="$ARGS&UI_BASE_URL=$enc"
fi

# --- Auth + CSRF crumb ------------------------------------------------------
AUTH=()
if [[ -n "$JENKINS_USER" || -n "$JENKINS_TOKEN" ]]; then
    : "${JENKINS_USER:?set JENKINS_USER alongside JENKINS_TOKEN}"
    : "${JENKINS_TOKEN:?set JENKINS_TOKEN alongside JENKINS_USER}"
    AUTH=(--user "$JENKINS_USER:$JENKINS_TOKEN")
fi

CRUMB_HEADER=()
crumb_json="$(curl -fsS "${AUTH[@]}" "$JENKINS_URL/crumbIssuer/api/json" 2>/dev/null || true)"
if [[ -n "$crumb_json" ]]; then
    field="$(printf '%s' "$crumb_json" | sed -n 's/.*"crumbRequestField":"\([^"]*\)".*/\1/p')"
    value="$(printf '%s' "$crumb_json" | sed -n 's/.*"crumb":"\([^"]*\)".*/\1/p')"
    if [[ -n "$field" && -n "$value" ]]; then
        CRUMB_HEADER=(-H "$field: $value")
    fi
fi

# --- Trigger -----------------------------------------------------------------
echo "[jenkins] POST $BASE/buildWithParameters?$ARGS"
http_code="$(curl -sS -o /dev/null -w '%{http_code}' -X POST \
    "${AUTH[@]}" "${CRUMB_HEADER[@]}" \
    "$BASE/buildWithParameters?$ARGS")"

case "$http_code" in
    200|201|302)
        echo "[jenkins] queued (HTTP $http_code) — watch $BASE/" ;;
    403)
        echo "[jenkins] HTTP 403 — check the API token, its permissions, and the" >&2
        echo "          CSRF crumb. See the header of this script." >&2
        exit 1 ;;
    404)
        echo "[jenkins] HTTP 404 — job '$JENKINS_JOB' not found under $JENKINS_URL" >&2
        exit 1 ;;
    *)
        echo "[jenkins] unexpected HTTP $http_code" >&2
        exit 1 ;;
esac
