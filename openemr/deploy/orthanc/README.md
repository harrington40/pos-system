# Orthanc DICOMweb integration

Orthanc runs on `185.193.17.10` as `orthanc.service`. The OpenRx backend reaches
it through an authenticated, allowlisted Nginx path; Orthanc credentials never
reach the browser.

## Endpoints

| Endpoint | Purpose |
|---|---|
| `http://127.0.0.1:8042` | Orthanc HTTP, localhost only |
| `https://vmi3393532.contaboserver.net/orthanc/` | TLS bridge; allowed only from `127.0.0.1` and `94.250.201.58` |
| `185.193.17.10:4242` | DICOM; UFW allows only the OpenRx application/operations hosts |

Orthanc's public port 8042 and DICOM port 4242 is **not** exposed to the internet.

## OpenRx backend environment

Set these on the application server, then restart `openrx-backend`:

```dotenv
ORTHANC_URL=https://vmi3393532.contaboserver.net/orthanc
ORTHANC_USERNAME=openrx
ORTHANC_PASSWORD=<from /root/orthanc-credentials.txt on 185>
ORTHANC_TIMEOUT_MS=15000
ORTHANC_DICOMWEB_ENABLED=true
```

The password must stay in the server environment and must not be committed or
included in the frontend bundle. Once the application server is reachable, use:

```bash
ORTHANC_PASSWORD='<server-only secret>' bash deploy/orthanc/apply-openrx-env.sh
```

The OpenRx endpoints are:

- `GET /api/imaging/orthanc/status`
- `GET /api/imaging/orthanc/studies?patientId=<pid>`
- `GET /api/imaging/orthanc/studies/:study/series/:series/instances/:instance/file`

They require a staff JWT and the same roles as the existing imaging endpoints.
The viewer merges PACS instances with B2-backed imaging rows and marks PACS rows
with a `PACS` badge.

## DICOM AETs

Configured in `/etc/orthanc/orthanc.json`:

```text
OPENRX_APP   OpenRx application server
OPENRX_XRAY  X-ray modality placeholder
```

The X-ray modality must use the `OPENRX_XRAY` calling AET. Its real source IP is
not yet known: replace the loopback placeholder in `DicomModalities` and add the
device CIDR before enabling that device:

```bash
ufw allow from <xray-device-cidr> to any port 4242 proto tcp
```

No broad `4242/tcp` rule is permitted. Use `ufw status numbered` and delete
rules that are no longer approved.

DICOM `PatientID` must equal the OpenEMR `pid` used by the viewer; otherwise
QIDO-RS cannot associate the study with the patient.

## DICOMweb plugin

Built from:

```text
https://github.com/jodogne/mirror-orthanc-dicomweb.git
commit 2478806a2d0e4a4a2d2e5d93a52a0e2a1563f507
```

against the exact Orthanc source commit. Installed at:

```text
/opt/orthanc/plugins/libOrthancDicomWeb.so
```

Plugin health:

```bash
curl -u openrx:<password> http://127.0.0.1:8042/plugins
# ["explorer.js", "dicom-web"]
```

## Backup

`orthanc-backup.timer` runs daily at 02:30 with a randomized ten-minute delay.
Orthanc uses an exclusive SQLite lock, so the job stops Orthanc briefly and
always restarts it through a shell trap.

```bash
systemctl start orthanc-backup.service
ls -lh /var/backups/orthanc/
sqlite3 /var/backups/orthanc/<timestamp>/index.sqlite 'PRAGMA integrity_check;'
```

Backups contain the SQLite index and compressed DICOM storage, plus
`SHA256SUMS`. Retention defaults to 14 days. Backup files are root-only
(`0700` directories, `0600` files).

Restore procedure:

```bash
systemctl stop orthanc
cp /var/backups/orthanc/<timestamp>/index.sqlite /var/lib/orthanc/index/index
tar -xzf /var/backups/orthanc/<timestamp>/storage.tar.gz -C /var/lib/orthanc
chown -R orthanc:orthanc /var/lib/orthanc/index /var/lib/orthanc/storage
systemctl start orthanc
```

## Monitoring

`orthanc-healthcheck.timer` checks every five minutes:

- `orthanc.service` is active
- TCP 4242 is listening
- authenticated `/system` returns 200
- `/dicom-web/studies?limit=1` returns 200
- filesystem free space is at least 10%

Results go to the journal:

```bash
journalctl -t orthanc-health -n 20
```

Set `ORTHANC_ALERT_WEBHOOK` in `/etc/orthanc/healthcheck.env` to POST failures
to an external monitoring endpoint. The health check skips while a backup is in
progress.
