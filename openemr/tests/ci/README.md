# OpenRx Stroke Care CI/CD

The existing Jenkins jobs **OpenRx-CI**, **OpenRx-Nightly**, **OpenRx-Release**
and **OpenRx-Smoke** use the shared pipeline at
`backend/tests/api-tests/Jenkinsfile`. No duplicate Stroke Care jobs are
required. Configure or confirm the following parameters on each existing job:

| Job | Parameters | Expected Stroke Care stage |
| --- | --- | --- |
| OpenRx-CI | `RUN_JS_TESTS=true`, `RUN_STROKE_TESTS=true` | Jest, Vitest, migration/rollback checks |
| OpenRx-Nightly | above + `RUN_UI_TESTS=true`, `UI_BASE_URL=https://...` | Stroke UI smoke and read-only workflow navigation |
| OpenRx-Release | above + `STROKE_CARE_ENABLED=false`, `STROKE_RELEASE_APPROVED=false` | Blocks release unless Stroke Care is disabled or approval is recorded |
| OpenRx-Smoke | `RUN_UI_TESTS=true`, `UI_BASE_URL=https://...` | `/stroke-care` route and dashboard smoke |

## Stroke Care verification stage

The shared pipeline adds one stage:

1. Verifies the additive migration and the Modules D–H rollback script exist.
2. Runs `npx jest src/stroke-care --ci --runInBand`.
3. Runs `npm run test:stroke:performance` (CPU-path NIHSS/FHIR smoke).
4. Runs the stroke Vitest suites (`strokeCare.test.ts`, `strokeCareUI.test.ts`).
5. Enforces the production rollout gate:
   - `STROKE_RELEASE_APPROVED=true` is required to enable Stroke Care, **or**
   - `STROKE_CARE_ENABLED=false` keeps the feature disabled.

Artifacts are written to `tests/reliability-artifacts/` and feed the existing
reliability report.

## Release procedure

1. Back up the database and record the restore point.
2. Apply `backend/migrations/2026-10-17-stroke-care.sql`; it is additive and
   idempotent.
3. Verify facility module configuration and the global `STROKE_CARE_ENABLED`
   flag.
4. Keep `STROKE_CARE_ENABLED=false` until clinical validation and deployment
   approval are documented.
5. Rollback for Modules D–H:
   `backend/migrations/2026-10-18-stroke-care-modules-d-h-down.sql`.
   This is destructive for D–H data and preserves Modules A–C.
6. Deploy the backend and frontend, restart PM2, and run the smoke job.

## Manual release validation

These are deliberately not part of every CI run because they need an external
validator, a disposable database, or an approved test environment.

Official FHIR validation (standalone validator 7.0.2 used for the Phase 7 run):

```bash
FHIR_VALIDATOR_JAR=/opt/validator_cli.jar \
STROKE_BUNDLE_FILE=/tmp/stroke-fhir.json \
bash tests/ci/stroke-fhir-conformance.sh
```

Rollback rehearsal against a disposable schema only:

```bash
DB_HOST=127.0.0.1 DB_PORT=3307 DB_USERNAME=root DB_PASSWORD=... \
STROKE_REHEARSAL_DATABASE=openrx_stroke_rehearsal \
ALLOW_STROKE_ROLLBACK_REHEARSAL=true \
bash tests/ci/stroke-rollback-rehearsal.sh
```

Phase 7 result: the additive migration created 30 tables, the D–H rollback left
15, and re-applying the additive migration restored 30. Official validation of
synthetic activation and assessment Bundles returned 0 errors (17 and 19
best-practice warnings respectively).

## Playwright

The existing Python Playwright suite lives in `tests/ui-tests/`.
`test_stroke_ui.py` covers the Stroke board, emergency board, imaging,
inpatient and rehabilitation tabs. The full create → NIHSS → finalize →
history → FHIR write journey is opt-in only (`OPENRX_STROKE_WRITE_E2E=true`)
and must run on an isolated, approved test environment.
