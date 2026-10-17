# OpenRx Stroke Care

Modular stroke care for three clinical environments on one shared patient record:

| Setting | What the module supports |
|---|---|
| **Outpatient stroke clinic** | Signed NIHSS, post-stroke follow-up, secondary-prevention scheduling, rehabilitation tasks |
| **Acute stroke / emergency centre** | Code-stroke activation, last-known-well and door times, imaging linkage, advisory reperfusion checklist, clinician-recorded decisions |
| **Comprehensive stroke centre** | Inpatient coordination, multidisciplinary tasks, transfers, follow-up and quality metrics |

The feature branch is `feature/stroke-care`. Nothing in this module writes to
`main` or replaces an existing OpenRx module.

---

## 1. Repository findings (what this implementation reuses)

| Area | Finding | How stroke care uses it |
|---|---|---|
| Backend | NestJS 11, global prefix `/api` | `StrokeCareModule` in `backend/src/stroke-care/` |
| Persistence | MySQL via `mysql2` + TypeORM `DataSource`, `synchronize: false` | Raw parameterised SQL, consistent with `inpatient`, `emergency`, `medication-administration` |
| Schema bootstrap | Existing modules create tables in `OnModuleInit.ensureSchema()` | Same pattern; additive `CREATE TABLE IF NOT EXISTS` only |
| Patients | `patient_data` (`pid`, names, DOB, sex) | Every stroke row stores `pid`; there is no second patient index |
| Encounters | `form_encounter` (`encounter_id`, `facility_id`) | Optional `encounter_id` on an activation |
| Auth | `JwtAuthGuard`, `RolesGuard`, `@Roles(...)` | Every endpoint is guarded; role lists are in the controller |
| Imaging | Existing `imaging` entity + B2 storage; **no Orthanc server is configured in this repository** | Stroke rows link `imaging.id` and/or a DICOM `StudyInstanceUID`; no image bytes are duplicated |
| FHIR | Existing `fhir.service.ts` | A stroke-specific R4 collection Bundle export endpoint |
| Frontend | React 18 + Vite + React Query + Bootstrap under `interface/new/src` | `features/stroke-care/`, `api/endpoints/strokeCare.ts`, route `/stroke-care` |
| Tests | Jest colocated `*.spec.ts`; Vitest in `interface/new/src/test` | Added both |

No MongoDB or PostgreSQL was assumed or introduced.

---

## 2. Clinical safety model

The system documents care; it does not decide it.

- **NIHSS is scored on the server.** The client preview is convenience only. The
  server recomputes the total from the submitted item values and refuses an
  incomplete or out-of-range assessment.
- **Every clinical write is signed.** An assessment requires
  `signatureConfirmed: true` and the signer's name. An order set requires both
  `clinicianAcknowledged` and `contraindicationsReviewed`. A reperfusion decision
  is limited to `admin`/`physician` and requires a reason when treatment is
  withheld or not indicated.
- **Unknown is a first-class criterion state.** An undocumented CT, platelet
  count or last-known-well is reported as `unknown`, never as normal.
- **Reperfusion output is advisory.** `evaluateTreatmentCriteria()` returns
  `advisoryOnly: true` and `clinicianReviewRequired: true`; no endpoint returns
  an order or a treatment recommendation.
- **Protocols are versioned.** Every assessment, order and decision stores the
  protocol key and version that produced it (`x.y.z`), so a later protocol change
  does not rewrite the meaning of historical records.
- **Audit trail.** Activations, assessments, orders, decisions, imaging links,
  transfers, follow-ups and tasks write to `stroke_audit_events`.

Published programme configuration in `stroke-protocols.ts`:

- IV thrombolysis window: 270 minutes from last known well
- Thrombectomy window: 1440 minutes with imaging selection
- Door-to-needle target: 60 minutes
- Door-to-imaging target: 25 minutes
- BP before thrombolysis: below 185/110 mmHg
- Glucose 50–400 mg/dL, platelets ≥ 100,000/µL, INR ≤ 1.7, age ≥ 18

A facility that follows different values must change the values **and** the
protocol version together. The unit tests pin the published bands.

### NIHSS lifecycle, untestable handling and terminology

- **Draft → finalized → amended.** A draft can be saved without a signature and
  edited while unsigned. Finalizing requires every field to be scored or validly
  untestable, the signer's name and an explicit signature confirmation.
  Finalized assessments are immutable; a correction creates a **new signed
  version** (`version + 1`, `amends_id`), leaving the original in the history.
- **Untestable is not zero.** Only motor items (5a, 5b, 6a, 6b) and limb ataxia
  (7) may be declared untestable, and each requires a reason. The item is
  excluded from the total and the result is flagged as partial.
- **Server-side scoring.** The backend recomputes every total from the submitted
  fields; a frontend total is never trusted.
- **LOINC (verified 2026-10-17 against the LOINC 2.83 panel hierarchy):**

| Concept | LOINC |
|---|---|
| NIHSS panel | `70182-1` |
| Level of consciousness (1a) | `70184-7` |
| LOC questions (1b) | `70185-4` |
| LOC commands (1c) | `70186-2` |
| Best gaze (2) | `70187-0` |
| Visual (3) | `70188-8` |
| Facial palsy (4) | `70189-6` |
| Motor arm, left (5a) | `70190-4` |
| Motor arm, right (5b) | `70967-5` |
| Motor leg, left (6a) | `70191-2` |
| Motor leg, right (6b) | `70968-3` |
| Limb ataxia (7) | `70192-0` |
| Sensory (8) | `70193-8` |
| Best language (9) | `70194-6` |
| Dysarthria (10) | `70195-3` |
| Extinction/inattention (11) | `70196-1` |
| Total score | `72089-6` |

Source: the LOINC panel hierarchy for 70182-1 and the 72089-6 term page. Item
labels in the UI are paraphrased; LOINC® content is used under the LOINC license,
and the NIHSS instrument is the public NINDS/NIH Toolbox instrument (see the
LOINC reference information). No LOINC code was invented; the automated tests
pin the verified mapping.

### Stroke encounter profile (Module A)

One `stroke_encounter_profiles` row per activation records symptom-discovery
time, initial neurological findings, risk factors, prior stroke/TIA history,
relevant history, attending neurologist, department and the encounter status.
Allergies and current medications are **read from the existing OpenRx `lists`
and `prescriptions` tables**, and previous strokes come from earlier stroke
activations for the same `pid` — no demographic, allergy or medication record is
duplicated.

---

### Acute alert management (Module C)

- **Team and acknowledgment.** `stroke_alert_team` records each responsible user
  and role; assignment creates a durable notification, and acknowledgment is
  written with who acknowledged and when.
- **Quality-tagged milestones.** `stroke_milestones` stores each clinical event
  with `unknown | estimated | reported | verified`. An unknown event has **no
  timestamp**; the API rejects a time attached to an unknown milestone and never
  substitutes “now”. Structured records (activation, signed NIHSS, imaging,
  decision, treatment, transfer, disposition) supply fallback times marked
  `reported`, and explicit milestones always win.
- **Durable notifications.** `stroke_notifications` is the delivery channel: a
  guard-protected inbox, per-user/role acknowledgment, and a one-minute sweep
  (`StrokeNotificationScheduler`) that marks pending rows delivered and escalates
  unacknowledged critical rows after five minutes. No WebSocket is required, so
  a closed browser cannot lose an alert. `POST /notifications/sweep` lets an
  administrator replay the sweep after downtime.
- **Pathway separation.** `pathwayForStrokeType()` yields `ischemic`,
  `hemorrhagic` or `undetermined`. Thrombolytic/thrombectomy documentation is
  rejected unless the pathway is ischemic; haemorrhagic workflows still support
  BP management, contraindications, adverse events and specialist consultation.
  Nothing calculates eligibility or initiates treatment.
- **Closure.** `POST /activations/:id/close` requires a recorded outcome and
  writes the admission/discharge milestone, audit entry and team notifications.
- **Imaging and transfer milestones.** Imaging records carry ordered/performed/
  interpreted times and interpretation status; transfers track requested →
  accepted → departed → arrived.
- **Downtime procedure.** Notifications are committed to the database before any
  delivery attempt, so a restart or a dropped connection cannot erase them.
  Pending rows survive and the scheduler performs a boot sweep 15 seconds after
  startup, then every minute. During planned downtime, the same sweep is
  available to an administrator via `POST /notifications/sweep`; acknowledgments
  written before the outage remain acknowledged. The UI polls the authenticated
  endpoints, so recovery does not depend on a socket reconnecting.

## 3. Backend API

All routes are under `/api/stroke-care` and require a JWT.

| Method | Route | Allowed roles |
|---|---|---|
| GET | `/protocols` | clinical readers |
| GET | `/facilities/:facilityId/modules` | clinical readers |
| PUT | `/facilities/:facilityId/modules` | admin |
| GET | `/overview?facilityId=` | clinical readers |
| GET | `/emergency-dashboard?facilityId=` | clinical readers |
| GET | `/notifications` | clinical readers |
| POST | `/notifications/:id/ack` | recipient role/user |
| POST | `/notifications/sweep` | admin |
| GET/POST | `/activations/:id/team` | read / clinicians |
| POST | `/activations/:id/team/acknowledge` | clinicians |
| POST | `/activations/:id/milestones` | clinicians |
| GET | `/activations/:id/clinical-timeline` | clinical readers |
| POST | `/activations/:id/close` | admin, physician |
| GET/POST | `/activations/:id/treatment-events` | read / clinicians |
| GET | `/activations/:id/pathway` | clinical readers |
| PATCH | `/imaging/:id` | clinicians, lab_tech |
| PATCH | `/transfers/:id` | clinicians |
| GET | `/quality?days=&facilityId=` | clinical readers |
| GET | `/activations` | clinical readers |
| POST | `/activations` | admin, physician, nurse, registered_nurse, front_desk |
| GET/PUT | `/activations/:id/profile` | read / clinicians |
| GET | `/activations/:id` | clinical readers |
| PATCH | `/activations/:id` | clinicians (front_desk can start the activation, not amend clinical fields) |
| GET | `/activations/:id/timeline` | clinical readers |
| GET | `/activations/:id/fhir` | clinical readers |
| GET/POST | `/activations/:id/assessments` | read / clinicians (POST with `finalize:false` saves a draft) |
| PATCH | `/assessments/:id` | clinicians (draft only) |
| POST | `/assessments/:id/finalize` | clinicians |
| POST | `/assessments/:id/amend` | clinicians |
| GET | `/assessments/:id/fhir` | clinical readers |
| GET | `/patients/:pid/nihss-trend` | clinical readers |
| GET/POST | `/activations/:id/orders` | read / admin, physician |
| GET/POST | `/activations/:id/decisions` | read / admin, physician |
| GET/POST | `/activations/:id/imaging` | read / clinicians, lab_tech |
| GET/POST | `/activations/:id/transfers` | read / clinicians |
| GET | `/patients/:pid` | clinical readers |
| GET/POST | `/patients/:pid/follow-ups` | read / clinicians |
| POST | `/follow-ups/:id/complete` | clinicians |
| GET/POST | `/patients/:pid/tasks` | read / clinicians, front_desk |
| PATCH | `/tasks/:id` | clinicians, front_desk |

Route parameters are parsed with the shared `parseNumericId()` helper, so a
malformed id returns 400 before it can reach MySQL.

---

## 4. Data model

Ten additive tables, all linked to the existing `patient_data.pid`:

`stroke_facility_modules`, `stroke_activations`, `stroke_assessments`,
`stroke_orders`, `stroke_treatment_decisions`, `stroke_imaging_studies`,
`stroke_followups`, `stroke_care_tasks`, `stroke_transfers`,
`stroke_audit_events`.

Deployment: either let the service bootstrap the schema on startup, or apply

```bash
mysql -u <user> -p <database> < backend/migrations/2026-10-17-stroke-care.sql
```

The migration contains only `CREATE TABLE IF NOT EXISTS`; it never alters or
drops an existing OpenRx table.

### Development database (remote OpenRx)

`backend/.env` is configured to use **the same MariaDB database as the deployed
`openrx-backend` process** (pm2, cwd `/home/dev/openrx/backend`, nginx site
`openrx.transtechologies.com`). It is accessed through an SSH tunnel because the
database only listens on the host's loopback interface:

| Setting | Value |
|---|---|
| `DB_HOST` | `127.0.0.1` |
| `DB_PORT` | `13306` (local end of the tunnel) |
| `DB_DATABASE` | `openemr` |

The hosted MariaDB (`openemr`, user `openemr`) listens on `127.0.0.1:3306` on
`dev@94.250.201.58`, so it is not directly reachable. Note that the public site
is `openrx.transtechologies.com`; the `.co` spelling does not resolve. Start (or
verify) the tunnel before the backend:

```bash
cd backend && ./scripts/remote-db-tunnel.sh
```

The tunnel is a plain SSH local forward; if it drops, rerun the script. Using the
remote database from a local backend means local writes reach the hosted data —
treat local testing accordingly. Credentials live only in the git-ignored
`backend/.env`, never in source control.

---

## 5. Frontend

- Route: `/stroke-care` (protected, inside `AppLayout`).
- Sidebar: **Stroke Care → Stroke Board** for clinical roles.
- Board: facility filter, summary counters, activation table, selected-record
  detail with ten panes — encounter profile, NIHSS, order sets, reperfusion,
  treatment, imaging, team, clinical timeline, coordination and audit.
- **Emergency board** tab: active alerts, assigned team and acknowledgment state,
  current NIHSS, imaging status, open tasks, transfer status, pending team
  acknowledgments and the signed-in user's durable notification inbox (polled).
- All clinical rules come from `GET /stroke-care/protocols`; the UI does not
  hardcode item maxima, windows or order sets.
- Quality pane shows recorded door-to-imaging and door-to-needle performance and
  explicitly shows “no eligible cases” instead of 0 % when there is no denominator.

---

## 5b. Modules D–H

All five modules extend the same stroke module and 27 `stroke_*` tables. They
reuse existing OpenRx data rather than duplicating it: `patient_care_assignment`
for beds, `form_vitals` for vital signs, `medication_administration_orders` for
MAR due counts, `procedure_order`/`procedure_report` for laboratory review, and
the existing imaging store plus authorized `/dicom` viewer.

**D — Imaging integration.** `stroke_imaging_studies` now stores DICOM study
description, accession, series/instance counts, study date, DICOM PatientID and
patient-match status. `GET /stroke-care/imaging/:id/dicom-metadata` returns the
stored metadata and viewer path and writes an audit event. `stroke_radiology_reports`
associates preliminary/final/amended reports with the encounter and imaging link.
A DICOM PatientID mismatch is rejected unless a clinician explicitly confirms it.
No DICOM bytes are copied and no second PACS is created; there is no Orthanc
server in this repository.

**E — Inpatient care.** Admission/discharge records (`stroke_inpatient_stays`),
stroke-unit dashboard (`GET /stroke-care/inpatient/dashboard`), neuro/nursing,
swallow, fall-risk and mobility assessments (`stroke_inpatient_assessments`),
multidisciplinary plans, complications and discharge plans. Bed assignment writes
the existing `patient_care_assignment` row. The dashboard reads latest vitals,
MAR doses due within one hour, 24-hour laboratory reports, open stroke tasks and
unresolved complications.

**F — Rehabilitation.** Referrals for PT, OT, speech-language, swallowing and
cognitive rehabilitation; plans, goals, sessions and progress notes. Functional
scores are clinician-entered mRS (0–6) or Barthel (0–100 in steps of five). The
server rejects out-of-range scores and never derives a score from attendance or
session counts. Instrument licensing notes are returned with `rehab-progress`.

**G — Outpatient clinic.** Clinic visits with neurologist, history review,
medication reconciliation, risk factors, HbA1c/LDL plans, functional status,
education, care plan, next follow-up and optional existing appointment id.
Longitudinal BP readings and a cross-facility patient summary are available.
Repeat NIHSS continues to use the existing assessments workflow.

**H — Transfer/referral.** Transfers now carry sending/receiving facilities,
reason, type (clinic, ED, inpatient stroke unit, rehab, external hospital),
priority, structured clinical summary, referring/accepting clinicians, request/
acceptance/departure/arrival timestamps, transport status and arrival confirmation.
`GET /stroke-care/transfers/:id/summary-fhir` returns a FHIR R4 collection bundle
(Patient, Encounter, Condition, ServiceRequest) using the existing interoperability
shape and writes a `fhir_exported` audit event.

---

## 6. Tests

```bash
# Backend — protocols, lifecycle, FHIR, profile, Modules C–H (65 tests)
cd backend && npx jest src/stroke-care --runInBand

# Frontend — NIHSS preview, untestable handling, formatting (7 tests)
cd interface/new && npx vitest run src/test/strokeCare.test.ts
```

Covered behaviours include: NIHSS max/invalid/missing fields, severity bands,
4.5-hour and 24-hour windows, `unknown` CT results, haemorrhage handling, raised
BP, mandatory signatures, order-set acknowledgements, withheld-decision reasons,
facility module validation, audit writes, and null quality denominators.

---

## 7. Known limitations / follow-ups

- **No Orthanc/PACS server exists in this repository.** The module stores an
  `imaging_id` or DICOM `StudyInstanceUID`, retrieves stored metadata and links to
  the existing authorized `/dicom` viewer. A DICOMweb/WADO-RS bridge is a
  deployment task, not a second image store.
- **Reperfusion criteria are a checklist, not a validated medical device.** They
  must be reviewed by the facility's stroke programme before clinical use.
- **Functional instruments require local validation.** The mRS and Barthel Index
  are clinician-entered; the facility must confirm licensing, translation and
  validation for its jurisdiction.
- **Inpatient dashboard reads existing modules.** It surfaces vitals, MAR and lab
  context but does not replace nursing, pharmacy or laboratory documentation.
- Speech recognition, autonomous treatment recommendations and AI imaging
  diagnosis were deliberately not added. No eligibility or recovery score is
  calculated automatically.

