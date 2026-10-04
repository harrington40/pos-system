# OpenRx UI tests (Playwright, Python)

Browser tests for the React SPA. They mirror the API test layout
(`backend/tests/api-tests/`) and are organized the same way: a **route catalog**
drives a smoke sweep (one UI case per navigable route), and per-feature modules
add depth for the important screens.

## Layout

| Path | Purpose |
|------|---------|
| `config.py` | All settings, environment-driven (`Settings`, `load_settings`) |
| `auth.py` | Mints a session and exposes it as a Playwright storage state |
| `routes.py` | Catalog of SPA routes derived from `interface/new/src/App.tsx` |
| `pages/` | Page objects (`BasePage`, `LoginPage`) |
| `conftest.py` | Fixtures + `pytest_generate_tests` (one case per route) |
| `test_smoke_routes.py` | Route-render sweep — every navigable route |
| `test_auth_ui.py` | Login form, redirects, error handling |
| `test_dicom_ui.py` | DICOM / CT viewer chrome, tools, upload area |

## Setup

```bash
cd openemr/tests/ui-tests
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python -m playwright install chromium      # downloads the browser once
```

## Running

```bash
./run.sh                       # whole suite
./run.sh -k smoke              # only the route sweep
UI_DOMAINS=patients,dicom ./run.sh
UI_BASE_URL=https://openrx.transtechologies.com UI_TOKEN=<token> ./run.sh
```

Playwright flags pass through (`./run.sh --headed`, `--slowmo=500`, `--tracing=on`).

## Configuration (environment variables)

| Variable | Default | Meaning |
|----------|---------|---------|
| `UI_BASE_URL` | `http://localhost:5173` | SPA origin (app is served at the root — no prefix) |
| `UI_API_URL` | `http://localhost:3002/api` | API base, used to mint a session |
| `UI_USER` / `UI_PASSWORD` | `admin` / `admin123` | Credentials used to obtain a session |
| `UI_TOKEN` | *(unset)* | Pre-minted bearer token; skips login entirely |
| `UI_TIMEOUT_MS` | `15000` | Per-action timeout (ms) |
| `UI_DOMAINS` | *(all)* | Comma list to focus a run, e.g. `patients,dicom` |
| `UI_NAV_WAIT` | `domcontentloaded` | Playwright wait state after navigation |
| `UI_ALLOW_PAGE_ERRORS` | `false` | `true` to not fail on uncaught page errors |
| `UI_STORAGE_STATE` | *(unset)* | Reuse a Playwright storage-state JSON file |

**Authentication:** the SPA stores its session in `localStorage['openemr_user']`.
`auth.py` obtains a session via `POST /api/auth/login` (or `UI_TOKEN`) and seeds
that entry through a Playwright *storage state*, so authenticated pages render
without driving the login form in every test. `test_auth_ui.py` still exercises
the real form.

## Relationship to the API tests

Every API domain that has a UI surface has a route here, and the smoke sweep
gives one UI case per route:

| API domain (`api-tests/`) | UI route(s) / module |
|---------------------------|----------------------|
| `auth` | `/login`, `/register`, `/callback` → `test_auth_ui.py` |
| `patients` | `/dashboard`, `/patients`, `/patients/:id` |
| `imaging` | `/dicom` → `test_dicom_ui.py` |
| `documents` | `/documents` |
| `appointments` | `/appointments`, `/flow`, `/recall`, `/screening` |
| `billing` | `/billing`, `/billing/medical` |
| `labs` | `/labs`, `/lab-results`, `/lab-dashboard` |
| `messaging` / `patient-chat` | `/messages`, `/messages/patient-chat` |
| `admin` | `/admin`, `/db-admin` |
| portal | `/portal/*` (separate auth model) |

## Extending

- **New route** → add it to `routes.py`; the smoke sweep picks it up automatically.
- **New feature module** → add `test_<domain>_ui.py` with specific assertions and
  a page object under `pages/`.
