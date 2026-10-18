# Stroke Care Release Checklist

Status as of the Phase 7 release-preparation pass.

## Code and automated regression

- [x] Branch confirmed: `feature/stroke-care`
- [x] Backend stroke suite: 5 suites, 107 tests
- [x] Backend full regression: 34 suites, 526 tests
- [x] Frontend full regression: 9 files, 120 tests
- [x] Backend TypeScript/build passes
- [x] Frontend TypeScript/build passes
- [x] Security regression tests cover facility scope, auth-required facility checks, role metadata and patient-context mismatches
- [x] Performance smoke passes (10,000 NIHSS scorings / 1,000 FHIR validations)
- [ ] Dependency audit remediation: backend reports 19 vulnerabilities (1 critical, 9 high); frontend reports 8 (5 high). No Stroke Care dependency was added; the findings are pre-existing/transitive and must still be triaged or accepted before approval.
- [ ] Full Playwright write journey executed on an isolated environment
- [ ] External performance/load test against staging infrastructure

## Database

- [x] Additive migration maintained: `backend/migrations/2026-10-17-stroke-care.sql`
- [x] D–H rollback script maintained: `backend/migrations/2026-10-18-stroke-care-modules-d-h-down.sql`
- [x] Migration contains only additive DDL for existing OpenRx tables
- [x] Rollback rehearsal executed against a disposable database (2026-10-18: MariaDB 11.8, 30 tables up → 15 after D–H rollback → 30 after re-apply)
- [ ] Confirm MySQL/application server timezones agree; FHIR export interprets timezone-less DATETIME values in the application server timezone and emits UTC
- [ ] Production backup and restore point recorded
- [ ] Migration applied to production

Rollback rehearsal command:

```bash
DB_HOST=... DB_PORT=... DB_USERNAME=... DB_PASSWORD=... \
STROKE_REHEARSAL_DATABASE=openrx_stroke_rehearsal \
ALLOW_STROKE_ROLLBACK_REHEARSAL=true \
bash tests/ci/stroke-rollback-rehearsal.sh
```

## FHIR interoperability

- [x] FHIR R4 4.0.1 export implemented
- [x] LOINC panel, total and 15 item mappings pinned by tests
- [x] Structural profile/reference/terminology validation passes in tests
- [x] Official HL7 validator 7.0.2 and terminology server run against synthetic activation and assessment Bundles (2026-10-18: 0 errors; 17 and 19 best-practice warnings respectively)
- [x] UUID fullUrl and timezone defects found by the official validator were fixed and are covered by regression tests
- [ ] Official validation run against a de-identified production-shaped Bundle
- [ ] Target-system interoperability testing completed

Official validation command:

```bash
FHIR_VALIDATOR_JAR=/opt/validator_cli.jar \
STROKE_BUNDLE_FILE=/tmp/stroke-fhir.json \
bash tests/ci/stroke-fhir-conformance.sh
```

A hosted endpoint can be used instead:

```bash
FHIR_VALIDATOR_URL=https://validator.example.org/validate \
STROKE_BUNDLE_FILE=/tmp/stroke-fhir.json \
bash tests/ci/stroke-fhir-conformance.sh
```

## Security and privacy

- [x] JWT authentication and role guards
- [x] Facility-scope regression tests
- [x] Patient-context mismatch rejection tests
- [x] Audit logging for clinical writes
- [x] Audit export restricted to admin/physician
- [ ] Penetration test / security review completed
- [ ] PHI export retention and recipient approval recorded
- [ ] HIPAA/local privacy review signed off

## Clinical validation

- [ ] Qualified stroke clinicians reviewed activation, NIHSS, treatment and transfer workflows
- [ ] NIHSS scoring checked against authoritative reference cases
- [ ] Alert escalation and acknowledgment behavior validated
- [ ] Inpatient observation vocabularies approved
- [ ] Quality metric definitions and denominators approved
- [ ] Downtime/contingency procedure tested
- [ ] Medical-device regulatory applicability reviewed

## Deployment and rollout

- [ ] `STROKE_RELEASE_APPROVED=true` recorded
- [ ] Production remains `STROKE_CARE_ENABLED=false` until approval
- [ ] Facility module configuration verified
- [ ] Backend/frontend release artifacts built from the approved commit
- [ ] PM2 restart and smoke job passed
- [ ] Post-deployment clinical validation samples reviewed

## Current performance smoke result

```json
{
  "scoreIterations": 10000,
  "scoreMs": 12,
  "fhirIterations": 1000,
  "fhirMs": 12,
  "validationFailures": 0,
  "maxMs": 15000,
  "passed": true
}
```

This is a CPU-path smoke test, not an HTTP/database load test.

## Current security audit result

```text
Backend:  19 vulnerabilities (1 low, 8 moderate, 9 high, 1 critical)
Frontend: 8 vulnerabilities (3 moderate, 5 high)
```

The Stroke Care module adds no runtime dependency. The findings are existing
direct/transitive packages and are tracked as a release blocker until remediated
or formally risk-accepted.

## Decision

**NO-GO for production clinical use** until the unchecked clinical, privacy,
dependency-remediation, production-shaped FHIR, and deployment-approval items
are completed.
