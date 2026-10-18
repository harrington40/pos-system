# Stroke Care Release Checklist

Status as of the Phase 7 release-preparation pass.

## Code and automated regression

- [x] Branch confirmed: `feature/stroke-care`
- [x] Backend stroke suite: 5 suites, 104 tests
- [x] Backend full regression: 34 suites, 523 tests
- [x] Frontend full regression: 9 files, 120 tests
- [x] Backend TypeScript/build passes
- [x] Frontend TypeScript/build passes
- [x] Security regression tests cover facility scope, auth-required facility checks, role metadata and patient-context mismatches
- [x] Performance smoke passes (10,000 NIHSS scorings / 1,000 FHIR validations)
- [ ] Full Playwright write journey executed on an isolated environment
- [ ] External performance/load test against staging infrastructure

## Database

- [x] Additive migration maintained: `backend/migrations/2026-10-17-stroke-care.sql`
- [x] D–H rollback script maintained: `backend/migrations/2026-10-18-stroke-care-modules-d-h-down.sql`
- [x] Migration contains only additive DDL for existing OpenRx tables
- [ ] Rollback rehearsal executed against a disposable database
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
- [ ] Official HL7 validator and terminology server run against an exported Bundle
- [ ] Target-system interoperability testing completed

Official validation command:

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
  "scoreMs": 15,
  "fhirIterations": 1000,
  "fhirMs": 15,
  "validationFailures": 0,
  "maxMs": 15000,
  "passed": true
}
```

This is a CPU-path smoke test, not an HTTP/database load test.

## Decision

**NO-GO for production clinical use** until the unchecked clinical, privacy,
official FHIR conformance, rollback rehearsal and deployment-approval items are
completed.
