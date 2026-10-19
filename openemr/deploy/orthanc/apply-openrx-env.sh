#!/usr/bin/env bash
#
# Run on the OpenRx application server after deploying the backend.
# Sets the Orthanc bridge environment without printing the password.
#
#   ORTHANC_PASSWORD='...' bash apply-openrx-env.sh
#
set -euo pipefail

ENV_FILE="${OPENRX_ENV_FILE:-/home/dev/openrx/backend/.env}"
: "${ORTHANC_PASSWORD:?set ORTHANC_PASSWORD in the environment}"
test -f "$ENV_FILE" || { echo "Missing $ENV_FILE" >&2; exit 1; }

TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT
grep -vE '^ORTHANC_(URL|USERNAME|PASSWORD|TIMEOUT_MS|DICOMWEB_ENABLED)=' "$ENV_FILE" > "$TMP"
cat >> "$TMP" <<EOF
ORTHANC_URL=https://vmi3393532.contaboserver.net/orthanc
ORTHANC_USERNAME=openrx
ORTHANC_PASSWORD=${ORTHANC_PASSWORD}
ORTHANC_TIMEOUT_MS=15000
ORTHANC_DICOMWEB_ENABLED=true
EOF
cat "$TMP" > "$ENV_FILE"
chmod 0600 "$ENV_FILE"

pm2 restart openrx-backend
pm2 save
echo "Orthanc bridge environment applied; openrx-backend restarted."
