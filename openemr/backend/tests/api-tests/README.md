# OpenRx API tests (pytest)

Black-box tests that drive the running NestJS backend over HTTP. They cover
every route the API exposes without needing the backend's source tree.

## Running

```bash
cd backend/tests/api-tests
python -m pip install -r requirements.txt

# Whole suite against the default (production) URL
pytest -v

# Against a local backend
OPENRX_API_URL=http://localhost:3002/api pytest -v

# Only the whole-API contract tests
pytest -m surface

# Skip the contract tests for a fast run
pytest -m "not surface"
```

## Full end-to-end API sweep (`e2e/`)

`e2e/` adds a broad, configurable sweep on top of the contract tests: one test
case per route, split into public-read, public-write (gated), authenticated-read,
latency, and guarded-write checks, plus an end-to-end login flow.

```bash
pytest e2e/ -q                                   # whole API (reads by default)
OPENRX_E2E_DOMAINS=imaging pytest e2e/ -q        # one feature area
pytest e2e/ -k "catalog or public" -q            # offline + public cases
```

Everything is environment-driven — see [`e2e/README.md`](e2e/README.md) for the
full option matrix and the two configurable allowlists (`OPENRX_E2E_KNOWN_5XX`,
`OPENRX_E2E_NON_JSON`).

CI runs this folder as the `api-tests` job in
`.github/workflows/backend-ci.yml`.

## Layout

| Path | Purpose |
| --- | --- |
| `api_routes.py` | **Generated** inventory of every backend route (see below) |
| `generate_api_routes.py` | Regenerates `api_routes.py` from the controllers |
| `test_api_surface.py` | Whole-API contract tests driven by the inventory |
| `discovery/` | Read-only production discovery: finds real ids, writes sanitized fixtures |
| `fixtures/` | Generated, sanitized `production_discovery.json` + `.env` |
| `<domain>/test_*.py` | Per-domain tests (patients, billing, fda, …) |
| `e2e/` | **Full end-to-end API sweep** — one case per route, domain-filterable, env-configurable |

`api_routes.py` is generated from `backend/src/**/*.controller.ts`, so a new
controller route cannot escape the contract tests. After changing a controller:

```bash
python generate_api_routes.py
```

## What the contract tests check

`test_api_surface.py` walks every route and asserts, **without authenticating**:

* a guarded route rejects an anonymous caller with `401`/`403` (the guard runs
  before the handler, so no data is touched even for write methods);
* a public read route answers and never returns a `5xx`;
* the set of public read/write endpoints matches a reviewed snapshot, so adding
  a new unauthenticated endpoint fails the build until it is acknowledged.

## Production discovery / baseline

The data-dependent tests need real identifiers (a patient, an encounter, a lab
report, a provider, an appointment, an administrator). Those come from a
**read-only discovery run** rather than from values typed into this file:

```
production API ──authenticated GET only──▶ discovery/  ──sanitized fixtures──▶ tests
```

```bash
# 1. Discover against the environment you want to exercise (read-only).
OPENRX_API_URL=https://openrx.example.com/api \
OPENRX_API_TOKEN="$SERVICE_TOKEN" \
python discovery/run_discovery.py

# 2. Run the suite; conftest.py seeds OPENRX_TEST_* from the fixture file.
pytest -v
```

`discovery/run_discovery.py`:

* issues **GET requests only** (`_get()` refuses any other verb);
* picks the patient that maximises clinical coverage, then derives the
  encounter, lab report, appointment, provider and admin ids;
* records the app's **live database fingerprint** — every table with its row
  count plus the `patient_data` column names — from the app's own
  `/db-admin/tables` and `/db-admin/describe/patient_data` reads. That is how the
  baseline describes the database the *app* actually uses, instead of a local
  copy that may have diverged;
* writes `fixtures/production_discovery.json` containing **only** ids, counts,
  HTTP statuses and field-name/type structures — never names, dates of birth,
  phone numbers or message bodies.

`conftest.py` loads that file and, **when `OPENRX_API_URL` matches the `api_url`
the fixtures were discovered from**, sets any `OPENRX_TEST_*` variables that are
not already in the environment — so a fresh checkout that targets production runs
the same tests as CI. Real environment variables always win, and a run against
the local test database is never given production row ids.

Run the discovery tests on their own with `pytest -m discovery`; exclude them
from a normal run with `pytest -m "not discovery"`. To refresh the fixtures from
within pytest, set `OPENRX_RUN_DISCOVERY=true` alongside a token.

## CI output (Jenkins)

`ci/run-production-baseline.sh` writes two reports, and `Jenkinsfile` publishes
both:

| File | Consumed by |
| --- | --- |
| `pytest-results.xml` | Jenkins' `junit` step (Test Result summary + trend) |
| `html-report/pytest-report.html` | Jenkins' `publishHTML` (the report rendered in the build) |

The HTML report is produced by the `pytest-html` plugin and is self-contained
(CSS/JS inlined), so it needs no extra assets when published or downloaded. It is
also archived as a build artifact. If `pytest-html` is not installed the script
still produces the JUnit XML; if the *HTML Publisher* plugin is not installed the
Jenkinsfile logs a message and keeps the artifact link instead of failing the
build.

Jenkins may show the page unstyled until its Content-Security-Policy allows the
report's inline assets (Manage Jenkins → Script Console:
`System.setProperty("hudson.model.DirectoryBrowserSupport.CSP", "")`, then
restart). The artifact is unaffected by that setting.

### Schedule

The pipeline runs on an **hourly Jenkins cron trigger**:

```groovy
triggers {
    cron('H * * * *')
}
```

`H` lets Jenkins hash the minute, so builds are spread across the hour (and
across agents) instead of every job firing at `:00`. The build also keeps a
bounded history (`buildDiscarder`), refuses to overlap itself
(`disableConcurrentBuilds`) and has a 30-minute `timeout`.

Each run reads the whole baseline surface (67 endpoints plus the per-patient
resource walk). That is fine against the app — every request is a GET — but it
is not free; widen the schedule (`H/2 * * * *`, `H * * * *` on a non-production
job) if you want less traffic.

To run the baseline **without Jenkins**, point system cron at the same script:

```cron
# m   h  dom mon dow   command
17    *   *   *   *    OPENRX_BASELINE_API_URL=https://openrx.example.com/api \
                       OPENRX_API_TOKEN=... \
                       /opt/openrx/backend/tests/api-tests/ci/run-production-baseline.sh \
                       >> /var/log/openrx-baseline.log 2>&1
```

## Environment variables

| Variable | Effect |
| --- | --- |
| `OPENRX_API_URL` | API base URL, including the `/api` prefix. Defaults to the local test backend (`http://localhost:3202/api`) — never production. |
| `OPENRX_API_TOKEN` | Staff JWT. Without it, every `@authenticated` test skips. The tests in `auth/` log in themselves and need no token. |
| `OPENRX_TEST_USER` / `OPENRX_TEST_PASSWORD` | Credentials the authentication tests log in with. Default to the seeded `admin` / `OpenRxTest123`. |
| `OPENRX_RUN_WRITES` | Set to `true` to stop skipping `production_write`/`destructive` tests. Leave unset unless you are pointed at a throwaway environment. |
| `OPENRX_TEST_PATIENT_ID` | Patient id for patient-scoped tests. |
| `OPENRX_TEST_ENCOUNTER_ID` | Encounter id for encounter tests. |
| `OPENRX_TEST_APPOINTMENT_ID` | Appointment id. |
| `OPENRX_TEST_DOCUMENT_ID` | Document id. |
| `OPENRX_TEST_LAB_REPORT_ID` | Lab report id. |
| `OPENRX_TEST_PROVIDER_ID` | Provider id. |
| `OPENRX_TEST_ADMIN_USER_ID` | Administrator id. |
| `OPENRX_RUN_DISCOVERY` | Set to `true` to let `pytest -m discovery` refresh the fixtures (also needs a token). |

Tests that need a value which is not configured **skip** rather than fail, so the
suite is green out of the box and becomes deeper as the environment is seeded.

## Write safety

Nothing in this suite creates, modifies or deletes production data by default:

* the contract tests only send requests that a guard rejects;
* tests marked `production_write` or `destructive` are skipped by
  `conftest.py` unless `OPENRX_RUN_WRITES=true`;
* the remaining write tests call `pytest.fail(...)` so they cannot quietly do
  something destructive once writes are enabled — they have to be rewritten
  against real test data first.

## Markers

`readonly`, `authenticated`, `production_write`, `destructive`, `later`,
`smoke`, `surface`, `discovery` — see `pytest.ini`.

## Bootstrap note

`tests/create_api_test_suite.sh` created this folder originally. It now refuses
to run against an initialised suite; pass `--force` if you really mean to
regenerate and overwrite the files it manages.

The `discovery/`, `fixtures/`, `ci/` and `Jenkinsfile` additions are maintained
by hand and are **not** regenerated by that script.
