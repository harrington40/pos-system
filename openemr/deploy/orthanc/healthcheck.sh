#!/usr/bin/env bash
# Orthanc health check, installed at /opt/orthanc/bin/healthcheck.sh.
set -euo pipefail

if pgrep -f '/opt/orthanc/bin/backup.sh' >/dev/null 2>&1; then
    logger -t orthanc-health "SKIP: backup in progress"
    exit 0
fi

BASE="${ORTHANC_HEALTH_URL:-http://127.0.0.1:8042}"
CREDS="${ORTHANC_CREDENTIALS_FILE:-/root/orthanc-credentials.txt}"
MIN_FREE_PERCENT="${ORTHANC_MIN_FREE_PERCENT:-10}"
WEBHOOK="${ORTHANC_ALERT_WEBHOOK:-}"
FAILURE=""

if ! systemctl is-active --quiet orthanc; then
    FAILURE="orthanc service is not active"
fi

if command -v ss >/dev/null && ! ss -lnt | grep -q ':4242 '; then
    FAILURE="${FAILURE:+$FAILURE; }DICOM port 4242 is not listening"
fi

USERNAME="$(awk '/Username:/{print $2}' "$CREDS" 2>/dev/null || true)"
PASSWORD="$(awk '/Password:/{print $2}' "$CREDS" 2>/dev/null || true)"
if [[ -z "$USERNAME" || -z "$PASSWORD" ]]; then
    FAILURE="${FAILURE:+$FAILURE; }credentials file is unreadable"
else
    HTTP="$(curl -sS -u "$USERNAME:$PASSWORD" -o /dev/null \
        -w '%{http_code}' --max-time 10 "$BASE/system" 2>/dev/null || echo 000)"
    DICOMWEB="$(curl -sS -u "$USERNAME:$PASSWORD" -o /dev/null \
        -w '%{http_code}' --max-time 10 "$BASE/dicom-web/studies?limit=1" 2>/dev/null || echo 000)"
    [[ "$HTTP" == "200" ]] || FAILURE="${FAILURE:+$FAILURE; }HTTP /system=$HTTP"
    [[ "$DICOMWEB" == "200" ]] || FAILURE="${FAILURE:+$FAILURE; }DICOMweb=$DICOMWEB"
fi

FREE_PERCENT="$(df -P /var/lib/orthanc | awk 'NR==2 {gsub(/%/,"",$5); print 100-$5}')"
if [[ -n "$FREE_PERCENT" && "$FREE_PERCENT" -lt "$MIN_FREE_PERCENT" ]]; then
    FAILURE="${FAILURE:+$FAILURE; }disk free ${FREE_PERCENT}% below ${MIN_FREE_PERCENT}%"
fi

if [[ -n "$FAILURE" ]]; then
    logger -t orthanc-health "FAIL: $FAILURE"
    if [[ -n "$WEBHOOK" ]]; then
        curl -sS -X POST -H 'Content-Type: application/json' \
            -d "{\"service\":\"orthanc\",\"status\":\"failed\",\"error\":\"$FAILURE\"}" \
            --max-time 10 "$WEBHOOK" >/dev/null || true
    fi
    exit 1
fi

logger -t orthanc-health "OK: service, DICOM, HTTP, DICOMweb; disk free ${FREE_PERCENT}%"
