#!/usr/bin/env bash
#
# Stroke frontend deployment to the Contabo 185 host.
#
# This target serves the SPA at https://vmi3393532.contaboserver.net and proxies
# /api and /messaging to the live OpenRx service. It does not deploy a backend or
# create a local database on 185.
#
# Usage:
#   ./deploy-stroke-185.sh                 # build + deploy frontend
#   ./deploy-stroke-185.sh --skip-build    # deploy existing public/dist
#   ./deploy-stroke-185.sh --dry-run
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

export OPENRX_SERVER="${OPENRX_SERVER:-dev@185.193.17.10}"
export OPENRX_REMOTE_DIR="${OPENRX_REMOTE_DIR:-/var/www/openrx-stroke}"
export OPENRX_SITE_URL="${OPENRX_SITE_URL:-https://vmi3393532.contaboserver.net}"

exec "$SCRIPT_DIR/deploy-local.sh" --frontend "$@"
