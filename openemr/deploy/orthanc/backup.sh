#!/usr/bin/env bash
# Consistent daily backup of the Orthanc SQLite index and DICOM storage.
# Installed at /opt/orthanc/bin/backup.sh and run by orthanc-backup.timer.
set -euo pipefail

ROOT="${ORTHANC_BACKUP_ROOT:-/var/backups/orthanc}"
INDEX="${ORTHANC_INDEX_FILE:-/var/lib/orthanc/index/index}"
STORAGE="${ORTHANC_STORAGE_DIR:-/var/lib/orthanc/storage}"
KEEP_DAYS="${ORTHANC_BACKUP_KEEP_DAYS:-14}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DEST="$ROOT/$STAMP"

install -d -m 0700 "$ROOT"
exec 9>"$ROOT/.backup.lock"
flock -n 9 || exit 0

test -f "$INDEX" || { logger -t orthanc-backup "index missing: $INDEX"; exit 1; }
rm -rf -- "$DEST"
install -d -m 0700 "$DEST"

# Orthanc opens SQLite with an exclusive lock. A consistent snapshot therefore
# requires a short service stop; the trap always brings it back, even on error.
WAS_ACTIVE=0
restore_orthanc() {
    if [[ "$WAS_ACTIVE" -eq 1 ]]; then
        systemctl start orthanc.service || logger -t orthanc-backup "FAILED to restart orthanc"
    fi
}
trap restore_orthanc EXIT
if systemctl is-active --quiet orthanc.service; then
    WAS_ACTIVE=1
    systemctl stop orthanc.service
fi

sqlite3 "$INDEX" ".backup '$DEST/index.sqlite'"
tar -C "$(dirname "$STORAGE")" -czf "$DEST/storage.tar.gz" "$(basename "$STORAGE")"
(
    cd "$DEST"
    sha256sum index.sqlite storage.tar.gz > SHA256SUMS
)
chmod 0600 "$DEST"/*

# Do not delete the newest backup even if retention is misconfigured.
find "$ROOT" -mindepth 1 -maxdepth 1 -type d -mtime "+$KEEP_DAYS" \
    ! -path "$DEST" -exec rm -rf -- {} +
logger -t orthanc-backup "backup complete: $DEST"
