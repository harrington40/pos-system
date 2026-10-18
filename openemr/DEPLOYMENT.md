# OpenRx / OpenEMR — Deployment & Operations

> **Read this first.** Single source of truth for building, deploying, and rolling
> back this project. An automated agent or a new engineer should be able to ship a
> change using only this file.

## TL;DR

```bash
cd openemr
bash deploy/deploy-local.sh             # build + deploy backend AND frontend
bash deploy/deploy-local.sh --frontend  # frontend only
bash deploy/deploy-local.sh --backend   # backend only
bash deploy/openrx.sh                   # interactive control center (deploy/monitor/rollback)
```

## Production target

- **Server (SSH):** `dev@94.250.201.58` (host `vmi3301240`); key `~/.ssh/id_ed25519` (already authorized).
- **App dir:** `/home/dev/openrx`
  - `backend/`        — NestJS app; runs from `backend/dist/main.js`
  - `backend/.env`    — production environment (DB, `JWT_SECRET`, B2 keys, SMTP, ports)
  - `public/dist/`    — built React SPA (served at the site root)
  - `incoming/`       — uploaded tarballs land here before the swap
  - `backups/{backend,frontend}/dist-<ts>` — previous dists (used by rollback)
  - `releases/`       — archived deploy tarballs
  - `ecosystem.config.js` — PM2 descriptor (app `openrx-backend`, `cwd=backend`, `script=dist/main.js`, `NODE_ENV=production`)
- **Public URL:** https://openrx.transtechologies.com (Cloudflare) — SPA at `/`,
  Stroke workspace at `/stroke` (`/stroke-care` retained as an alias), API at
  `/api` (proxied to NestJS `:3002`).
- **Process manager:** PM2 app name **`openrx-backend`**.

## Deploy model (tarball swap)

1. `deploy-local.sh` builds backend (`nest build` -> `backend/dist`) and frontend
   (`tsc -b && vite build` -> `public/dist`), tars each `dist/`, `scp`s them to the
   server's `incoming/`, then runs the server's `deploy.sh` over SSH.
2. Server `deploy.sh` validates the tarball (must contain `main.js` / `index.html`),
   archives it, backs up the current `dist`, swaps **atomically** (single rename),
   restarts PM2, and prunes old artifacts.

### deploy-local.sh (run from `openemr/`)

```
bash deploy/deploy-local.sh                 # backend + frontend
bash deploy/deploy-local.sh --backend       # backend only
bash deploy/deploy-local.sh --frontend      # frontend only
bash deploy/deploy-local.sh --skip-build     # upload existing dist/ (no build)
bash deploy/deploy-local.sh --dry-run        # show remote actions, change nothing
bash deploy/deploy-local.sh --keep 5         # keep 5 backups on the server
bash deploy/deploy-local.sh --no-verify      # skip post-deploy HTTP checks
```

After a real deploy the script verifies `/`, `/stroke`, `/stroke-care`,
`/portal/login` and `/api/config` against `OPENRX_SITE_URL` (default
`https://openrx.transtechologies.com`). The API check retries during the normal
PM2 startup window (`OPENRX_VERIFY_ATTEMPTS`, default 30 at two-second intervals).
A persistent non-200 response fails the deployment after the normal
backup/rollback artifacts have been retained.

Env overrides: `OPENRX_SERVER` (default `dev@94.250.201.58`),
`OPENRX_REMOTE_DIR` (default `/home/dev/openrx`), `OPENRX_SITE_URL` (default
`https://openrx.transtechologies.com`), `KEEP` (default 3).

### Server-side scripts (live in `openemr/deploy/`; also installed at `/home/dev/openrx/`)

- `deploy.sh --backend <tar> --frontend <tar> [--keep N] [--no-restart] [--recreate] [--dry-run]`
- `rollback.sh --list` | `rollback.sh --backend [N|last]` | `rollback.sh --frontend [N|last]`
- `prune.sh [--keep N] [--all] [--dry-run]`
- `openrx.sh` — interactive control center (LOCAL): build, deploy, monitor, rollback over SSH.
- `ecosystem.config.js` — PM2 descriptor.

### Common operations

```bash
# Roll the backend back one release
ssh dev@94.250.201.58 'cd /home/dev/openrx && ./rollback.sh --backend 1'
# Stream logs
ssh dev@94.250.201.58 'pm2 logs openrx-backend --lines 100'
# Status
ssh dev@94.250.201.58 'pm2 list'
```

## Build requirements (gotchas that break the build)

- **Frontend:** `@types/node` must be a devDependency. `vite.config.ts` uses
  `process.env`; without the types `tsc -b` fails with `Cannot find name 'process'`.
  It is already added to `interface/new/package.json`.
- **Backend:** `npm run build` (`nest build`) -> `backend/dist/`.
- `deploy-local.sh` runs the same `npm run build`, so a type error aborts the deploy
  before anything reaches production (intended).

## Local development

```bash
bash interface/new/dev-start.sh           # Kafka(9092) + NestJS(3002) + Vite(5173)
# SPA: http://localhost:5173/app/   login: admin / admin123
# API: http://localhost:3002/api
START_KAFKA=no bash interface/new/dev-start.sh   # skip Kafka (in-memory event bus)
```

- Backend env: `backend/.env` (DB `localhost:8320`, `JWT_SECRET`, Backblaze B2 keys).
- Docker services used by the backend: MariaDB on `:8320` (user `openemr` / pass
  `openemr` / db `openemr`), OpenEMR PHP on `:8300`, phpMyAdmin on `:8310`.
- The NestJS backend takes ~50 s to boot (the `ensure-schema` pass).
- Stop the dev stack with `kill $(cat /tmp/devstart.pid)` or Ctrl-C in its terminal.

## DICOM / imaging notes (the viewer)

- Study files are stored in Backblaze B2 (buckets `openemr-xrays-bc7e`, `openemr-labs-bc7e`).
- Upload: `POST /api/imaging/upload` (multipart `file`, `type=xray|lab`, `pid`, `eid?`, `description?`).
- **Same-origin file proxy:** `GET /api/imaging/:id/file` streams the study bytes so the
  browser can read them without a B2 CORS rule (`src/imaging/imaging.controller.ts` →
  `ImagingService.getFile` → `B2StorageService.downloadFile`).
- Viewer: `interface/new/src/features/dicom/DicomViewerPage.tsx`. Loads Cornerstone from
  CDN — `cornerstone-core@2.6.1`, `dicom-parser@1.8.21`, and
  **`cornerstoneWADOImageLoaderNoWebWorkers`** (the NoWebWorkers build avoids a
  cross-origin Web Worker that browsers block; it also bundles the JPEG / JPEG-Lossless /
  JPEG-LS / JPEG2000 WASM codecs inline).
- **Render target must be a `<div>`, not a `<canvas>`.** Cornerstone paints into a `<div>`
  reliably; a supplied `<canvas>` element renders nothing. Display with
  `cornerstone.displayImage(element, imageObject)` (pass the image object, not the imageId).
- Do **not** ship source maps to production (enforced in `tsconfig.build.json` and the
  Vite config).

## Database schema notes

The `licenses` table is **not** created by a migration and TypeORM runs with
`synchronize` off, so it has to exist before the app starts and its columns have
to match `License` in `backend/src/license/license.entity.ts`:

- `licenseKey` must be **`varchar(64)`** (or any width ≥ 37). Keys are 37
  characters in the current fixed-width format
  (`OPENRX-T-tttttttt-DD-NNNNNNNN-CCCCCCCC`). A database left over from the
  earlier format has `varchar(30)`, and activation then fails with
  `ER_DATA_TOO_LONG` surfaced as a 500 from `POST /api/license/activate`:
  ```sql
  ALTER TABLE licenses MODIFY licenseKey varchar(64) NOT NULL;
  ```
- `status` is `varchar(20)` and holds `active`, `expired`, `revoked` or
  `superseded` (activating a key retires any other active row).

### Issuing a licence key

Generation needs the signing secret, so run it where `LICENSE_SECRET_CURRENT`
lives (or use `POST /api/license/generate`, which requires an admin JWT):

```bash
ssh dev@94.250.201.58 'cd /home/dev/openrx/backend && set -a && . ./.env && set +a && \
  node -e "require(\"reflect-metadata\");const {LicenseService}=require(\"./dist/license/license.service.js\");\
  console.log(new LicenseService({}).generateBatch(\"professional\",12,1).join(\"\n\"))"'
```

Activate through the Licence page, or directly (the endpoint is public so an
unlicensed install can be rescued):

```bash
curl -X POST -H 'Content-Type: application/json' \
  -d '{"key":"OPENRX-...","customerName":"Your Clinic"}' \
  https://openrx.transtechologies.com/api/license/activate
```

The term runs from activation, not from when the key was minted, and the tier
sets the seat count (`basic` 5, `professional` 25, `enterprise` 100), which
`createUser`, `approveUser` and reactivating a user all enforce.

### Generating a key locally

`backend/scripts/license-key.ts` runs the same code as the server, so a key
minted with it is exactly the key the server expects:

```bash
cd backend
npm run license -- generate --tier professional --months 12 --count 3
npm run license -- inspect OPENRX-...      # decode, and check it against a secret
```

A deployment only accepts keys signed with **its** `LICENSE_SECRET_CURRENT`, and
the tool prints a fingerprint of the secret it used. If a key is rejected as
invalid, the two secrets differ rather than the key being wrong. Compare with:

```bash
ssh dev@94.250.201.58 'grep ^LICENSE_SECRET_CURRENT= /home/dev/openrx/backend/.env | cut -d= -f2- \
  | sha256sum | cut -c1-8'
```

### Deactivating a key

Keys have no shelf life, so a key minted last year still activates today. A key
can therefore be deactivated **whether or not it was ever activated**:

- an activated licence becomes `revoked`, which takes it out of
  `getActiveLicense()` on the next request, and the seat cap it imposed goes
  with it
- a key that was never activated has no row to flag, so a revocation placeholder
  is recorded instead and `activateKey` refuses it

```bash
# through the API (admin JWT required)
curl -X POST -H "Authorization: Bearer <jwt>" -H 'Content-Type: application/json' \
  -d '{"key":"OPENRX-...","reason":"refunded"}' \
  https://openrx.transtechologies.com/api/license/revoke

# or locally
npm run license -- revoke OPENRX-... --reason "refunded" --token <jwt>
npm run license -- list --token <jwt>
npm run license -- unrevoke OPENRX-... --token <jwt>
```

`unrevoke` releases a key that never activated outright. One that really was
activated is parked as `expired` instead, so the revoked period is not handed
back silently and reactivating is a deliberate act. Endpoints:
`POST /api/license/revoke`, `POST /api/license/unrevoke`,
`GET /api/license/revoked`.

### Running a promotion

The plans page can advertise a discount without a frontend release: the promotion
is server config. Set `LICENSE_PROMOTION` (JSON) in `backend/.env` and restart
PM2.

```bash
LICENSE_PROMOTION='{"label":"Launch offer","percentOff":25,"tiers":["professional","enterprise"],"cycle":"both","endsAt":"2026-12-31","code":"OPENRX25","note":"25% off your first year"}'
```

| Field | Meaning |
|---|---|
| `label` | Banner headline. Defaults to `Special offer`. |
| `percentOff` | 1–99. Required; anything else means no promotion. |
| `tiers` | Plans it covers. Omit for all three. |
| `cycle` | `both` (default), `monthly` or `yearly`. |
| `endsAt` | ISO date. Once it passes, the promotion disappears on its own. |
| `code` | Optional code, shown on the banner. |
| `note` | Optional supporting line. |

Served by `GET /api/license/promotion` — public, and exempt from licence
enforcement so the pricing page works on an unlicensed install. Malformed config
is logged and ignored rather than thrown, because a marketing string must never
be able to break the pricing page. The discount is **display only**: keys encode a
tier and a duration, so what a customer actually pays is settled wherever the
order is taken.

## Verifying a deploy

```bash
# 1. Frontend served — the hash should match your local build
curl -sL https://openrx.transtechologies.com/ | grep -oE 'index-[A-Za-z0-9_-]+\.js'
# 2. A backend route is registered (401 = exists and protected, 404 = missing)
curl -s -o /dev/null -w '%{http_code}\n' https://openrx.transtechologies.com/api/imaging/1/file
# 3. On the server
ssh dev@94.250.201.58 'pm2 list; ls -la /home/dev/openrx/backend/dist/main.js /home/dev/openrx/public/dist/index.html'
```

## Testing

Two black-box suites live alongside the app:

- **API tests** (`backend/tests/api-tests/`, pytest) — whole-API contract
  (`test_api_surface.py`), a configurable full sweep (`e2e/`), and per-domain
  modules. See `backend/tests/api-tests/README.md`.
- **UI tests** (`tests/ui-tests/`, Playwright for Python) — one UI case per SPA
  route (route-render smoke sweep), per-feature modules (auth, DICOM viewer, …),
  and a role Dashboard & access-control sweep for Registrar, Physician, Nurse
  Aide, Administrator, Midwife and Laboratory (`test_role_dashboards_ui.py`), all
  environment-configurable. See `tests/ui-tests/README.md`.

```bash
# API (against a running backend)
cd backend/tests/api-tests && OPENRX_API_URL=http://localhost:3002/api \
    OPENRX_API_TOKEN=<token> .venv/bin/python -m pytest -q

# UI (against a running SPA)
cd tests/ui-tests && .venv/bin/python -m playwright install chromium   # once
    UI_BASE_URL=http://localhost:5173 UI_TOKEN=<token> .venv/bin/python -m pytest -q
```

### Test reliability report (single HTML page)

`tests/build_reliability_report.py` aggregates every suite (backend unit, frontend
unit, API contract, API e2e, browser UI) into one self-contained page showing the
kind of each test, its results, a per-suite **confidence level** and a coverage
breakdown (API routes, UI routes, roles, and code coverage when present), plus an
overall **reliability index**.

```bash
python3 tests/build_reliability_report.py --collect   # writes tests/reliability-report.html
```

It is best-effort/offline: it reads the JUnit XMLs in each suite and any Jest/Vitest
JSON or coverage summaries in `tests/reliability-artifacts/`, degrading gracefully
(shown as "not run") when a result file is absent.

## History / maintenance notes

- The deploy tooling originally lived at `openemr/deploy/` and was removed in a
  "sync working tree" commit; it has been **restored here** (from commit `02be8f3`) and is
  also present on the server. Keep it in sync with the server copies when changed.
- Do not `git clean` away `openemr/public/dist` or `openemr/deploy/` unless you intend to
  rebuild (`npm run build`) or re-restore the scripts.
- `openemr/public/dist` is **build output** (untracked); it is regenerated by
  `deploy-local.sh` / `npm run build` in `interface/new`.
