#!/usr/bin/env bash
#
# OpenRx local development against the remote OpenRx database.
#
# The remote MariaDB listens on 127.0.0.1:3306 only, so it cannot be reached
# directly. This script forwards a local port through SSH; backend/.env must use
# the same port (DB_HOST=127.0.0.1, DB_PORT=13306 by default).
#
# Usage:
#   ./scripts/remote-db-tunnel.sh
#   REMOTE_HOST=dev@example ./scripts/remote-db-tunnel.sh
#
set -euo pipefail

REMOTE_HOST="${REMOTE_HOST:-dev@94.250.201.58}"
REMOTE_PORT="${REMOTE_PORT:-3306}"
LOCAL_PORT="${LOCAL_PORT:-13306}"

if command -v nc >/dev/null 2>&1 && nc -z 127.0.0.1 "${LOCAL_PORT}" 2>/dev/null; then
    echo "Tunnel already listening on 127.0.0.1:${LOCAL_PORT}"
    exit 0
fi

ssh -f -N \
    -o ExitOnForwardFailure=yes \
    -o BatchMode=yes \
    -L "127.0.0.1:${LOCAL_PORT}:127.0.0.1:${REMOTE_PORT}" \
    "${REMOTE_HOST}"

echo "Tunnel started: 127.0.0.1:${LOCAL_PORT} -> ${REMOTE_HOST}:127.0.0.1:${REMOTE_PORT}"
