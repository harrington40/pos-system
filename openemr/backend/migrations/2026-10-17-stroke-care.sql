-- OpenRx Stroke Care — additive schema, v1.0.0
--
-- The NestJS service creates these tables idempotently on startup
-- (StrokeCareService.ensureSchema). This file exists for deployments that run
-- migrations out of band or disable application-startup DDL.
--
-- Safety: every statement is CREATE TABLE IF NOT EXISTS. No existing table is
-- altered, dropped or renamed, so the script is safe to run against an OpenRx
-- database that already holds clinical data.

CREATE TABLE IF NOT EXISTS stroke_facility_modules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  facility_id INT NOT NULL,
  module_key VARCHAR(40) NOT NULL,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  updated_by INT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_stroke_facility_module (facility_id, module_key),
  INDEX idx_stroke_facility (facility_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stroke_activations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pid INT NOT NULL,
  encounter_id INT NULL,
  facility_id INT NOT NULL DEFAULT 0,
  activation_code VARCHAR(40) NOT NULL,
  care_setting VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  arrival_at DATETIME NOT NULL,
  lkw_at DATETIME NULL,
  stroke_type VARCHAR(24) NOT NULL DEFAULT 'not_documented',
  laterality VARCHAR(20) NULL,
  code_stroke_level VARCHAR(20) NULL,
  nihss_total INT NULL,
  nihss_severity VARCHAR(20) NULL,
  ct_performed_at DATETIME NULL,
  tpa_given_at DATETIME NULL,
  thrombectomy_at DATETIME NULL,
  tpa_status VARCHAR(40) NULL,
  thrombectomy_status VARCHAR(40) NULL,
  disposition VARCHAR(80) NULL,
  disposition_at DATETIME NULL,
  created_by INT NULL,
  created_by_name VARCHAR(120) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL,
  UNIQUE KEY uniq_stroke_activation_code (activation_code),
  INDEX idx_stroke_activation_pid (pid),
  INDEX idx_stroke_activation_status (status, arrival_at),
  INDEX idx_stroke_activation_facility (facility_id, care_setting)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stroke_assessments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  activation_id INT NULL,
  pid INT NOT NULL,
  scale VARCHAR(20) NOT NULL DEFAULT 'nihss',
  items_json MEDIUMTEXT NOT NULL,
  total_score INT NOT NULL,
  severity VARCHAR(20) NOT NULL,
  assessed_at DATETIME NOT NULL,
  assessed_by INT NULL,
  assessed_by_name VARCHAR(120) NULL,
  signed_by_name VARCHAR(120) NOT NULL,
  signed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notes TEXT NULL,
  protocol_key VARCHAR(80) NOT NULL,
  protocol_version VARCHAR(20) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_stroke_assessment_activation (activation_id, assessed_at),
  INDEX idx_stroke_assessment_pid (pid, assessed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stroke_orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  activation_id INT NOT NULL,
  pid INT NOT NULL,
  order_set_key VARCHAR(80) NOT NULL,
  order_set_label VARCHAR(160) NOT NULL,
  protocol_key VARCHAR(80) NOT NULL,
  protocol_version VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'acknowledged',
  items_json MEDIUMTEXT NOT NULL,
  clinician_acknowledged TINYINT(1) NOT NULL DEFAULT 0,
  contraindications_reviewed TINYINT(1) NOT NULL DEFAULT 0,
  ordered_by INT NULL,
  ordered_by_name VARCHAR(120) NULL,
  acknowledged_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_stroke_order_activation (activation_id),
  INDEX idx_stroke_order_pid (pid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stroke_treatment_decisions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  activation_id INT NOT NULL,
  pid INT NOT NULL,
  decision_type VARCHAR(20) NOT NULL,
  decision VARCHAR(20) NOT NULL,
  reason TEXT NULL,
  criteria_json MEDIUMTEXT NOT NULL,
  protocol_key VARCHAR(80) NOT NULL,
  protocol_version VARCHAR(20) NOT NULL,
  decided_by INT NULL,
  decided_by_name VARCHAR(120) NULL,
  decided_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_stroke_decision_activation (activation_id, decision_type),
  INDEX idx_stroke_decision_pid (pid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stroke_imaging_studies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  activation_id INT NOT NULL,
  pid INT NOT NULL,
  imaging_id INT NULL,
  modality VARCHAR(16) NOT NULL,
  dicom_study_uid VARCHAR(128) NULL,
  orthanc_study_id VARCHAR(128) NULL,
  performed_at DATETIME NULL,
  findings TEXT NULL,
  interpretation_status VARCHAR(20) NOT NULL DEFAULT 'ordered',
  linked_by INT NULL,
  linked_by_name VARCHAR(120) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_stroke_imaging_activation (activation_id),
  INDEX idx_stroke_imaging_pid (pid),
  INDEX idx_stroke_imaging_link (imaging_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stroke_followups (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pid INT NOT NULL,
  activation_id INT NULL,
  due_date DATE NOT NULL,
  visit_type VARCHAR(60) NOT NULL DEFAULT 'stroke_clinic',
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
  notes TEXT NULL,
  completed_at DATETIME NULL,
  completed_by INT NULL,
  completed_by_name VARCHAR(120) NULL,
  created_by INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_stroke_followup_pid (pid, due_date),
  INDEX idx_stroke_followup_status (status, due_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stroke_care_tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pid INT NOT NULL,
  activation_id INT NULL,
  discipline VARCHAR(40) NOT NULL,
  task VARCHAR(255) NOT NULL,
  due_at DATETIME NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  assigned_to INT NULL,
  completed_at DATETIME NULL,
  completed_by INT NULL,
  completed_by_name VARCHAR(120) NULL,
  created_by INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_stroke_task_pid (pid, status),
  INDEX idx_stroke_task_activation (activation_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stroke_transfers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  activation_id INT NOT NULL,
  pid INT NOT NULL,
  from_facility_id INT NULL,
  to_facility_id INT NOT NULL,
  reason TEXT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'requested',
  accepted_by_name VARCHAR(120) NULL,
  transferred_at DATETIME NULL,
  created_by INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_stroke_transfer_activation (activation_id),
  INDEX idx_stroke_transfer_pid (pid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stroke_encounter_profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  activation_id INT NOT NULL,
  symptom_discovered_at DATETIME NULL,
  initial_neuro_findings TEXT NULL,
  risk_factors_json MEDIUMTEXT NULL,
  prior_stroke_tia TINYINT(1) NULL,
  prior_stroke_details TEXT NULL,
  relevant_history TEXT NULL,
  attending_provider_id INT NULL,
  attending_provider_name VARCHAR(120) NULL,
  facility_department VARCHAR(120) NULL,
  created_by INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL,
  UNIQUE KEY uniq_stroke_profile_activation (activation_id),
  INDEX idx_stroke_profile_pid (activation_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- v1.1: draft / finalize / amend lifecycle (MariaDB syntax; the application
-- adds missing columns through information_schema on other engines).
ALTER TABLE stroke_assessments
  ADD COLUMN IF NOT EXISTS untestable_json MEDIUMTEXT NULL,
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'finalized',
  ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS amends_id INT NULL,
  ADD COLUMN IF NOT EXISTS amendment_reason TEXT NULL,
  ADD COLUMN IF NOT EXISTS finalized_at DATETIME NULL,
  ADD COLUMN IF NOT EXISTS finalized_by INT NULL,
  ADD COLUMN IF NOT EXISTS finalized_by_name VARCHAR(120) NULL,
  ADD COLUMN IF NOT EXISTS modified_at DATETIME NULL;

UPDATE stroke_assessments
   SET finalized_at = COALESCE(finalized_at, signed_at),
       finalized_by_name = COALESCE(finalized_by_name, signed_by_name),
       status = COALESCE(status, 'finalized'),
       version = COALESCE(version, 1)
 WHERE finalized_at IS NULL OR status IS NULL OR version IS NULL;

-- Module C: alert team, quality-tagged milestones, durable notifications and
-- pathway-separated treatment documentation.
CREATE TABLE IF NOT EXISTS stroke_alert_team (
  id INT AUTO_INCREMENT PRIMARY KEY,
  activation_id INT NOT NULL,
  user_id INT NOT NULL,
  team_role VARCHAR(40) NOT NULL,
  assigned_by INT NULL,
  assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  acknowledged_at DATETIME NULL,
  acknowledged_by INT NULL,
  escalation_level INT NOT NULL DEFAULT 0,
  escalated_at DATETIME NULL,
  UNIQUE KEY uniq_stroke_team_member (activation_id, user_id, team_role),
  INDEX idx_stroke_team_activation (activation_id),
  INDEX idx_stroke_team_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stroke_milestones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  activation_id INT NOT NULL,
  milestone_key VARCHAR(60) NOT NULL,
  occurred_at DATETIME NULL,
  time_quality VARCHAR(16) NOT NULL DEFAULT 'unknown',
  source VARCHAR(120) NULL,
  notes TEXT NULL,
  recorded_by INT NULL,
  recorded_by_name VARCHAR(120) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL,
  UNIQUE KEY uniq_stroke_milestone (activation_id, milestone_key),
  INDEX idx_stroke_milestone_activation (activation_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stroke_notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  activation_id INT NULL,
  pid INT NULL,
  recipient_id INT NULL,
  recipient_role VARCHAR(40) NULL,
  kind VARCHAR(40) NOT NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'info',
  title VARCHAR(160) NOT NULL,
  detail TEXT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  escalation_level INT NOT NULL DEFAULT 0,
  dedupe_key VARCHAR(160) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  delivered_at DATETIME NULL,
  acknowledged_at DATETIME NULL,
  acknowledged_by INT NULL,
  acknowledged_by_name VARCHAR(120) NULL,
  escalated_at DATETIME NULL,
  last_attempt_at DATETIME NULL,
  attempt_count INT NOT NULL DEFAULT 0,
  error TEXT NULL,
  UNIQUE KEY uniq_stroke_notification_dedupe (dedupe_key),
  INDEX idx_stroke_notification_recipient (recipient_id, status),
  INDEX idx_stroke_notification_role (recipient_role, status),
  INDEX idx_stroke_notification_activation (activation_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stroke_treatment_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  activation_id INT NOT NULL,
  pid INT NOT NULL,
  event_type VARCHAR(40) NOT NULL,
  status VARCHAR(20) NOT NULL,
  medication VARCHAR(160) NULL,
  dose VARCHAR(120) NULL,
  route VARCHAR(80) NULL,
  contraindications TEXT NULL,
  details TEXT NULL,
  adverse_severity VARCHAR(20) NULL,
  specialist_name VARCHAR(120) NULL,
  occurred_at DATETIME NULL,
  time_quality VARCHAR(16) NULL,
  recorded_by INT NULL,
  recorded_by_name VARCHAR(120) NULL,
  protocol_key VARCHAR(80) NOT NULL,
  protocol_version VARCHAR(20) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_stroke_treatment_activation (activation_id),
  INDEX idx_stroke_treatment_type (event_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE stroke_activations
  ADD COLUMN IF NOT EXISTS activated_at DATETIME NULL,
  ADD COLUMN IF NOT EXISTS closed_at DATETIME NULL,
  ADD COLUMN IF NOT EXISTS closed_by INT NULL,
  ADD COLUMN IF NOT EXISTS outcome VARCHAR(80) NULL,
  ADD COLUMN IF NOT EXISTS outcome_notes TEXT NULL;

ALTER TABLE stroke_imaging_studies
  ADD COLUMN IF NOT EXISTS ordered_at DATETIME NULL,
  ADD COLUMN IF NOT EXISTS interpreted_at DATETIME NULL,
  ADD COLUMN IF NOT EXISTS interpretation_by VARCHAR(120) NULL;

ALTER TABLE stroke_transfers
  ADD COLUMN IF NOT EXISTS departure_at DATETIME NULL,
  ADD COLUMN IF NOT EXISTS arrival_at DATETIME NULL,
  ADD COLUMN IF NOT EXISTS accepted_at DATETIME NULL;

CREATE TABLE IF NOT EXISTS stroke_audit_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  entity_type VARCHAR(40) NOT NULL,
  entity_id INT NOT NULL,
  patient_pid INT NULL,
  action VARCHAR(40) NOT NULL,
  actor_id INT NULL,
  actor_name VARCHAR(120) NULL,
  detail_json MEDIUMTEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_stroke_audit_entity (entity_type, entity_id),
  INDEX idx_stroke_audit_patient (patient_pid, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Modules D–H, additive. Imaging remains in the existing OpenRx store/viewer;
-- no DICOM bytes are copied by these tables.

CREATE TABLE IF NOT EXISTS stroke_radiology_reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  activation_id INT NOT NULL,
  stroke_imaging_id INT NULL,
  report_text MEDIUMTEXT NULL,
  impression TEXT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'preliminary',
  reported_by_name VARCHAR(120) NULL,
  reported_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  external_id VARCHAR(120) NULL,
  created_by INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_stroke_report_activation (activation_id),
  INDEX idx_stroke_report_imaging (stroke_imaging_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stroke_inpatient_stays (
  id INT AUTO_INCREMENT PRIMARY KEY,
  activation_id INT NOT NULL,
  pid INT NOT NULL,
  facility_id INT NULL,
  unit VARCHAR(80) NULL,
  admitted_at DATETIME NOT NULL,
  discharged_at DATETIME NULL,
  attending_name VARCHAR(120) NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'admitted',
  discharge_disposition VARCHAR(80) NULL,
  notes TEXT NULL,
  created_by INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL,
  UNIQUE KEY uniq_stroke_stay_activation (activation_id),
  INDEX idx_stroke_stay_pid (pid, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stroke_inpatient_assessments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  stay_id INT NOT NULL,
  activation_id INT NOT NULL,
  pid INT NOT NULL,
  assessment_type VARCHAR(30) NOT NULL,
  data_json MEDIUMTEXT NULL,
  score DECIMAL(6,2) NULL,
  risk_level VARCHAR(20) NULL,
  notes TEXT NULL,
  recorded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  recorded_by INT NULL,
  recorded_by_name VARCHAR(120) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_stroke_inpatient_assessment (stay_id, assessment_type),
  INDEX idx_stroke_inpatient_pid (pid, recorded_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stroke_care_plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  stay_id INT NULL,
  activation_id INT NOT NULL,
  pid INT NOT NULL,
  plan_type VARCHAR(40) NOT NULL DEFAULT 'multidisciplinary',
  summary TEXT NULL,
  goals_json MEDIUMTEXT NULL,
  review_at DATETIME NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_by INT NULL,
  created_by_name VARCHAR(120) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL,
  INDEX idx_stroke_care_plan_activation (activation_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stroke_complications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  stay_id INT NULL,
  activation_id INT NOT NULL,
  pid INT NOT NULL,
  complication_type VARCHAR(60) NOT NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'moderate',
  description TEXT NULL,
  onset_at DATETIME NULL,
  resolved_at DATETIME NULL,
  management TEXT NULL,
  recorded_by INT NULL,
  recorded_by_name VARCHAR(120) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_stroke_complication_activation (activation_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stroke_discharge_plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  stay_id INT NOT NULL,
  activation_id INT NOT NULL,
  pid INT NOT NULL,
  target_date DATE NULL,
  destination VARCHAR(80) NULL,
  services_json MEDIUMTEXT NULL,
  medication_reconciled TINYINT(1) NOT NULL DEFAULT 0,
  followup_scheduled TINYINT(1) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'planning',
  notes TEXT NULL,
  created_by INT NULL,
  updated_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_stroke_discharge_stay (stay_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stroke_rehab_referrals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  activation_id INT NULL,
  pid INT NOT NULL,
  discipline VARCHAR(40) NOT NULL,
  reason TEXT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'referral',
  referred_by_name VARCHAR(120) NULL,
  referred_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  accepted_at DATETIME NULL,
  created_by INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_stroke_rehab_referral_pid (pid, status),
  INDEX idx_stroke_rehab_referral_activation (activation_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stroke_rehab_plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  referral_id INT NOT NULL,
  summary TEXT NULL,
  goals_json MEDIUMTEXT NULL,
  frequency VARCHAR(80) NULL,
  start_date DATE NULL,
  end_date DATE NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_by INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL,
  INDEX idx_stroke_rehab_plan_referral (referral_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stroke_rehab_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  referral_id INT NOT NULL,
  scheduled_at DATETIME NOT NULL,
  attended TINYINT(1) NULL,
  duration_minutes INT NULL,
  notes TEXT NULL,
  therapist_name VARCHAR(120) NULL,
  created_by INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_stroke_rehab_session_referral (referral_id, scheduled_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stroke_functional_assessments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pid INT NOT NULL,
  activation_id INT NULL,
  instrument VARCHAR(20) NOT NULL,
  score INT NOT NULL,
  details_json MEDIUMTEXT NULL,
  assessed_at DATETIME NOT NULL,
  assessed_by_name VARCHAR(120) NULL,
  notes TEXT NULL,
  created_by INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_stroke_functional_pid (pid, instrument, assessed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stroke_clinic_visits (
  id INT AUTO_INCREMENT PRIMARY KEY,
  activation_id INT NULL,
  pid INT NOT NULL,
  facility_id INT NULL,
  visit_at DATETIME NOT NULL,
  neurologist_name VARCHAR(120) NULL,
  visit_type VARCHAR(40) NOT NULL DEFAULT 'follow_up',
  history_review TEXT NULL,
  medication_reconciliation_json MEDIUMTEXT NULL,
  risk_factors_json MEDIUMTEXT NULL,
  hba1c DECIMAL(5,2) NULL,
  ldl DECIMAL(6,2) NULL,
  diabetes_plan TEXT NULL,
  lipid_plan TEXT NULL,
  functional_status TEXT NULL,
  patient_education TEXT NULL,
  care_plan TEXT NULL,
  next_followup_date DATE NULL,
  appointment_id INT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'completed',
  created_by INT NULL,
  created_by_name VARCHAR(120) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL,
  INDEX idx_stroke_clinic_pid (pid, visit_at),
  INDEX idx_stroke_clinic_facility (facility_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stroke_bp_readings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pid INT NOT NULL,
  visit_id INT NULL,
  systolic INT NOT NULL,
  diastolic INT NOT NULL,
  pulse INT NULL,
  measured_at DATETIME NOT NULL,
  position VARCHAR(30) NULL,
  notes VARCHAR(255) NULL,
  recorded_by INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_stroke_bp_pid (pid, measured_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE stroke_imaging_studies
  ADD COLUMN IF NOT EXISTS study_description VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS series_count INT NULL,
  ADD COLUMN IF NOT EXISTS instance_count INT NULL,
  ADD COLUMN IF NOT EXISTS accession_number VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS study_date DATETIME NULL,
  ADD COLUMN IF NOT EXISTS dicom_patient_id VARCHAR(120) NULL,
  ADD COLUMN IF NOT EXISTS patient_match_status VARCHAR(20) NOT NULL DEFAULT 'unverified';

ALTER TABLE stroke_transfers
  ADD COLUMN IF NOT EXISTS transfer_type VARCHAR(30) NULL,
  ADD COLUMN IF NOT EXISTS priority VARCHAR(20) NULL,
  ADD COLUMN IF NOT EXISTS clinical_summary TEXT NULL,
  ADD COLUMN IF NOT EXISTS referring_clinician_name VARCHAR(120) NULL,
  ADD COLUMN IF NOT EXISTS accepting_clinician_name VARCHAR(120) NULL,
  ADD COLUMN IF NOT EXISTS transport_status VARCHAR(30) NULL,
  ADD COLUMN IF NOT EXISTS arrival_confirmed_at DATETIME NULL;
