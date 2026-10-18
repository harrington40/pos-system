-- OpenRx Stroke Care — reversible down migration for Modules D–H.
--
-- WARNING: this removes clinical data created by Modules D–H. Take a verified
-- backup and obtain clinical-informatics approval before running it. Modules
-- A–C tables (activations, assessments, orders, decisions, milestones,
-- notifications, treatment events, and audit) are intentionally preserved so
-- the original stroke workflow remains usable.
--
-- Every statement is a plain DROP TABLE; there is no CASCADE and no change to
-- existing OpenRx patient, encounter, facility, medication or appointment data.

DROP TABLE IF EXISTS stroke_assessment_items;
DROP TABLE IF EXISTS stroke_bp_readings;
DROP TABLE IF EXISTS stroke_clinic_visits;
DROP TABLE IF EXISTS stroke_functional_assessments;
DROP TABLE IF EXISTS stroke_rehab_sessions;
DROP TABLE IF EXISTS stroke_rehab_plans;
DROP TABLE IF EXISTS stroke_rehab_referrals;
DROP TABLE IF EXISTS stroke_discharge_plans;
DROP TABLE IF EXISTS stroke_complications;
DROP TABLE IF EXISTS stroke_care_plans;
DROP TABLE IF EXISTS stroke_inpatient_assessments;
DROP TABLE IF EXISTS stroke_inpatient_stays;
DROP TABLE IF EXISTS stroke_radiology_reports;
DROP TABLE IF EXISTS stroke_facility_users;

-- Remove only the interoperability context columns added by this phase.
ALTER TABLE stroke_assessments
  DROP COLUMN IF EXISTS encounter_id,
  DROP COLUMN IF EXISTS facility_id;

ALTER TABLE stroke_imaging_studies
  DROP COLUMN IF EXISTS encounter_id,
  DROP COLUMN IF EXISTS facility_id,
  DROP COLUMN IF EXISTS version;

ALTER TABLE stroke_treatment_events
  DROP COLUMN IF EXISTS encounter_id,
  DROP COLUMN IF EXISTS facility_id,
  DROP COLUMN IF EXISTS version;
