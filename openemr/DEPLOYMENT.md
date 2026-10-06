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
- **Public URL:** https://openrx.transtechologies.com (Cloudflare) — SPA at `/`, API at `/api` (proxied to NestJS `:3002`).
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
```

Env overrides: `OPENRX_SERVER` (default `dev@94.250.201.58`),
`OPENRX_REMOTE_DIR` (default `/home/dev/openrx`), `KEEP` (default 3).

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
