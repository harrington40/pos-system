# Full end-to-end API sweep (`e2e/`)

A single, organized, **configurable** sweep that turns every route the backend
exposes into an individual test case. It complements — and does not replace —
`test_api_surface.py` (anonymous route inventory) and the per-domain modules
(`patients/`, `imaging/`, `billing/`, ...).

## Why it exists

`api_routes.py` is **generated from the app** (`generate_api_routes.py` scans the
`*.controller.ts` files), so this suite can never silently miss a route: add an
endpoint, regenerate the inventory, and a new test case appears automatically.

## Files

| File | Purpose |
|------|---------|
| `config.py` | All settings, env-driven (`Settings`, `load_settings()`). |
| `endpoints.py` | Builds the catalog from `api_routes.py`; annotates each route with its feature **domain**. |
| `conftest.py` | Fixtures (`e2e_settings`, `catalog`, `authed_session`, `anon_session`) + `pytest_generate_tests` that parametrizes every route. |
| `test_full_api.py` | The test cases (catalog integrity, per-route sweep, cross-cutting flows). |
| `run.sh` | Convenience runner (picks up `.venv` if present). |

## Quick start

```bash
cd backend/tests/api-tests
.venv/bin/python -m pytest e2e/ -q                     # whole API
./e2e/run.sh                                           # same, with a banner
```

## Configuration (environment variables)

| Variable | Default | Meaning |
|----------|---------|---------|
| `OPENRX_API_URL` | `http://localhost:3202/api` | API base URL **including** `/api` |
| `OPENRX_API_TOKEN` | *(unset)* | Bearer token; without it, authenticated cases **skip** |
| `OPENRX_API_TIMEOUT` | `20` | Per-request timeout (seconds) |
| `OPENRX_E2E_DOMAINS` | *(all)* | Comma list to focus a run, e.g. `imaging,patients` |
| `OPENRX_E2E_MAX_MS` | `8000` | Max acceptable response time (ms) |
| `OPENRX_E2E_USER` / `OPENRX_E2E_PASSWORD` | `admin` / `OpenRxTest123` | Credentials for the login flow test (falls back to `OPENRX_TEST_*`) |
| `OPENRX_E2E_VERIFY_TLS` | `true` | Set `false` to skip TLS verification |
| `OPENRX_RUN_WRITES` | `false` | Enables side-effecting cases (public-write input checks). Use a throwaway DB. |
| `OPENRX_E2E_KNOWN_5XX` | `GET /patients/:pid/discharge-summary` | Endpoint ids allowed to 5xx here (acknowledged gaps; reported as `xfail`) |
| `OPENRX_E2E_NON_JSON` | `GET /fda/transparency` | Endpoint ids that legitimately answer `2xx` with a non-JSON body (proxies) |

## Selecting subsets

```bash
# one feature domain
OPENRX_E2E_DOMAINS=imaging .venv/bin/python -m pytest e2e/ -q
# only the public-endpoint cases
.venv/bin/python -m pytest e2e/ -k public -q
# only the catalog-integrity (offline) tests
.venv/bin/python -m pytest e2e/ -k catalog -q
```

## Running against a real backend (read-only)

The sweep only ever sends GETs for authenticated reads and GETs for the public
set; write routes are exercised **anonymously only** (they must return 401/403),
so it is safe against production.

```bash
OPENRX_API_URL=https://openrx.transtechologies.com/api \
OPENRX_API_TOKEN=<service-token> \
.venv/bin/python -m pytest e2e/ -q
```

## What the cases assert

- **Catalog integrity** (offline, always against the **full** catalog): the
  catalog is substantial, has no unexpected duplicates, spans the core domains,
  and uses known HTTP methods.
- **Per-route sweep** (on the **domain-filtered** catalog)
  - `test_public_read_answers` — public GET routes answer and never `5xx`.
  - `test_public_write_rejects_empty_input` — public write routes reject an empty
    body with a client error, not `5xx` (gated by `OPENRX_RUN_WRITES`).
  - `test_authenticated_read_has_no_server_error` — a valid caller never gets a
    `5xx`, and a `2xx` body is JSON (unless the route is in `OPENRX_E2E_NON_JSON`).
  - `test_authenticated_read_is_timely` — each read stays within `OPENRX_E2E_MAX_MS`.
  - `test_write_endpoint_requires_auth` — every guarded write rejects anonymous
    callers with `401`/`403`.
- **Cross-cutting** — `/config` is public and well formed; unknown routes are
  `404`; a garbage token is rejected; and a full **login → token → protected
  route** flow succeeds (skips when credentials are unavailable).

## Known gaps & allowlists

Two env-overridable allowlists keep the suite meaningful without hiding
regressions (mirroring the `KNOWN_DUPLICATE_ROUTES` pattern in
`test_api_surface.py`):

- **`OPENRX_E2E_KNOWN_5XX`** — endpoints allowed to return `5xx` in a given
  environment. They are still exercised and reported as **`xfail`**, so an
  unexpected `5xx` elsewhere still fails the run. Default:
  `GET /patients/:pid/discharge-summary` (queries a `prescriptions` column that
  some databases lack).
- **`OPENRX_E2E_NON_JSON`** — endpoints whose `2xx` response is legitimately not
  JSON (external proxies). Default: `GET /fda/transparency`.

Set either to an empty string to disable it, or override with your own list:

```bash
OPENRX_E2E_KNOWN_5XX="" OPENRX_E2E_NON_JSON="" .venv/bin/python -m pytest e2e/ -q
```

## Relationship to the other suites

- `test_api_surface.py` — anonymous protection + public-read sanity for the whole
  inventory (fast, no token).
- `e2e/` (this suite) — adds **authenticated** coverage, latency bounds, JSON
  content-type checks, and an end-to-end login flow, all domain-filterable.
- Per-domain modules — deep, data-dependent behavior for one feature.
