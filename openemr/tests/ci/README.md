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
3. Runs the stroke Vitest suites (`strokeCare.test.ts`, `strokeCareUI.test.ts`).
4. Enforces the production rollout gate:
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

## Playwright

The existing Python Playwright suite lives in `tests/ui-tests/`.
`test_stroke_ui.py` covers the Stroke board, emergency board, imaging,
inpatient and rehabilitation tabs. The full create → NIHSS → finalize →
history → FHIR write journey is opt-in only (`OPENRX_STROKE_WRITE_E2E=true`)
and must run on an isolated, approved test environment.
