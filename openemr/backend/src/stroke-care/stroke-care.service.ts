import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  ACUTE_ISCHEMIC_STROKE_PROTOCOL,
  ADVERSE_SEVERITIES,
  ISCHEMIC_ONLY_EVENTS,
  NIHSS_ITEMS,
  NIHSS_LOINC,
  NIHSS_PROTOCOL,
  NIHSS_UNTESTABLE_KEYS,
  STROKE_FOLLOW_UP_PROTOCOL,
  STROKE_MILESTONES,
  STROKE_TEAM_ROLES,
  STROKE_MODULES,
  STROKE_ORDER_SETS,
  STROKE_TIMING_TARGETS,
  TIME_QUALITIES,
  TREATMENT_EVENT_STATUSES,
  TREATMENT_EVENT_TYPES,
  defaultModulesForSetting,
  evaluateTreatmentCriteria,
  getOrderSet,
  nihssSeverity,
  pathwayForStrokeType,
  scoreNihss,
  strokeModuleKeys,
} from './stroke-protocols';
import type {
  CareSetting,
  NihssUntestableMap,
  StrokeType,
  TimeQuality,
  TreatmentCriteriaInput,
} from './stroke-protocols';
import {
  STROKE_FHIR_PROFILES,
  STROKE_FHIR_VERSION,
  applyFhirProfiles,
  validateFhirBundle,
  type FhirBundle,
  type FhirResource,
} from './stroke-fhir';

/** The authenticated clinician performing a change, supplied by the controller. */
export interface StrokeActor {
  id?: number;
  username?: string;
  displayName?: string;
  role?: string;
}

/** Affected-rows result of an INSERT / UPDATE / DELETE. */
interface AffectedRowsResult {
  affectedRows: number;
  insertId: number;
}

const CARE_SETTINGS: CareSetting[] = ['outpatient', 'acute', 'comprehensive'];

const STROKE_TYPES: StrokeType[] = [
  'ischemic',
  'hemorrhagic',
  'undetermined',
  'tia',
  'not_documented',
];

const ACTIVATION_STATUSES = [
  'active',
  'in_progress',
  'completed',
  'cancelled',
] as const;

const DECISION_TYPES = ['thrombolysis', 'thrombectomy'] as const;
const DECISION_OUTCOMES = [
  'given',
  'withheld',
  'not_indicated',
  'pending',
] as const;

const MODALITIES = ['ct', 'cta', 'ctp', 'mri', 'mra', 'angiography'] as const;

const TRANSFER_STATUSES = [
  'requested',
  'accepted',
  'departed',
  'arrived',
  'cancelled',
] as const;

const TRANSFER_TYPES = [
  'outpatient_clinic',
  'emergency_department',
  'inpatient_stroke_unit',
  'rehabilitation_facility',
  'external_hospital',
] as const;
const TRANSFER_PRIORITIES = ['routine', 'urgent', 'emergent'] as const;
const TRANSPORT_STATUSES = [
  'arranged',
  'en_route',
  'arrived',
  'cancelled',
] as const;

const IMAGING_STATUSES = [
  'ordered',
  'performed',
  'reported',
  'reviewed',
] as const;

const TASK_STATUSES = [
  'open',
  'in_progress',
  'completed',
  'cancelled',
] as const;

const MAX_TEXT = 255;

// ── Validation helpers ───────────────────────────────────────────────────────

function requiredText(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new BadRequestException(`${label} is required.`);
  }
  const text = value.trim();
  if (text.length > MAX_TEXT) {
    throw new BadRequestException(
      `${label} must be ${MAX_TEXT} characters or fewer.`,
    );
  }
  return text;
}

function optionalText(
  value: unknown,
  label: string,
  max = 2000,
): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') {
    throw new BadRequestException(`${label} must be text.`);
  }
  const text = value.trim();
  if (text.length > max) {
    throw new BadRequestException(
      `${label} must be ${max} characters or fewer.`,
    );
  }
  return text === '' ? null : text;
}

function optionalInteger(
  value: unknown,
  label: string,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
): number | null {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) {
    throw new BadRequestException(
      `${label} must be a whole number between ${min} and ${max}.`,
    );
  }
  return n;
}

function optionalDecimal(
  value: unknown,
  label: string,
  min: number,
  max: number,
): number | null {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) {
    throw new BadRequestException(
      `${label} must be a number between ${min} and ${max}.`,
    );
  }
  return n;
}

function requiredInteger(
  value: unknown,
  label: string,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
): number {
  if (value === undefined || value === null || value === '') {
    throw new BadRequestException(`${label} is required.`);
  }
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) {
    throw new BadRequestException(
      `${label} must be a whole number between ${min} and ${max}.`,
    );
  }
  return n;
}

function requireSignature(value: unknown, label: string): true {
  if (value !== true) {
    throw new BadRequestException(
      `${label} must be explicitly confirmed by the clinician.`,
    );
  }
  return true;
}

/**
 * Convert a client date to the DATETIME form MySQL stores.
 *
 * An unparseable date is rejected at the boundary rather than becoming
 * `Invalid Date`, which mysql2 would send as the string "Invalid Date" and
 * MySQL would silently coerce to zero.
 */
function optionalDate(value: unknown, label: string): string | null {
  if (value === undefined || value === null || value === '') return null;
  const d =
    value instanceof Date
      ? value
      : typeof value === 'string' || typeof value === 'number'
        ? new Date(value)
        : null;
  if (!d || Number.isNaN(d.getTime())) {
    throw new BadRequestException(`${label} must be a valid date and time.`);
  }
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

function requiredDate(value: unknown, label: string): string {
  const parsed = optionalDate(value, label);
  if (!parsed) throw new BadRequestException(`${label} is required.`);
  return parsed;
}

function oneOf<T extends string>(
  value: unknown,
  allowed: readonly T[] | T[],
  label: string,
  fallback?: T,
): T {
  if (value === undefined || value === null || value === '') {
    if (fallback !== undefined) return fallback;
    throw new BadRequestException(
      `${label} must be one of: ${allowed.join(', ')}.`,
    );
  }
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw new BadRequestException(
      `${label} must be one of: ${allowed.join(', ')}.`,
    );
  }
  return value as T;
}

// ── Request bodies ───────────────────────────────────────────────────────────

export interface ActivationDto {
  patientId?: number | string;
  encounterId?: number | string | null;
  facilityId?: number | string | null;
  careSetting?: string;
  arrivalAt?: string;
  activatedAt?: string;
  lkwAt?: string | null;
  strokeType?: string;
  laterality?: string | null;
  codeStrokeLevel?: string | null;
  initialNihssTotal?: number | string | null;
}

export interface ActivationUpdateDto {
  status?: string;
  strokeType?: string;
  laterality?: string | null;
  codeStrokeLevel?: string | null;
  encounterId?: number | string | null;
  arrivalAt?: string;
  lkwAt?: string | null;
  ctPerformedAt?: string | null;
  tpaGivenAt?: string | null;
  thrombectomyAt?: string | null;
  tpaStatus?: string | null;
  thrombectomyStatus?: string | null;
  disposition?: string | null;
  dispositionAt?: string | null;
}

export interface AssessmentDto {
  items?: Record<string, number | string | null | undefined>;
  /** Items the scale permits documenting as untestable, with a reason. */
  untestable?: NihssUntestableMap;
  assessedAt?: string;
  notes?: string | null;
  signedByName?: string;
  signatureConfirmed?: boolean;
  /** Defaults to true for backward compatibility with the signed endpoint. */
  finalize?: boolean;
}

export interface FinalizeAssessmentDto {
  assessedAt?: string;
  notes?: string | null;
  signedByName?: string;
  signatureConfirmed?: boolean;
}

export interface AmendAssessmentDto extends AssessmentDto {
  amendmentReason?: string;
}

export interface EncounterProfileDto {
  symptomDiscoveredAt?: string | null;
  initialNeuroFindings?: string | null;
  riskFactors?: string[];
  priorStrokeTia?: boolean | null;
  priorStrokeDetails?: string | null;
  relevantHistory?: string | null;
  attendingProviderId?: number | string | null;
  attendingProviderName?: string | null;
  facilityDepartment?: string | null;
  encounterStatus?: string;
}

export interface TeamMemberDto {
  userId?: number | string;
  teamRole?: string;
}

export interface MilestoneDto {
  milestoneKey?: string;
  occurredAt?: string | null;
  timeQuality?: string;
  source?: string | null;
  notes?: string | null;
}

export interface CloseActivationDto {
  outcome?: string;
  disposition?: string | null;
  notes?: string | null;
  closedAt?: string | null;
}

export interface TreatmentEventDto {
  eventType?: string;
  status?: string;
  medication?: string | null;
  dose?: string | null;
  route?: string | null;
  contraindications?: string | null;
  details?: string | null;
  adverseSeverity?: string | null;
  specialistName?: string | null;
  occurredAt?: string | null;
  timeQuality?: string;
}

export interface ImagingUpdateDto {
  interpretationStatus?: string;
  performedAt?: string | null;
  orderedAt?: string | null;
  interpretedAt?: string | null;
  findings?: string | null;
}

export interface TransferUpdateDto {
  status?: string;
  departureAt?: string | null;
  arrivalAt?: string | null;
  acceptedByName?: string | null;
  transferType?: string;
  priority?: string;
  clinicalSummary?: string | null;
  referringClinicianName?: string | null;
  acceptingClinicianName?: string | null;
  transportStatus?: string;
  arrivalConfirmedAt?: string | null;
}

export interface RadiologyReportDto {
  strokeImagingId?: number | string | null;
  reportText?: string | null;
  impression?: string | null;
  status?: string;
  reportedAt?: string | null;
  externalId?: string | null;
}

export interface InpatientAdmitDto {
  facilityId?: number | string | null;
  unit?: string | null;
  admittedAt?: string;
  room?: string | null;
  attendingName?: string | null;
  notes?: string | null;
}

export interface InpatientAssessmentDto {
  assessmentType?: string;
  data?: Record<string, unknown>;
  score?: number | string | null;
  riskLevel?: string | null;
  notes?: string | null;
  recordedAt?: string | null;
}

export interface CarePlanDto {
  planType?: string;
  summary?: string | null;
  goals?: string[];
  reviewAt?: string | null;
  status?: string;
}

export interface ComplicationDto {
  complicationType?: string;
  severity?: string;
  description?: string | null;
  onsetAt?: string | null;
  resolvedAt?: string | null;
  management?: string | null;
}

export interface DischargePlanDto {
  targetDate?: string | null;
  destination?: string | null;
  services?: string[];
  medicationReconciled?: boolean;
  followupScheduled?: boolean;
  status?: string;
  notes?: string | null;
}

export interface RehabReferralDto {
  activationId?: number | string | null;
  discipline?: string;
  reason?: string | null;
}

export interface RehabPlanDto {
  summary?: string | null;
  goals?: string[];
  frequency?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  status?: string;
}

export interface RehabSessionDto {
  scheduledAt?: string;
  attended?: boolean | null;
  durationMinutes?: number | string | null;
  notes?: string | null;
  therapistName?: string | null;
}

export interface FunctionalAssessmentDto {
  instrument?: string;
  score?: number | string;
  activationId?: number | string | null;
  assessedAt?: string;
  assessedByName?: string | null;
  details?: Record<string, unknown>;
  notes?: string | null;
}

export interface ClinicVisitDto {
  activationId?: number | string | null;
  facilityId?: number | string | null;
  visitAt?: string;
  neurologistName?: string | null;
  visitType?: string;
  historyReview?: string | null;
  medicationReconciliation?: Array<Record<string, unknown>>;
  riskFactors?: string[];
  hba1c?: number | string | null;
  ldl?: number | string | null;
  diabetesPlan?: string | null;
  lipidPlan?: string | null;
  functionalStatus?: string | null;
  patientEducation?: string | null;
  carePlan?: string | null;
  nextFollowupDate?: string | null;
  appointmentId?: number | string | null;
  status?: string;
}

export interface BpReadingDto {
  visitId?: number | string | null;
  systolic?: number | string;
  diastolic?: number | string;
  pulse?: number | string | null;
  measuredAt?: string;
  position?: string | null;
  notes?: string | null;
}

export interface OrderDto {
  orderSetKey?: string;
  clinicianAcknowledged?: boolean;
  contraindicationsReviewed?: boolean;
  notes?: string | null;
}

export interface DecisionDto extends TreatmentCriteriaInput {
  decisionType?: string;
  decision?: string;
  reason?: string | null;
}

export interface ImagingLinkDto {
  imagingId?: number | string | null;
  modality?: string;
  dicomStudyUid?: string | null;
  orthancStudyId?: string | null;
  orderedAt?: string | null;
  performedAt?: string | null;
  interpretedAt?: string | null;
  findings?: string | null;
  interpretationStatus?: string | null;
  studyDescription?: string | null;
  accessionNumber?: string | null;
  seriesCount?: number | string | null;
  instanceCount?: number | string | null;
  studyDate?: string | null;
  dicomPatientId?: string | null;
  patientMatchConfirmed?: boolean;
}

export interface TransferCreateDto extends TransferDto {
  departureAt?: string | null;
}

export interface TransferDto {
  toFacilityId?: number | string;
  reason?: string;
  acceptedByName?: string | null;
  transferType?: string;
  priority?: string;
  clinicalSummary?: string | null;
  referringClinicianName?: string | null;
  acceptingClinicianName?: string | null;
  transportStatus?: string;
}

export interface FollowUpDto {
  dueDate?: string;
  visitType?: string;
  notes?: string | null;
}

export interface TaskDto {
  discipline?: string;
  task?: string;
  dueAt?: string | null;
  assignedTo?: number | string | null;
}

export interface FacilityModulesDto {
  modules?: Array<{ key?: string; enabled?: boolean }>;
}

// ── Row shapes returned by the raw SQL above ─────────────────────────────────

interface ActivationRow {
  id: number;
  pid: number;
  encounter_id: number | null;
  facility_id: number | null;
  activation_code: string;
  care_setting: CareSetting;
  status: string;
  stroke_type: StrokeType;
  laterality: string | null;
  code_stroke_level: string | null;
  nihss_total: number | null;
  nihss_severity: string | null;
  tpa_status: string | null;
  thrombectomy_status: string | null;
  disposition: string | null;
  arrival_at: string;
  lkw_at: string | null;
  ct_performed_at: string | null;
  tpa_given_at: string | null;
  disposition_at: string | null;
  activated_at?: string | null;
  closed_at?: string | null;
  outcome?: string | null;
  outcome_notes?: string | null;
  created_at: string;
  fname: string;
  lname: string;
  mname: string | null;
  DOB: string | null;
  sex: string | null;
  minutes_since_arrival?: number | null;
  door_to_ct_minutes?: number | null;
  door_to_needle_minutes?: number | null;
}

interface AssessmentRow {
  id: number;
  activation_id: number;
  pid: number;
  scale: string;
  items_json?: string;
  untestable_json?: string | null;
  total_score: number;
  severity: string;
  status: string;
  version: number;
  amends_id: number | null;
  amendment_reason: string | null;
  assessed_at: string;
  assessed_by?: number | null;
  assessed_by_name: string | null;
  signed_by_name: string;
  signed_at: string;
  finalized_at: string | null;
  finalized_by_name: string | null;
  notes: string | null;
  protocol_key: string;
  protocol_version: string;
  items?: unknown;
  untestable?: unknown;
}

interface ProfileRow {
  id: number;
  activation_id: number;
  symptom_discovered_at: string | null;
  initial_neuro_findings: string | null;
  risk_factors_json: string | null;
  prior_stroke_tia: number | null;
  prior_stroke_details: string | null;
  relevant_history: string | null;
  attending_provider_id: number | null;
  attending_provider_name: string | null;
  facility_department: string | null;
  updated_at: string | null;
}

interface AllergyRow {
  id: number;
  title: string;
  reaction: string | null;
  severity_al: string | null;
  begdate: string | null;
}

interface MedicationRow {
  id: number;
  drug: string | null;
  dosage: string | null;
  route: string | null;
  start_date: string | null;
}

interface OrderRow {
  id: number;
  order_set_key: string;
  order_set_label: string;
  protocol_version: string;
  status: string;
  ordered_by_name: string | null;
  acknowledged_at: string;
  notes: string | null;
  items_json?: string;
  items?: unknown;
}

interface DecisionRow {
  id: number;
  decision_type: string;
  decision: string;
  reason: string | null;
  decided_by_name: string | null;
  decided_at: string;
  criteria_json?: string;
  criteria?: unknown;
}

interface ImagingRow {
  id: number;
  imaging_id: number | null;
  modality: string;
  dicom_study_uid: string | null;
  orthanc_study_id: string | null;
  ordered_at?: string | null;
  performed_at: string | null;
  interpreted_at?: string | null;
  interpretation_by?: string | null;
  findings: string | null;
  interpretation_status: string;
  study_description?: string | null;
  accession_number?: string | null;
  series_count?: number | null;
  instance_count?: number | null;
  study_date?: string | null;
  dicom_patient_id?: string | null;
  patient_match_status?: string | null;
}

interface StayRow {
  id: number;
  activation_id: number;
  pid: number;
  facility_id: number | null;
  unit: string | null;
  status: string;
  admitted_at: string;
  discharged_at: string | null;
  discharge_disposition: string | null;
  attending_name: string | null;
  notes: string | null;
  room: string | null;
}

interface TransferRow {
  id: number;
  activation_id?: number;
  pid?: number;
  from_facility_id: number | null;
  to_facility_id: number;
  reason: string | null;
  status: string;
  accepted_by_name: string | null;
  transferred_at: string | null;
  departure_at?: string | null;
  arrival_at?: string | null;
  accepted_at?: string | null;
  transfer_type?: string | null;
  priority?: string | null;
  clinical_summary?: string | null;
  referring_clinician_name?: string | null;
  accepting_clinician_name?: string | null;
  transport_status?: string | null;
  arrival_confirmed_at?: string | null;
  created_at: string;
}

interface TaskRow {
  id: number;
  discipline: string;
  task: string;
  status: string;
  due_at: string | null;
  completed_at: string | null;
  assigned_to: number | null;
  completed_by_name: string | null;
}

interface TeamRow {
  id: number;
  activation_id: number;
  user_id: number;
  team_role: string;
  assigned_at: string;
  acknowledged_at: string | null;
  acknowledged_by: number | null;
  escalation_level: number;
  fname: string | null;
  lname: string | null;
}

interface MilestoneRow {
  id: number;
  activation_id: number;
  milestone_key: string;
  occurred_at: string | null;
  time_quality: TimeQuality;
  source: string | null;
  notes: string | null;
  recorded_by_name: string | null;
  updated_at: string | null;
}

interface NotificationRow {
  id: number;
  activation_id: number | null;
  pid: number | null;
  recipient_id: number | null;
  recipient_role: string | null;
  kind: string;
  severity: string;
  title: string;
  detail: string | null;
  status: string;
  escalation_level: number;
  created_at: string;
  delivered_at: string | null;
  acknowledged_at: string | null;
  acknowledged_by_name: string | null;
  escalated_at: string | null;
}

interface TreatmentEventRow {
  id: number;
  activation_id: number;
  pid: number;
  event_type: string;
  status: string;
  medication: string | null;
  dose: string | null;
  route: string | null;
  contraindications: string | null;
  details: string | null;
  adverse_severity: string | null;
  specialist_name: string | null;
  occurred_at: string | null;
  time_quality: string | null;
  recorded_by_name: string | null;
  created_at: string;
}

interface AuditRow {
  id: number;
  entity_type: string;
  entity_id: number;
  action: string;
  actor_id: number | null;
  actor_name: string | null;
  detail_json: string | null;
  created_at: string;
}

interface PatientRow {
  pid: number;
  public_id: string | null;
  fname: string;
  lname: string;
  mname: string | null;
  DOB: string | null;
  sex: string | null;
  phone_contact: string | null;
}

interface FollowUpRow {
  id: number;
  pid: number;
  activation_id: number | null;
  visit_type: string;
  status: string;
  notes: string | null;
  due_date: string;
  completed_at: string | null;
  completed_by_name: string | null;
}

interface SummaryRow {
  total: number | string | null;
  active: number | string | null;
  completed: number | string | null;
  acute: number | string | null;
  outpatient: number | string | null;
  comprehensive: number | string | null;
  thrombolysis_given: number | string | null;
  thrombectomy_given: number | string | null;
}

interface QualityRow {
  activations: number | string | null;
  completed: number | string | null;
  thrombolysis_given: number | string | null;
  thrombectomy_given: number | string | null;
  avg_door_to_ct_minutes: number | string | null;
  avg_door_to_needle_minutes: number | string | null;
  ct_within_target: number | string | null;
  needle_within_target: number | string | null;
}

interface ActivationRecord {
  activation: ActivationRow;
  assessments: AssessmentRow[];
  orders: OrderRow[];
  decisions: DecisionRow[];
  imaging: ImagingRow[];
  transfers: TransferRow[];
  tasks: TaskRow[];
  profile: (ProfileRow & { riskFactors: string[] }) | null;
  criteria: ReturnType<typeof evaluateTreatmentCriteria>;
}

@Injectable()
export class StrokeCareService implements OnModuleInit {
  private readonly logger = new Logger(StrokeCareService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async onModuleInit(): Promise<void> {
    await this.ensureSchema();
  }

  /**
   * Create the stroke-care tables if they do not yet exist.
   *
   * Additive only: no existing table is altered, which is what makes this
   * safe to run on an OpenRx install that already carries clinical data.
   * Production deployments that disable `OnModuleInit` bootstrap can apply
   * the same statements from `backend/migrations/`.
   */
  async ensureSchema(): Promise<void> {
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS stroke_facility_modules (
        id INT AUTO_INCREMENT PRIMARY KEY,
        facility_id INT NOT NULL,
        module_key VARCHAR(40) NOT NULL,
        enabled TINYINT(1) NOT NULL DEFAULT 1,
        updated_by INT NULL,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_stroke_facility_module (facility_id, module_key),
        INDEX idx_stroke_facility (facility_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS stroke_facility_users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        facility_id INT NOT NULL,
        user_id INT NOT NULL,
        created_by INT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_stroke_facility_user (facility_id, user_id),
        INDEX idx_stroke_facility_user (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await this.dataSource.query(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS stroke_assessments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        activation_id INT NULL,
        pid INT NOT NULL,
        scale VARCHAR(20) NOT NULL DEFAULT 'nihss',
        items_json MEDIUMTEXT NOT NULL,
        untestable_json MEDIUMTEXT NULL,
        total_score INT NOT NULL,
        severity VARCHAR(20) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'finalized',
        version INT NOT NULL DEFAULT 1,
        amends_id INT NULL,
        amendment_reason TEXT NULL,
        assessed_at DATETIME NOT NULL,
        assessed_by INT NULL,
        assessed_by_name VARCHAR(120) NULL,
        signed_by_name VARCHAR(120) NOT NULL,
        signed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        finalized_at DATETIME NULL,
        finalized_by INT NULL,
        finalized_by_name VARCHAR(120) NULL,
        modified_at DATETIME NULL,
        notes TEXT NULL,
        protocol_key VARCHAR(80) NOT NULL,
        protocol_version VARCHAR(20) NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_stroke_assessment_activation (activation_id, assessed_at),
        INDEX idx_stroke_assessment_pid (pid, assessed_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS stroke_assessment_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        assessment_id INT NOT NULL,
        activation_id INT NOT NULL,
        pid INT NOT NULL,
        item_key VARCHAR(8) NOT NULL,
        loinc_code VARCHAR(16) NOT NULL,
        loinc_display VARCHAR(255) NOT NULL,
        score INT NULL,
        untestable_reason TEXT NULL,
        data_absent_reason VARCHAR(30) NULL,
        assessed_at DATETIME NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_stroke_assessment_item (assessment_id, item_key),
        INDEX idx_stroke_assessment_item_pid (pid, item_key, assessed_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await this.dataSource.query(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await this.dataSource.query(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await this.dataSource.query(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await this.dataSource.query(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await this.dataSource.query(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await this.dataSource.query(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await this.dataSource.query(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await this.dataSource.query(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await this.dataSource.query(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await this.dataSource.query(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await this.dataSource.query(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await this.dataSource.query(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await this.dataSource.query(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await this.dataSource.query(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await this.dataSource.query(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await this.dataSource.query(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await this.dataSource.query(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await this.dataSource.query(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await this.dataSource.query(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await this.dataSource.query(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await this.dataSource.query(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await this.dataSource.query(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await this.dataSource.query(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await this.dataSource.query(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Additive upgrades for installations that already ran v1 of this module.
    const assessmentColumns: Array<[string, string]> = [
      ['encounter_id', 'INT NULL'],
      ['facility_id', 'INT NULL'],
      ['untestable_json', 'MEDIUMTEXT NULL'],
      ['status', "VARCHAR(20) NOT NULL DEFAULT 'finalized'"],
      ['version', 'INT NOT NULL DEFAULT 1'],
      ['amends_id', 'INT NULL'],
      ['amendment_reason', 'TEXT NULL'],
      ['finalized_at', 'DATETIME NULL'],
      ['finalized_by', 'INT NULL'],
      ['finalized_by_name', 'VARCHAR(120) NULL'],
      ['modified_at', 'DATETIME NULL'],
    ];
    for (const [column, definition] of assessmentColumns) {
      await this.ensureColumn(
        'stroke_assessments',
        column,
        `${column} ${definition}`,
      );
    }
    const activationColumns: Array<[string, string]> = [
      ['activated_at', 'DATETIME NULL'],
      ['closed_at', 'DATETIME NULL'],
      ['closed_by', 'INT NULL'],
      ['outcome', 'VARCHAR(80) NULL'],
      ['outcome_notes', 'TEXT NULL'],
    ];
    for (const [column, definition] of activationColumns) {
      await this.ensureColumn(
        'stroke_activations',
        column,
        `${column} ${definition}`,
      );
    }
    const imagingColumns: Array<[string, string]> = [
      ['encounter_id', 'INT NULL'],
      ['facility_id', 'INT NULL'],
      ['version', 'INT NOT NULL DEFAULT 1'],
      ['ordered_at', 'DATETIME NULL'],
      ['interpreted_at', 'DATETIME NULL'],
      ['interpretation_by', 'VARCHAR(120) NULL'],
      ['study_description', 'VARCHAR(255) NULL'],
      ['series_count', 'INT NULL'],
      ['instance_count', 'INT NULL'],
      ['accession_number', 'VARCHAR(100) NULL'],
      ['study_date', 'DATETIME NULL'],
      ['dicom_patient_id', 'VARCHAR(120) NULL'],
      ['patient_match_status', "VARCHAR(20) NOT NULL DEFAULT 'unverified'"],
    ];
    for (const [column, definition] of imagingColumns) {
      await this.ensureColumn(
        'stroke_imaging_studies',
        column,
        `${column} ${definition}`,
      );
    }
    const treatmentColumns: Array<[string, string]> = [
      ['encounter_id', 'INT NULL'],
      ['facility_id', 'INT NULL'],
      ['version', 'INT NOT NULL DEFAULT 1'],
    ];
    for (const [column, definition] of treatmentColumns) {
      await this.ensureColumn(
        'stroke_treatment_events',
        column,
        `${column} ${definition}`,
      );
    }
    const transferColumns: Array<[string, string]> = [
      ['departure_at', 'DATETIME NULL'],
      ['arrival_at', 'DATETIME NULL'],
      ['accepted_at', 'DATETIME NULL'],
      ['transfer_type', 'VARCHAR(30) NULL'],
      ['priority', 'VARCHAR(20) NULL'],
      ['clinical_summary', 'TEXT NULL'],
      ['referring_clinician_name', 'VARCHAR(120) NULL'],
      ['accepting_clinician_name', 'VARCHAR(120) NULL'],
      ['transport_status', 'VARCHAR(30) NULL'],
      ['arrival_confirmed_at', 'DATETIME NULL'],
    ];
    for (const [column, definition] of transferColumns) {
      await this.ensureColumn(
        'stroke_transfers',
        column,
        `${column} ${definition}`,
      );
    }

    await this.dataSource.query(
      `UPDATE stroke_assessments sa
         JOIN stroke_activations a ON a.id = sa.activation_id
          SET sa.encounter_id = COALESCE(sa.encounter_id, a.encounter_id),
              sa.facility_id = COALESCE(sa.facility_id, a.facility_id)
        WHERE sa.encounter_id IS NULL OR sa.facility_id IS NULL`,
    );
    await this.dataSource.query(
      `UPDATE stroke_imaging_studies si
         JOIN stroke_activations a ON a.id = si.activation_id
          SET si.encounter_id = COALESCE(si.encounter_id, a.encounter_id),
              si.facility_id = COALESCE(si.facility_id, a.facility_id)
        WHERE si.encounter_id IS NULL OR si.facility_id IS NULL`,
    );
    await this.dataSource.query(
      `UPDATE stroke_treatment_events te
         JOIN stroke_activations a ON a.id = te.activation_id
          SET te.encounter_id = COALESCE(te.encounter_id, a.encounter_id),
              te.facility_id = COALESCE(te.facility_id, a.facility_id)
        WHERE te.encounter_id IS NULL OR te.facility_id IS NULL`,
    );
    await this.dataSource.query(
      `UPDATE stroke_assessments
          SET finalized_at = COALESCE(finalized_at, signed_at),
              finalized_by_name = COALESCE(finalized_by_name, signed_by_name),
              status = COALESCE(status, 'finalized'),
              version = COALESCE(version, 1)
        WHERE finalized_at IS NULL OR status IS NULL OR version IS NULL`,
    );

    this.logger.log('Stroke-care schema ready');
  }

  /** Add a column only when it is missing; never rewrites existing data. */
  private async ensureColumn(
    table: string,
    column: string,
    definition: string,
  ): Promise<void> {
    const rows = await this.dataSource.query<Array<Record<string, unknown>>>(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [table, column],
    );
    if (!rows.length) {
      await this.dataSource.query(
        `ALTER TABLE ${table} ADD COLUMN ${definition}`,
      );
    }
  }

  // ── Shared helpers ───────────────────────────────────────────────────────

  private actorName(actor?: StrokeActor): string | null {
    return actor?.displayName || actor?.username || null;
  }

  private async audit(
    entityType: string,
    entityId: number,
    action: string,
    actor: StrokeActor | undefined,
    patientPid: number | null,
    detail?: unknown,
  ): Promise<void> {
    await this.dataSource.query(
      `INSERT INTO stroke_audit_events
               (entity_type, entity_id, patient_pid, action, actor_id, actor_name, detail_json)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        entityType,
        entityId,
        patientPid,
        action,
        actor?.id ?? null,
        this.actorName(actor),
        detail === undefined ? null : JSON.stringify(detail),
      ],
    );
  }

  /** Confirm the patient exists in the shared OpenEMR record. */
  private async findPatient(pid: number): Promise<{ pid: number }> {
    const rows = await this.dataSource.query<Array<{ pid: number }>>(
      `SELECT pid FROM patient_data WHERE pid = ? LIMIT 1`,
      [pid],
    );
    if (!rows.length)
      throw new NotFoundException(`Patient ${pid} was not found.`);
    return rows[0];
  }

  private async assertPatient(pid: number): Promise<void> {
    const rows = await this.dataSource.query<Array<{ pid: number }>>(
      `SELECT pid FROM patient_data WHERE pid = ? LIMIT 1`,
      [pid],
    );
    if (!rows.length) {
      throw new NotFoundException(`Patient ${pid} was not found.`);
    }
  }

  private async findActivation(id: number): Promise<ActivationRow> {
    const rows = await this.dataSource.query<ActivationRow[]>(
      `SELECT a.*,
                    DATE_FORMAT(a.arrival_at, '%Y-%m-%dT%H:%i:%s') AS arrival_at,
                    DATE_FORMAT(a.lkw_at, '%Y-%m-%dT%H:%i:%s') AS lkw_at,
                    DATE_FORMAT(a.ct_performed_at, '%Y-%m-%dT%H:%i:%s') AS ct_performed_at,
                    DATE_FORMAT(a.tpa_given_at, '%Y-%m-%dT%H:%i:%s') AS tpa_given_at,
                    DATE_FORMAT(a.thrombectomy_at, '%Y-%m-%dT%H:%i:%s') AS thrombectomy_at,
                    DATE_FORMAT(a.disposition_at, '%Y-%m-%dT%H:%i:%s') AS disposition_at,
                    pd.fname, pd.lname, pd.mname, pd.DOB, pd.sex
               FROM stroke_activations a
               JOIN patient_data pd ON pd.pid = a.pid
              WHERE a.id = ?`,
      [id],
    );
    if (!rows.length) {
      throw new NotFoundException(`Stroke activation ${id} was not found.`);
    }
    return rows[0];
  }

  // ── Protocols & facility configuration ───────────────────────────────────

  /** The versioned protocol catalogue, so the UI never hardcodes clinical rules. */
  getProtocols() {
    return {
      nihss: {
        protocol: NIHSS_PROTOCOL,
        items: NIHSS_ITEMS,
        loinc: NIHSS_LOINC,
        untestableKeys: NIHSS_UNTESTABLE_KEYS,
      },
      acute: {
        protocol: ACUTE_ISCHEMIC_STROKE_PROTOCOL,
        timingTargets: STROKE_TIMING_TARGETS,
        orderSets: STROKE_ORDER_SETS,
      },
      followUp: {
        protocol: STROKE_FOLLOW_UP_PROTOCOL,
      },
      modules: STROKE_MODULES,
    };
  }

  /**
   * Facility-level module configuration. Unconfigured facilities fall back to
   * the modules appropriate for the requested care setting.
   */
  async getFacilityModules(facilityId: number, setting?: CareSetting) {
    const rows = await this.dataSource.query<
      Array<{ module_key: string; enabled: number }>
    >(
      `SELECT module_key, enabled FROM stroke_facility_modules
              WHERE facility_id = ?`,
      [facilityId],
    );
    const configured = new Map(
      rows.map((r) => [r.module_key, Number(r.enabled) === 1]),
    );
    const defaults = new Set(
      setting ? defaultModulesForSetting(setting) : strokeModuleKeys(),
    );
    return {
      facilityId,
      setting: setting ?? null,
      modules: STROKE_MODULES.map((m) => ({
        ...m,
        enabled: configured.has(m.key)
          ? (configured.get(m.key) as boolean)
          : defaults.has(m.key),
      })),
    };
  }

  /** Replace the facility's explicit module configuration (admin only). */
  async setFacilityModules(
    facilityId: number,
    dto: FacilityModulesDto,
    actor?: StrokeActor,
  ) {
    if (!Array.isArray(dto?.modules)) {
      throw new BadRequestException('modules must be an array.');
    }
    const known = new Set(strokeModuleKeys());
    for (const entry of dto.modules) {
      if (!entry || !known.has(String(entry.key))) {
        throw new BadRequestException(
          `Unknown stroke module "${String(entry?.key)}".`,
        );
      }
      if (typeof entry.enabled !== 'boolean') {
        throw new BadRequestException(
          `Module "${entry.key}" must specify enabled: true or false.`,
        );
      }
      await this.dataSource.query(
        `INSERT INTO stroke_facility_modules
                   (facility_id, module_key, enabled, updated_by, updated_at)
                 VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
                 ON DUPLICATE KEY UPDATE
                   enabled = VALUES(enabled),
                   updated_by = VALUES(updated_by),
                   updated_at = CURRENT_TIMESTAMP`,
        [facilityId, entry.key, entry.enabled ? 1 : 0, actor?.id ?? null],
      );
    }
    await this.audit(
      'stroke_facility_modules',
      facilityId,
      'configured',
      actor,
      null,
      dto.modules,
    );
    return this.getFacilityModules(facilityId);
  }

  /**
   * Facility scope check. Administrators bypass; users with no explicit
   * assignments retain access for backwards compatibility, while assigned
   * users are restricted to their facilities. Assignments are managed by an
   * administrator through the endpoints below.
   */
  async assertFacilityAccess(
    actor: StrokeActor | undefined,
    facilityId: number,
  ): Promise<void> {
    if (!actor?.id || actor.role === 'admin') return;
    const rows = await this.dataSource.query<Array<{ facility_id: number }>>(
      `SELECT facility_id FROM stroke_facility_users WHERE user_id = ?`,
      [actor.id],
    );
    if (!rows.length) return;
    if (!rows.some((row) => Number(row.facility_id) === facilityId)) {
      throw new ForbiddenException(
        'You are not authorized for this stroke-care facility.',
      );
    }
  }

  async listFacilityUsers(facilityId: number) {
    return this.dataSource.query<Array<Record<string, unknown>>>(
      `SELECT f.id, f.facility_id, f.user_id, f.created_at,
              u.username, u.fname, u.lname, u.main_menu_role AS role
         FROM stroke_facility_users f
         LEFT JOIN users u ON u.id = f.user_id
        WHERE f.facility_id = ?
        ORDER BY f.created_at DESC`,
      [facilityId],
    );
  }

  async setFacilityUser(
    facilityId: number,
    userId: number,
    enabled: boolean,
    actor?: StrokeActor,
  ) {
    if (!Number.isInteger(userId) || userId < 1) {
      throw new BadRequestException('userId is required.');
    }
    if (enabled) {
      const users = await this.dataSource.query<Array<{ id: number }>>(
        `SELECT id FROM users WHERE id = ? LIMIT 1`,
        [userId],
      );
      if (!users.length) {
        throw new NotFoundException(`User ${userId} was not found.`);
      }
      await this.dataSource.query(
        `INSERT INTO stroke_facility_users (facility_id, user_id, created_by)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE created_by = VALUES(created_by)`,
        [facilityId, userId, actor?.id ?? null],
      );
    } else {
      await this.dataSource.query(
        `DELETE FROM stroke_facility_users
          WHERE facility_id = ? AND user_id = ?`,
        [facilityId, userId],
      );
    }
    await this.audit(
      'stroke_facility_user',
      facilityId,
      enabled ? 'assigned' : 'unassigned',
      actor,
      null,
      { userId },
    );
    return this.listFacilityUsers(facilityId);
  }

  /** Capability statement for the FHIR export; no conformance claim. */
  getFhirCapability() {
    return {
      fhirVersion: STROKE_FHIR_VERSION,
      supportedResources: Object.keys(STROKE_FHIR_PROFILES),
      profiles: STROKE_FHIR_PROFILES,
      validation:
        'Structural R4 base-profile and stroke terminology validation. ' +
        'Official HL7 validator/terminology conformance testing remains required.',
      nihssLoinc: NIHSS_LOINC,
    };
  }

  // ── Activations ──────────────────────────────────────────────────────────

  /** Register a stroke activation against the existing patient record. */
  async createActivation(dto: ActivationDto, actor?: StrokeActor) {
    const pid = optionalInteger(dto?.patientId, 'patientId', 1);
    if (pid === null) {
      throw new BadRequestException('patientId is required.');
    }
    await this.assertPatient(pid);

    const careSetting = oneOf(
      dto.careSetting,
      CARE_SETTINGS,
      'careSetting',
      'acute',
    );
    const arrivalAt = requiredDate(
      dto.arrivalAt ?? new Date().toISOString(),
      'arrivalAt',
    );
    const arrivalDate = new Date(arrivalAt.replace(' ', 'T') + 'Z');
    if (arrivalDate.getTime() > Date.now() + 5 * 60 * 1000) {
      throw new BadRequestException('arrivalAt cannot be in the future.');
    }
    const activatedAt = requiredDate(
      dto.activatedAt ?? new Date().toISOString(),
      'activatedAt',
    );
    const lkwAt = optionalDate(dto.lkwAt, 'lkwAt');
    if (lkwAt && new Date(lkwAt.replace(' ', 'T') + 'Z') > arrivalDate) {
      throw new BadRequestException('lkwAt cannot be later than arrivalAt.');
    }

    const strokeType = oneOf(
      dto.strokeType,
      STROKE_TYPES,
      'strokeType',
      'not_documented',
    );
    const laterality = optionalText(dto.laterality, 'laterality', 20);
    const codeStrokeLevel = optionalText(
      dto.codeStrokeLevel,
      'codeStrokeLevel',
      20,
    );
    const encounterId = optionalInteger(dto.encounterId, 'encounterId', 1);
    const facilityId = optionalInteger(dto.facilityId, 'facilityId', 0) ?? 0;
    const nihssTotal = optionalInteger(
      dto.initialNihssTotal,
      'initialNihssTotal',
      0,
      42,
    );
    const severity = nihssTotal === null ? null : nihssSeverity(nihssTotal);

    const code = `SC-${Date.now().toString(36).toUpperCase()}-${Math.random()
      .toString(36)
      .slice(2, 6)
      .toUpperCase()}`;

    const result = await this.dataSource.query<AffectedRowsResult>(
      `INSERT INTO stroke_activations
               (pid, encounter_id, facility_id, activation_code, care_setting, status,
                arrival_at, activated_at, lkw_at, stroke_type, laterality, code_stroke_level,
                nihss_total, nihss_severity, created_by, created_by_name)
             VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        pid,
        encounterId,
        facilityId,
        code,
        careSetting,
        arrivalAt,
        activatedAt,
        lkwAt,
        strokeType,
        laterality,
        codeStrokeLevel,
        nihssTotal,
        severity,
        actor?.id ?? null,
        this.actorName(actor),
      ],
    );

    await this.audit(
      'stroke_activation',
      result.insertId,
      'created',
      actor,
      pid,
      { careSetting, arrivalAt, lkwAt, strokeType },
    );
    await this.seedActivationMilestones(
      result.insertId,
      { arrivalAt, activatedAt, lkwAt },
      actor,
    );
    await this.createNotification({
      activationId: result.insertId,
      pid,
      recipientRole: 'physician',
      kind: 'stroke_alert',
      severity: 'critical',
      title: `Stroke alert ${code}`,
      detail:
        'A new stroke alert was activated. Assign the team and acknowledge.',
      dedupeKey: `stroke_alert:${result.insertId}:physician`,
      actor,
    });
    await this.createNotification({
      activationId: result.insertId,
      pid,
      recipientRole: 'nurse',
      kind: 'stroke_alert',
      severity: 'critical',
      title: `Stroke alert ${code}`,
      detail:
        'A new stroke alert was activated. Assign the team and acknowledge.',
      dedupeKey: `stroke_alert:${result.insertId}:nurse`,
      actor,
    });
    return this.getActivation(result.insertId);
  }

  /** Registry view, newest first, with optional filters. */
  async listActivations(filters: {
    facilityId?: unknown;
    setting?: unknown;
    status?: unknown;
    patientId?: unknown;
    limit?: unknown;
    page?: unknown;
    pageSize?: unknown;
  }) {
    const where: string[] = [];
    const params: unknown[] = [];
    const facilityId = optionalInteger(filters.facilityId, 'facilityId', 0);
    if (facilityId !== null) {
      where.push('a.facility_id = ?');
      params.push(facilityId);
    }
    if (
      filters.setting !== undefined &&
      filters.setting !== null &&
      filters.setting !== ''
    ) {
      where.push('a.care_setting = ?');
      params.push(oneOf(filters.setting, CARE_SETTINGS, 'setting'));
    }
    if (
      filters.status !== undefined &&
      filters.status !== null &&
      filters.status !== ''
    ) {
      where.push('a.status = ?');
      params.push(oneOf(filters.status, ACTIVATION_STATUSES, 'status'));
    }
    const patientId = optionalInteger(filters.patientId, 'patientId', 1);
    if (patientId !== null) {
      where.push('a.pid = ?');
      params.push(patientId);
    }
    const page = optionalInteger(filters.page, 'page', 1) ?? 1;
    const pageSize = Math.min(
      optionalInteger(filters.pageSize, 'pageSize', 1, 200) ??
        optionalInteger(filters.limit, 'limit', 1, 500) ??
        50,
      500,
    );
    const limit = pageSize;
    const offset = (page - 1) * limit;
    const countRows = await this.dataSource.query<Array<{ total: number }>>(
      `SELECT COUNT(*) AS total FROM stroke_activations a
        ${where.length ? 'WHERE ' + where.join(' AND ') : ''}`,
      params,
    );

    const rows = await this.dataSource.query<ActivationRow[]>(
      `SELECT a.id, a.pid, a.encounter_id, a.facility_id, a.activation_code,
                    a.care_setting, a.status, a.stroke_type, a.laterality,
                    a.code_stroke_level, a.nihss_total, a.nihss_severity,
                    a.tpa_status, a.thrombectomy_status, a.disposition,
                    DATE_FORMAT(a.arrival_at, '%Y-%m-%dT%H:%i:%s') AS arrival_at,
                    DATE_FORMAT(a.lkw_at, '%Y-%m-%dT%H:%i:%s') AS lkw_at,
                    DATE_FORMAT(a.ct_performed_at, '%Y-%m-%dT%H:%i:%s') AS ct_performed_at,
                    DATE_FORMAT(a.tpa_given_at, '%Y-%m-%dT%H:%i:%s') AS tpa_given_at,
                    DATE_FORMAT(a.disposition_at, '%Y-%m-%dT%H:%i:%s') AS disposition_at,
                    pd.fname, pd.lname, pd.mname, pd.DOB, pd.sex,
                    TIMESTAMPDIFF(MINUTE, a.arrival_at, NOW()) AS minutes_since_arrival,
                    CASE WHEN a.ct_performed_at IS NULL THEN NULL
                         ELSE TIMESTAMPDIFF(MINUTE, a.arrival_at, a.ct_performed_at) END AS door_to_ct_minutes,
                    CASE WHEN a.tpa_given_at IS NULL THEN NULL
                         ELSE TIMESTAMPDIFF(MINUTE, a.arrival_at, a.tpa_given_at) END AS door_to_needle_minutes
               FROM stroke_activations a
               JOIN patient_data pd ON pd.pid = a.pid
              ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
              ORDER BY a.arrival_at DESC, a.id DESC
              LIMIT ${limit} OFFSET ${offset}`,
      params,
    );
    return {
      activations: rows,
      count: rows.length,
      total: Number(countRows[0]?.total ?? 0),
      page,
      pageSize,
    };
  }

  /** One activation with its full, unified stroke record. */
  async getActivation(id: number): Promise<ActivationRecord> {
    const activation = await this.findActivation(id);
    const [
      assessments,
      orders,
      decisions,
      imaging,
      transfers,
      tasks,
      profiles,
    ] = await Promise.all([
      this.listAssessments(id),
      this.listOrders(id),
      this.listDecisions(id),
      this.listImaging(id),
      this.listTransfers(id),
      this.dataSource.query<TaskRow[]>(
        `SELECT id, discipline, task, status,
                            DATE_FORMAT(due_at, '%Y-%m-%dT%H:%i:%s') AS due_at,
                            DATE_FORMAT(completed_at, '%Y-%m-%dT%H:%i:%s') AS completed_at,
                            assigned_to, completed_by_name, created_at
                       FROM stroke_care_tasks
                      WHERE activation_id = ?
                      ORDER BY status <> 'completed', COALESCE(due_at, created_at)`,
        [id],
      ),
      this.dataSource.query<ProfileRow[]>(
        `SELECT id, activation_id,
                  DATE_FORMAT(symptom_discovered_at, '%Y-%m-%dT%H:%i:%s') AS symptom_discovered_at,
                  initial_neuro_findings, risk_factors_json, prior_stroke_tia,
                  prior_stroke_details, relevant_history, attending_provider_id,
                  attending_provider_name, facility_department,
                  DATE_FORMAT(updated_at, '%Y-%m-%dT%H:%i:%s') AS updated_at
             FROM stroke_encounter_profiles WHERE activation_id = ?`,
        [id],
      ),
    ]);

    const profileRow = profiles[0] ?? null;
    const profile = profileRow
      ? {
          ...profileRow,
          riskFactors: parseStringArray(profileRow.risk_factors_json),
        }
      : null;

    const latest = assessments.find((a) => a.status === 'finalized');
    const criteria = evaluateTreatmentCriteria({
      strokeType: activation.stroke_type,
      lkwAt: activation.lkw_at,
      arrivalAt: activation.arrival_at,
      nihssTotal: latest?.total_score ?? activation.nihss_total,
      ctExcludedHemorrhage:
        activation.stroke_type === 'hemorrhagic'
          ? false
          : imaging.some(
                (s) =>
                  s.modality === 'ct' &&
                  (s.interpretation_status === 'reported' ||
                    s.interpretation_status === 'reviewed'),
              ) && activation.stroke_type === 'ischemic'
            ? true
            : null,
      largeVesselOcclusion: imaging.some(
        (s) =>
          (s.modality === 'cta' || s.modality === 'mra') &&
          typeof s.findings === 'string' &&
          /occlusion/i.test(s.findings),
      ),
    });

    return {
      activation,
      assessments,
      orders,
      decisions,
      imaging,
      transfers,
      tasks,
      profile,
      criteria,
    };
  }

  /** Move an activation through its workflow and record timing milestones. */
  async updateActivation(
    id: number,
    dto: ActivationUpdateDto,
    actor?: StrokeActor,
  ) {
    const existing = await this.findActivation(id);
    const sets: string[] = [];
    const params: unknown[] = [];

    if (dto.status !== undefined) {
      sets.push('status = ?');
      params.push(oneOf(dto.status, ACTIVATION_STATUSES, 'status'));
    }
    if (dto.strokeType !== undefined) {
      sets.push('stroke_type = ?');
      params.push(oneOf(dto.strokeType, STROKE_TYPES, 'strokeType'));
    }
    if (dto.laterality !== undefined) {
      sets.push('laterality = ?');
      params.push(optionalText(dto.laterality, 'laterality', 20));
    }
    if (dto.codeStrokeLevel !== undefined) {
      sets.push('code_stroke_level = ?');
      params.push(optionalText(dto.codeStrokeLevel, 'codeStrokeLevel', 20));
    }
    if (dto.encounterId !== undefined) {
      sets.push('encounter_id = ?');
      params.push(optionalInteger(dto.encounterId, 'encounterId', 1));
    }
    if (dto.arrivalAt !== undefined) {
      sets.push('arrival_at = ?');
      params.push(requiredDate(dto.arrivalAt, 'arrivalAt'));
    }
    if (dto.lkwAt !== undefined) {
      sets.push('lkw_at = ?');
      params.push(optionalDate(dto.lkwAt, 'lkwAt'));
    }
    if (dto.ctPerformedAt !== undefined) {
      sets.push('ct_performed_at = ?');
      params.push(optionalDate(dto.ctPerformedAt, 'ctPerformedAt'));
    }
    if (dto.tpaGivenAt !== undefined) {
      sets.push('tpa_given_at = ?');
      params.push(optionalDate(dto.tpaGivenAt, 'tpaGivenAt'));
    }
    if (dto.thrombectomyAt !== undefined) {
      sets.push('thrombectomy_at = ?');
      params.push(optionalDate(dto.thrombectomyAt, 'thrombectomyAt'));
    }
    if (dto.tpaStatus !== undefined) {
      sets.push('tpa_status = ?');
      params.push(optionalText(dto.tpaStatus, 'tpaStatus', 40));
    }
    if (dto.thrombectomyStatus !== undefined) {
      sets.push('thrombectomy_status = ?');
      params.push(
        optionalText(dto.thrombectomyStatus, 'thrombectomyStatus', 40),
      );
    }
    if (dto.disposition !== undefined) {
      sets.push('disposition = ?');
      params.push(optionalText(dto.disposition, 'disposition', 80));
    }
    if (dto.dispositionAt !== undefined) {
      sets.push('disposition_at = ?');
      params.push(optionalDate(dto.dispositionAt, 'dispositionAt'));
    }

    if (!sets.length) {
      throw new BadRequestException('No supported fields were supplied.');
    }

    const nextLkw = dto.lkwAt !== undefined ? dto.lkwAt : existing.lkw_at;
    const nextArrival =
      dto.arrivalAt !== undefined ? dto.arrivalAt : existing.arrival_at;
    if (
      nextLkw &&
      nextArrival &&
      new Date(String(nextLkw)).getTime() >
        new Date(String(nextArrival)).getTime()
    ) {
      throw new BadRequestException('lkwAt cannot be later than arrivalAt.');
    }

    await this.dataSource.query(
      `UPDATE stroke_activations
                SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP
              WHERE id = ?`,
      [...params, id],
    );
    await this.audit(
      'stroke_activation',
      id,
      'updated',
      actor,
      existing.pid,
      dto,
    );
    return this.getActivation(id);
  }

  // ── NIHSS assessments ────────────────────────────────────────────────────

  /**
   * Record a signed NIHSS assessment.
   *
   * The total is always recomputed from the submitted items — a client cannot
   * send a favourable total alongside severe item scores. Every item must be
   * present, and the clinician must explicitly confirm the signature.
   */
  async addAssessment(
    activationId: number,
    dto: AssessmentDto,
    actor?: StrokeActor,
  ) {
    const activation = await this.findActivation(activationId);
    if (!dto?.items || typeof dto.items !== 'object') {
      throw new BadRequestException('items is required.');
    }
    const finalize = dto.finalize !== false;
    const untestable = dto.untestable ?? {};
    const score = scoreNihss(dto.items, untestable);
    if (score.invalid.length) {
      throw new BadRequestException(
        `NIHSS item(s) out of range: ${score.invalid.join(', ')}.`,
      );
    }
    if (score.untestableNotAllowed.length) {
      throw new BadRequestException(
        `Untestable is not permitted for: ${score.untestableNotAllowed.join(
          ', ',
        )}.`,
      );
    }
    if (finalize) {
      if (!score.complete) {
        throw new BadRequestException(
          `Every NIHSS item must be scored or validly untestable before finalizing; missing: ${score.missing.join(
            ', ',
          )}; untestable without a reason: ${score.untestableWithoutReason.join(
            ', ',
          )}.`,
        );
      }
      requireSignature(dto.signatureConfirmed, 'signatureConfirmed');
    }
    const signedByName = finalize
      ? requiredText(dto.signedByName, 'signedByName')
      : this.actorName(actor) || 'Draft author';
    const assessedAt = requiredDate(
      dto.assessedAt ?? new Date().toISOString(),
      'assessedAt',
    );
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const result = await this.dataSource.query<AffectedRowsResult>(
      `INSERT INTO stroke_assessments
               (activation_id, encounter_id, facility_id, pid, scale,
                items_json, untestable_json,
                total_score, severity, status, version, assessed_at,
                assessed_by, assessed_by_name, signed_by_name, signed_at,
                finalized_at, finalized_by, finalized_by_name, notes,
                protocol_key, protocol_version)
             VALUES (?, ?, ?, ?, 'nihss', ?, ?, ?, ?, ?, 1, ?, ?, ?, ?,
                     CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, ?)`,
      [
        activationId,
        activation.encounter_id,
        activation.facility_id,
        activation.pid,
        JSON.stringify(score.byItem),
        JSON.stringify(untestable),
        score.total,
        score.severity,
        finalize ? 'finalized' : 'draft',
        assessedAt,
        actor?.id ?? null,
        this.actorName(actor),
        signedByName,
        finalize ? now : null,
        finalize ? (actor?.id ?? null) : null,
        finalize ? this.actorName(actor) : null,
        optionalText(dto.notes, 'notes', 4000),
        NIHSS_PROTOCOL.key,
        NIHSS_PROTOCOL.version,
      ],
    );
    await this.syncAssessmentItems(
      result.insertId,
      activationId,
      activation.pid,
      score.byItem,
      untestable,
      assessedAt,
    );

    if (finalize) {
      await this.applyScoreToActivation(
        activationId,
        score.total,
        score.severity,
      );
    }
    await this.audit(
      'stroke_assessment',
      result.insertId,
      finalize ? 'finalized' : 'draft_saved',
      actor,
      activation.pid,
      {
        activationId,
        total: score.total,
        severity: score.severity,
        untestable: score.untestable,
      },
    );

    return this.getAssessment(result.insertId);
  }

  /** Update a draft; finalized assessments are immutable and must be amended. */
  async updateDraftAssessment(
    assessmentId: number,
    dto: AssessmentDto,
    actor?: StrokeActor,
  ) {
    const existing = await this.getAssessment(assessmentId);
    if (existing.status !== 'draft') {
      throw new ConflictException(
        'Only a draft assessment can be edited; amend a finalized assessment instead.',
      );
    }
    if (
      existing.assessed_by !== null &&
      existing.assessed_by !== undefined &&
      actor?.role !== 'admin' &&
      Number(existing.assessed_by) !== Number(actor?.id)
    ) {
      throw new ForbiddenException(
        'Only the clinician who created this draft, or an administrator, can edit it.',
      );
    }
    if (!dto?.items || typeof dto.items !== 'object') {
      throw new BadRequestException('items is required.');
    }
    const untestable = dto.untestable ?? {};
    const score = scoreNihss(dto.items, untestable);
    if (score.invalid.length) {
      throw new BadRequestException(
        `NIHSS item(s) out of range: ${score.invalid.join(', ')}.`,
      );
    }
    if (score.untestableNotAllowed.length) {
      throw new BadRequestException(
        `Untestable is not permitted for: ${score.untestableNotAllowed.join(
          ', ',
        )}.`,
      );
    }
    const assessedAt =
      dto.assessedAt !== undefined
        ? requiredDate(dto.assessedAt, 'assessedAt')
        : null;

    await this.dataSource.query(
      `UPDATE stroke_assessments
          SET items_json = ?, untestable_json = ?, total_score = ?,
              severity = ?, assessed_at = COALESCE(?, assessed_at),
              notes = COALESCE(?, notes), modified_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
      [
        JSON.stringify(score.byItem),
        JSON.stringify(untestable),
        score.total,
        score.severity,
        assessedAt,
        dto.notes === undefined ? null : optionalText(dto.notes, 'notes', 4000),
        assessmentId,
      ],
    );
    await this.syncAssessmentItems(
      assessmentId,
      existing.activation_id,
      existing.pid,
      score.byItem,
      untestable,
      assessedAt ?? existing.assessed_at,
    );
    await this.audit(
      'stroke_assessment',
      assessmentId,
      'draft_updated',
      actor,
      existing.pid,
      { total: score.total, severity: score.severity },
    );
    return this.getAssessment(assessmentId);
  }

  /** Sign and finalize an existing draft. */
  async finalizeAssessment(
    assessmentId: number,
    dto: FinalizeAssessmentDto,
    actor?: StrokeActor,
  ) {
    const existing = await this.getAssessment(assessmentId);
    if (existing.status !== 'draft') {
      throw new ConflictException('This assessment is already finalized.');
    }
    const items = (existing.items ?? {}) as Record<string, number>;
    const untestable = (existing.untestable ?? {}) as NihssUntestableMap;
    const score = scoreNihss(items, untestable);
    if (!score.complete) {
      throw new BadRequestException(
        `The draft is incomplete; missing: ${score.missing.join(
          ', ',
        )}; untestable without a reason: ${score.untestableWithoutReason.join(
          ', ',
        )}.`,
      );
    }
    const signedByName = requiredText(dto.signedByName, 'signedByName');
    requireSignature(dto.signatureConfirmed, 'signatureConfirmed');
    const assessedAt =
      dto.assessedAt !== undefined
        ? requiredDate(dto.assessedAt, 'assessedAt')
        : null;
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    await this.dataSource.query(
      `UPDATE stroke_assessments
          SET status = 'finalized', signed_by_name = ?, signed_at = CURRENT_TIMESTAMP,
              finalized_at = ?, finalized_by = ?, finalized_by_name = ?,
              assessed_at = COALESCE(?, assessed_at),
              notes = COALESCE(?, notes), modified_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
      [
        signedByName,
        now,
        actor?.id ?? null,
        this.actorName(actor),
        assessedAt,
        dto.notes === undefined ? null : optionalText(dto.notes, 'notes', 4000),
        assessmentId,
      ],
    );
    await this.syncAssessmentItems(
      assessmentId,
      existing.activation_id,
      existing.pid,
      items,
      untestable,
      assessedAt ?? existing.assessed_at,
    );
    await this.applyScoreToActivation(
      existing.activation_id,
      score.total,
      score.severity,
    );
    await this.audit(
      'stroke_assessment',
      assessmentId,
      'finalized',
      actor,
      existing.pid,
      { total: score.total, severity: score.severity },
    );
    return this.getAssessment(assessmentId);
  }

  /** Amend a finalized assessment by creating a new version (original untouched). */
  async amendAssessment(
    assessmentId: number,
    dto: AmendAssessmentDto,
    actor?: StrokeActor,
  ) {
    const original = await this.getAssessment(assessmentId);
    if (original.status !== 'finalized') {
      throw new ConflictException(
        'Only a finalized assessment can be amended.',
      );
    }
    const amendmentReason = requiredText(
      dto.amendmentReason,
      'amendmentReason',
    );
    if (!dto?.items || typeof dto.items !== 'object') {
      throw new BadRequestException('items is required.');
    }
    const untestable = dto.untestable ?? {};
    const score = scoreNihss(dto.items, untestable);
    if (score.invalid.length || score.untestableNotAllowed.length) {
      throw new BadRequestException(
        'The amendment contains invalid or non-permitted untestable items.',
      );
    }
    if (!score.complete) {
      throw new BadRequestException(
        'Every NIHSS item must be scored or validly untestable before finalizing the amendment.',
      );
    }
    const signedByName = requiredText(dto.signedByName, 'signedByName');
    requireSignature(dto.signatureConfirmed, 'signatureConfirmed');
    const assessedAt = requiredDate(
      dto.assessedAt ?? original.assessed_at,
      'assessedAt',
    );
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const result = await this.dataSource.query<AffectedRowsResult>(
      `INSERT INTO stroke_assessments
         (activation_id, pid, scale, items_json, untestable_json, total_score,
          severity, status, version, amends_id, amendment_reason, assessed_at,
          assessed_by, assessed_by_name, signed_by_name, signed_at,
          finalized_at, finalized_by, finalized_by_name, notes,
          protocol_key, protocol_version)
       VALUES (?, ?, 'nihss', ?, ?, ?, ?, 'finalized', ?, ?, ?, ?, ?, ?, ?,
               CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, ?)`,
      [
        original.activation_id,
        original.pid,
        JSON.stringify(score.byItem),
        JSON.stringify(untestable),
        score.total,
        score.severity,
        Number(original.version) + 1,
        original.id,
        amendmentReason,
        assessedAt,
        actor?.id ?? null,
        this.actorName(actor),
        signedByName,
        now,
        actor?.id ?? null,
        this.actorName(actor),
        optionalText(dto.notes, 'notes', 4000),
        NIHSS_PROTOCOL.key,
        NIHSS_PROTOCOL.version,
      ],
    );
    await this.syncAssessmentItems(
      result.insertId,
      original.activation_id,
      original.pid,
      score.byItem,
      untestable,
      assessedAt,
    );
    await this.applyScoreToActivation(
      original.activation_id,
      score.total,
      score.severity,
    );
    await this.audit(
      'stroke_assessment',
      result.insertId,
      'amended',
      actor,
      original.pid,
      { amendsId: original.id, version: Number(original.version) + 1 },
    );
    return this.getAssessment(result.insertId);
  }

  private async applyScoreToActivation(
    activationId: number,
    total: number,
    severity: string,
  ): Promise<void> {
    await this.dataSource.query(
      `UPDATE stroke_activations
          SET nihss_total = ?, nihss_severity = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
      [total, severity, activationId],
    );
  }

  /**
   * Normalize each NIHSS item into a LOINC-coded row. The JSON columns remain
   * the signed clinical snapshot; this table supports item-level reporting and
   * interoperability without changing that immutable history.
   */
  private async syncAssessmentItems(
    assessmentId: number,
    activationId: number,
    pid: number,
    items: Record<string, number>,
    untestable: NihssUntestableMap,
    assessedAt: string,
  ): Promise<void> {
    await this.dataSource.query(
      `DELETE FROM stroke_assessment_items WHERE assessment_id = ?`,
      [assessmentId],
    );
    if (!NIHSS_ITEMS.length) return;
    const params: unknown[] = [];
    for (const item of NIHSS_ITEMS) {
      const loinc =
        NIHSS_LOINC.items[item.key as keyof typeof NIHSS_LOINC.items];
      const score = items[item.key];
      const reason = untestable[item.key];
      params.push(
        assessmentId,
        activationId,
        pid,
        item.key,
        loinc.code,
        loinc.display,
        typeof score === 'number' ? score : null,
        typeof reason === 'string' && reason.trim() ? reason.trim() : null,
        typeof score === 'number' ? null : 'not-performed',
        assessedAt,
      );
    }
    const placeholders = NIHSS_ITEMS.map(
      () => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    ).join(', ');
    await this.dataSource.query(
      `INSERT INTO stroke_assessment_items
         (assessment_id, activation_id, pid, item_key, loinc_code,
          loinc_display, score, untestable_reason, data_absent_reason,
          assessed_at)
       VALUES ${placeholders}`,
      params,
    );
  }

  async listAssessmentItems(assessmentId: number) {
    await this.getAssessment(assessmentId);
    return this.dataSource.query<Array<Record<string, unknown>>>(
      `SELECT id, assessment_id, item_key, loinc_code, loinc_display, score,
              untestable_reason, data_absent_reason,
              DATE_FORMAT(assessed_at, '%Y-%m-%dT%H:%i:%s') AS assessed_at
         FROM stroke_assessment_items
        WHERE assessment_id = ?
        ORDER BY id ASC`,
      [assessmentId],
    );
  }

  /** Paginated NIHSS history for one patient across all stroke encounters. */
  async listPatientAssessments(
    pid: number,
    pageInput?: unknown,
    pageSizeInput?: unknown,
  ) {
    await this.assertPatient(pid);
    const page = optionalInteger(pageInput, 'page', 1) ?? 1;
    const pageSize = Math.min(
      optionalInteger(pageSizeInput, 'pageSize', 1, 200) ?? 25,
      200,
    );
    const offset = (page - 1) * pageSize;
    const count = await this.dataSource.query<Array<{ total: number }>>(
      `SELECT COUNT(*) AS total FROM stroke_assessments WHERE pid = ?`,
      [pid],
    );
    const rows = await this.dataSource.query<Array<Record<string, unknown>>>(
      `SELECT a.id, a.activation_id, a.total_score, a.severity, a.status,
              a.version, a.amends_id, a.amendment_reason, a.protocol_version,
              a.assessed_by_name, a.finalized_by_name,
              act.activation_code,
              DATE_FORMAT(a.assessed_at, '%Y-%m-%dT%H:%i:%s') AS assessed_at,
              DATE_FORMAT(a.finalized_at, '%Y-%m-%dT%H:%i:%s') AS finalized_at
         FROM stroke_assessments a
         LEFT JOIN stroke_activations act ON act.id = a.activation_id
        WHERE a.pid = ?
        ORDER BY a.assessed_at DESC, a.id DESC
        LIMIT ${pageSize} OFFSET ${offset}`,
      [pid],
    );
    return {
      data: rows,
      total: Number(count[0]?.total ?? 0),
      page,
      pageSize,
    };
  }

  async getAssessment(assessmentId: number): Promise<AssessmentRow> {
    const rows = await this.dataSource.query<AssessmentRow[]>(
      `SELECT id, activation_id, pid, scale, items_json, untestable_json,
              total_score, severity, status, version, amends_id,
              amendment_reason, notes, assessed_by, assessed_by_name,
              signed_by_name, protocol_key, protocol_version,
              DATE_FORMAT(assessed_at, '%Y-%m-%dT%H:%i:%s') AS assessed_at,
              DATE_FORMAT(signed_at, '%Y-%m-%dT%H:%i:%s') AS signed_at,
              DATE_FORMAT(finalized_at, '%Y-%m-%dT%H:%i:%s') AS finalized_at,
              finalized_by_name, created_at
         FROM stroke_assessments WHERE id = ?`,
      [assessmentId],
    );
    if (!rows.length) {
      throw new NotFoundException(
        `NIHSS assessment ${assessmentId} was not found.`,
      );
    }
    const { items_json, untestable_json, ...row } = rows[0];
    return {
      ...row,
      items: safeJson(items_json),
      untestable: safeJson(untestable_json),
    };
  }

  async listAssessments(activationId: number): Promise<AssessmentRow[]> {
    const rows = await this.dataSource.query<AssessmentRow[]>(
      `SELECT id, activation_id, pid, scale, items_json, untestable_json,
                    total_score, severity, status, version, amends_id,
                    amendment_reason, notes, assessed_by, assessed_by_name,
                    signed_by_name, protocol_key, protocol_version,
                    DATE_FORMAT(assessed_at, '%Y-%m-%dT%H:%i:%s') AS assessed_at,
                    DATE_FORMAT(signed_at, '%Y-%m-%dT%H:%i:%s') AS signed_at,
                    DATE_FORMAT(finalized_at, '%Y-%m-%dT%H:%i:%s') AS finalized_at,
                    finalized_by_name, created_at
               FROM stroke_assessments
              WHERE activation_id = ?
              ORDER BY assessed_at DESC, id DESC`,
      [activationId],
    );
    return rows.map(({ items_json, untestable_json, ...row }) => ({
      ...row,
      items: safeJson(items_json),
      untestable: safeJson(untestable_json),
    }));
  }

  /** Finalized score history for the trend chart across a patient's encounters. */
  async getNihssTrend(pid: number) {
    await this.assertPatient(pid);
    const rows = await this.dataSource.query<Array<Record<string, unknown>>>(
      `SELECT id, activation_id, total_score, severity, version, amends_id,
              protocol_version,
              DATE_FORMAT(assessed_at, '%Y-%m-%dT%H:%i:%s') AS assessed_at,
              finalized_by_name
         FROM stroke_assessments
        WHERE pid = ? AND status = 'finalized'
        ORDER BY assessed_at ASC, id ASC`,
      [pid],
    );
    return rows.map((r) => ({
      ...r,
      total_score: Number(r.total_score),
      version: Number(r.version),
    }));
  }

  // ── Order sets ───────────────────────────────────────────────────────────

  async listOrders(activationId: number): Promise<OrderRow[]> {
    const rows = await this.dataSource.query<OrderRow[]>(
      `SELECT id, activation_id, pid, order_set_key, order_set_label,
                    protocol_key, protocol_version, status,
                    clinician_acknowledged, contraindications_reviewed,
                    ordered_by, ordered_by_name, notes,
                    DATE_FORMAT(acknowledged_at, '%Y-%m-%dT%H:%i:%s') AS acknowledged_at,
                    created_at, items_json
               FROM stroke_orders
              WHERE activation_id = ?
              ORDER BY acknowledged_at DESC, id DESC`,
      [activationId],
    );
    return rows.map(({ items_json, ...row }) => ({
      ...row,
      items: safeJson(items_json),
    }));
  }

  /**
   * Acknowledge a versioned order set. This records that a clinician reviewed
   * every item; it does not itself place medication or imaging orders.
   */
  async addOrder(activationId: number, dto: OrderDto, actor?: StrokeActor) {
    const activation = await this.findActivation(activationId);
    const orderSet = getOrderSet(requiredText(dto.orderSetKey, 'orderSetKey'));
    if (!orderSet) {
      throw new NotFoundException(
        `Order set "${dto.orderSetKey}" is not in the protocol catalogue.`,
      );
    }
    requireSignature(dto.clinicianAcknowledged, 'clinicianAcknowledged');
    requireSignature(
      dto.contraindicationsReviewed,
      'contraindicationsReviewed',
    );

    const result = await this.dataSource.query<AffectedRowsResult>(
      `INSERT INTO stroke_orders
               (activation_id, pid, order_set_key, order_set_label,
                protocol_key, protocol_version, status, items_json,
                clinician_acknowledged, contraindications_reviewed,
                ordered_by, ordered_by_name, notes)
             VALUES (?, ?, ?, ?, ?, ?, 'acknowledged', ?, 1, 1, ?, ?, ?)`,
      [
        activationId,
        activation.pid,
        orderSet.key,
        orderSet.label,
        orderSet.protocol.key,
        orderSet.protocol.version,
        JSON.stringify(orderSet.items),
        actor?.id ?? null,
        this.actorName(actor),
        optionalText(dto.notes, 'notes', 4000),
      ],
    );

    await this.audit(
      'stroke_order',
      result.insertId,
      'acknowledged',
      actor,
      activation.pid,
      { activationId, orderSetKey: orderSet.key },
    );
    const rows = await this.listOrders(activationId);
    return rows.find((r) => r.id === result.insertId) ?? rows[0];
  }

  // ── Treatment decisions ──────────────────────────────────────────────────

  async listDecisions(activationId: number): Promise<DecisionRow[]> {
    const rows = await this.dataSource.query<DecisionRow[]>(
      `SELECT id, activation_id, pid, decision_type, decision, reason,
                    criteria_json, protocol_key, protocol_version,
                    decided_by, decided_by_name,
                    DATE_FORMAT(decided_at, '%Y-%m-%dT%H:%i:%s') AS decided_at,
                    created_at
               FROM stroke_treatment_decisions
              WHERE activation_id = ?
              ORDER BY decided_at DESC, id DESC`,
      [activationId],
    );
    return rows.map(({ criteria_json, ...row }) => ({
      ...row,
      criteria: safeJson(criteria_json),
    }));
  }

  /**
   * Record a clinician's reperfusion decision together with the advisory
   * checklist that was on screen when it was made. The decision is the
   * clinician's; the checklist is stored because it was the basis for review.
   */
  async recordDecision(
    activationId: number,
    dto: DecisionDto,
    actor?: StrokeActor,
  ) {
    const activation = await this.findActivation(activationId);
    const decisionType = oneOf(
      dto.decisionType,
      DECISION_TYPES,
      'decisionType',
    );
    const decision = oneOf(dto.decision, DECISION_OUTCOMES, 'decision');
    const reason = optionalText(dto.reason, 'reason', 4000);
    if ((decision === 'withheld' || decision === 'not_indicated') && !reason) {
      throw new BadRequestException(
        'reason is required when treatment is withheld or not indicated.',
      );
    }

    const criteria = evaluateTreatmentCriteria({
      ...dto,
      strokeType: dto.strokeType ?? activation.stroke_type,
      lkwAt: activation.lkw_at,
      arrivalAt: activation.arrival_at,
      nihssTotal: dto.nihssTotal ?? activation.nihss_total,
    });

    const result = await this.dataSource.query<AffectedRowsResult>(
      `INSERT INTO stroke_treatment_decisions
               (activation_id, pid, decision_type, decision, reason, criteria_json,
                protocol_key, protocol_version, decided_by, decided_by_name)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        activationId,
        activation.pid,
        decisionType,
        decision,
        reason,
        JSON.stringify(criteria),
        criteria.protocol.key,
        criteria.protocol.version,
        actor?.id ?? null,
        this.actorName(actor),
      ],
    );

    const column =
      decisionType === 'thrombolysis' ? 'tpa_status' : 'thrombectomy_status';
    await this.dataSource.query(
      `UPDATE stroke_activations
                SET ${column} = ?, updated_at = CURRENT_TIMESTAMP
              WHERE id = ?`,
      [decision, activationId],
    );
    await this.audit(
      'stroke_decision',
      result.insertId,
      decision,
      actor,
      activation.pid,
      { activationId, decisionType, decision, reason },
    );
    const rows = await this.listDecisions(activationId);
    return rows.find((r) => r.id === result.insertId) ?? rows[0];
  }

  // ── Imaging links (reuse the existing imaging / DICOM store) ─────────────

  async listImaging(activationId: number): Promise<ImagingRow[]> {
    const rows = await this.dataSource.query<ImagingRow[]>(
      `SELECT id, activation_id, pid, imaging_id, modality,
                    dicom_study_uid, orthanc_study_id, findings,
                    interpretation_status, interpretation_by, linked_by,
                    linked_by_name, study_description, accession_number,
                    series_count, instance_count, dicom_patient_id,
                    patient_match_status,
                    DATE_FORMAT(study_date, '%Y-%m-%dT%H:%i:%s') AS study_date,
                    DATE_FORMAT(ordered_at, '%Y-%m-%dT%H:%i:%s') AS ordered_at,
                    DATE_FORMAT(performed_at, '%Y-%m-%dT%H:%i:%s') AS performed_at,
                    DATE_FORMAT(interpreted_at, '%Y-%m-%dT%H:%i:%s') AS interpreted_at,
                    created_at
               FROM stroke_imaging_studies
              WHERE activation_id = ?
              ORDER BY performed_at DESC, id DESC`,
      [activationId],
    );
    return rows;
  }

  /**
   * Link a study that already lives in the imaging store (or a PACS/DICOM
   * reference). Stroke care never stores a second copy of the image.
   */
  async linkImaging(
    activationId: number,
    dto: ImagingLinkDto,
    actor?: StrokeActor,
  ) {
    const activation = await this.findActivation(activationId);
    const modality = oneOf(dto.modality, MODALITIES, 'modality');
    const imagingId = optionalInteger(dto.imagingId, 'imagingId', 1);
    const dicomStudyUid = optionalText(dto.dicomStudyUid, 'dicomStudyUid', 128);
    const orthancStudyId = optionalText(
      dto.orthancStudyId,
      'orthancStudyId',
      128,
    );
    const interpretationStatus = oneOf(
      dto.interpretationStatus,
      IMAGING_STATUSES,
      'interpretationStatus',
      'ordered',
    );
    if (
      !imagingId &&
      !dicomStudyUid &&
      !orthancStudyId &&
      interpretationStatus !== 'ordered'
    ) {
      throw new BadRequestException(
        'Provide an imagingId, a DICOM StudyInstanceUID or a PACS study id once the study exists.',
      );
    }

    if (imagingId) {
      const existing = await this.dataSource.query<
        Array<{ id: number; pid: number }>
      >(`SELECT id, pid FROM imaging WHERE id = ? LIMIT 1`, [imagingId]);
      if (!existing.length) {
        throw new NotFoundException(
          `Imaging study ${imagingId} was not found.`,
        );
      }
      if (Number(existing[0].pid) !== Number(activation.pid)) {
        throw new BadRequestException(
          'The imaging study belongs to a different patient.',
        );
      }
    }

    let patientMatchStatus = 'unverified';
    const dicomPatientId = optionalText(
      dto.dicomPatientId,
      'dicomPatientId',
      120,
    );
    if (dicomPatientId !== null) {
      const patient = await this.dataSource.query<
        Array<{ pid: number; pubpid: string | null }>
      >(`SELECT pid, pubpid FROM patient_data WHERE pid = ?`, [activation.pid]);
      const candidates = [
        String(activation.pid),
        patient[0]?.pubpid ?? '',
      ].filter(Boolean);
      patientMatchStatus = candidates.includes(dicomPatientId)
        ? 'verified'
        : 'mismatch';
      if (
        patientMatchStatus === 'mismatch' &&
        dto.patientMatchConfirmed !== true
      ) {
        throw new BadRequestException(
          'The DICOM PatientID does not match this patient. A clinician must explicitly confirm the identity match.',
        );
      }
      if (patientMatchStatus === 'mismatch')
        patientMatchStatus = 'clinician_confirmed';
    }

    const result = await this.dataSource.query<AffectedRowsResult>(
      `INSERT INTO stroke_imaging_studies
               (activation_id, encounter_id, facility_id, pid, imaging_id,
                modality, dicom_study_uid,
                orthanc_study_id, ordered_at, performed_at, interpreted_at,
                findings, interpretation_status, study_description,
                accession_number, series_count, instance_count, study_date,
                dicom_patient_id, patient_match_status, version, linked_by,
                linked_by_name)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [
        activationId,
        activation.encounter_id,
        activation.facility_id,
        activation.pid,
        imagingId,
        modality,
        dicomStudyUid,
        orthancStudyId,
        optionalDate(dto.orderedAt, 'orderedAt'),
        optionalDate(dto.performedAt, 'performedAt'),
        optionalDate(dto.interpretedAt, 'interpretedAt'),
        optionalText(dto.findings, 'findings', 4000),
        interpretationStatus,
        optionalText(dto.studyDescription, 'studyDescription', 255),
        optionalText(dto.accessionNumber, 'accessionNumber', 100),
        optionalInteger(dto.seriesCount, 'seriesCount', 0, 100000),
        optionalInteger(dto.instanceCount, 'instanceCount', 0, 10000000),
        optionalDate(dto.studyDate, 'studyDate'),
        dicomPatientId,
        patientMatchStatus,
        actor?.id ?? null,
        this.actorName(actor),
      ],
    );

    await this.audit(
      'stroke_imaging',
      result.insertId,
      'linked',
      actor,
      activation.pid,
      { activationId, modality, imagingId, dicomStudyUid },
    );
    const rows = await this.listImaging(activationId);
    return rows.find((r) => r.id === result.insertId) ?? rows[0];
  }

  // ── Transfers ────────────────────────────────────────────────────────────

  async listTransfers(activationId: number): Promise<TransferRow[]> {
    return this.dataSource.query<TransferRow[]>(
      `SELECT id, activation_id, pid, from_facility_id, to_facility_id,
                    reason, status, accepted_by_name, transfer_type, priority,
                    clinical_summary, referring_clinician_name,
                    accepting_clinician_name, transport_status,
                    DATE_FORMAT(transferred_at, '%Y-%m-%dT%H:%i:%s') AS transferred_at,
                    DATE_FORMAT(departure_at, '%Y-%m-%dT%H:%i:%s') AS departure_at,
                    DATE_FORMAT(arrival_at, '%Y-%m-%dT%H:%i:%s') AS arrival_at,
                    DATE_FORMAT(accepted_at, '%Y-%m-%dT%H:%i:%s') AS accepted_at,
                    DATE_FORMAT(arrival_confirmed_at, '%Y-%m-%dT%H:%i:%s') AS arrival_confirmed_at,
                    created_at
               FROM stroke_transfers
              WHERE activation_id = ?
              ORDER BY created_at DESC, id DESC`,
      [activationId],
    );
  }

  async addTransfer(
    activationId: number,
    dto: TransferDto,
    actor?: StrokeActor,
  ) {
    const activation = await this.findActivation(activationId);
    const toFacilityId = optionalInteger(dto.toFacilityId, 'toFacilityId', 1);
    if (toFacilityId === null) {
      throw new BadRequestException('toFacilityId is required.');
    }
    if (Number(toFacilityId) === Number(activation.facility_id)) {
      throw new BadRequestException(
        'The transfer destination must differ from the current facility.',
      );
    }
    const result = await this.dataSource.query<AffectedRowsResult>(
      `INSERT INTO stroke_transfers
               (activation_id, pid, from_facility_id, to_facility_id, reason,
                status, accepted_by_name, departure_at, transfer_type, priority,
                clinical_summary, referring_clinician_name,
                accepting_clinician_name, transport_status, created_by)
             VALUES (?, ?, ?, ?, ?, 'requested', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        activationId,
        activation.pid,
        activation.facility_id,
        toFacilityId,
        optionalText(dto.reason, 'reason', 4000),
        optionalText(dto.acceptedByName, 'acceptedByName', 120),
        optionalDate((dto as TransferCreateDto).departureAt, 'departureAt'),
        dto.transferType
          ? oneOf(dto.transferType, TRANSFER_TYPES, 'transferType')
          : null,
        dto.priority
          ? oneOf(dto.priority, TRANSFER_PRIORITIES, 'priority')
          : 'routine',
        optionalText(dto.clinicalSummary, 'clinicalSummary', 8000),
        optionalText(dto.referringClinicianName, 'referringClinicianName', 120),
        optionalText(dto.acceptingClinicianName, 'acceptingClinicianName', 120),
        dto.transportStatus
          ? oneOf(dto.transportStatus, TRANSPORT_STATUSES, 'transportStatus')
          : null,
        actor?.id ?? null,
      ],
    );
    await this.audit(
      'stroke_transfer',
      result.insertId,
      'requested',
      actor,
      activation.pid,
      { activationId, toFacilityId },
    );
    const rows = await this.listTransfers(activationId);
    return rows.find((r) => r.id === result.insertId) ?? rows[0];
  }

  /** Update imaging order/result timestamps and interpretation status. */
  async updateImagingLink(
    imagingRecordId: number,
    dto: ImagingUpdateDto,
    actor?: StrokeActor,
  ) {
    const rows = await this.dataSource.query<
      Array<{ id: number; activation_id: number; pid: number }>
    >(
      `SELECT id, activation_id, pid FROM stroke_imaging_studies WHERE id = ?`,
      [imagingRecordId],
    );
    if (!rows.length) {
      throw new NotFoundException(
        `Stroke imaging record ${imagingRecordId} was not found.`,
      );
    }
    const sets: string[] = [];
    const params: unknown[] = [];
    if (dto.interpretationStatus !== undefined) {
      sets.push('interpretation_status = ?');
      params.push(
        oneOf(
          dto.interpretationStatus,
          IMAGING_STATUSES,
          'interpretationStatus',
        ),
      );
      if (
        dto.interpretationStatus === 'reported' ||
        dto.interpretationStatus === 'reviewed'
      ) {
        sets.push('interpretation_by = ?');
        params.push(this.actorName(actor));
        sets.push(
          'interpreted_at = COALESCE(interpreted_at, CURRENT_TIMESTAMP)',
        );
      }
    }
    if (dto.orderedAt !== undefined) {
      sets.push('ordered_at = ?');
      params.push(optionalDate(dto.orderedAt, 'orderedAt'));
    }
    if (dto.performedAt !== undefined) {
      sets.push('performed_at = ?');
      params.push(optionalDate(dto.performedAt, 'performedAt'));
    }
    if (dto.interpretedAt !== undefined) {
      sets.push('interpreted_at = ?');
      params.push(optionalDate(dto.interpretedAt, 'interpretedAt'));
    }
    if (dto.findings !== undefined) {
      sets.push('findings = ?');
      params.push(optionalText(dto.findings, 'findings', 4000));
    }
    if (!sets.length) {
      throw new BadRequestException('No supported fields were supplied.');
    }
    await this.dataSource.query(
      `UPDATE stroke_imaging_studies SET ${sets.join(', ')} WHERE id = ?`,
      [...params, imagingRecordId],
    );
    await this.audit(
      'stroke_imaging',
      imagingRecordId,
      'updated',
      actor,
      rows[0].pid,
      dto,
    );
    const list = await this.listImaging(rows[0].activation_id);
    return list.find((study) => study.id === imagingRecordId) ?? list[0];
  }

  /** Track a transfer through request → acceptance → departure → arrival. */
  async updateTransfer(
    transferId: number,
    dto: TransferUpdateDto,
    actor?: StrokeActor,
  ) {
    const rows = await this.dataSource.query<
      Array<{ id: number; activation_id: number; pid: number }>
    >(`SELECT id, activation_id, pid FROM stroke_transfers WHERE id = ?`, [
      transferId,
    ]);
    if (!rows.length) {
      throw new NotFoundException(`Transfer ${transferId} was not found.`);
    }
    const sets: string[] = [];
    const params: unknown[] = [];
    if (dto.status !== undefined) {
      sets.push('status = ?');
      params.push(oneOf(dto.status, TRANSFER_STATUSES, 'status'));
      if (dto.status === 'accepted') {
        sets.push('accepted_at = COALESCE(accepted_at, CURRENT_TIMESTAMP)');
      }
    }
    if (dto.departureAt !== undefined) {
      sets.push('departure_at = ?');
      params.push(optionalDate(dto.departureAt, 'departureAt'));
    }
    if (dto.arrivalAt !== undefined) {
      sets.push('arrival_at = ?');
      params.push(optionalDate(dto.arrivalAt, 'arrivalAt'));
    }
    if (dto.acceptedByName !== undefined) {
      sets.push('accepted_by_name = ?');
      params.push(optionalText(dto.acceptedByName, 'acceptedByName', 120));
    }
    if (dto.transferType !== undefined) {
      sets.push('transfer_type = ?');
      params.push(oneOf(dto.transferType, TRANSFER_TYPES, 'transferType'));
    }
    if (dto.priority !== undefined) {
      sets.push('priority = ?');
      params.push(oneOf(dto.priority, TRANSFER_PRIORITIES, 'priority'));
    }
    if (dto.clinicalSummary !== undefined) {
      sets.push('clinical_summary = ?');
      params.push(optionalText(dto.clinicalSummary, 'clinicalSummary', 8000));
    }
    if (dto.referringClinicianName !== undefined) {
      sets.push('referring_clinician_name = ?');
      params.push(
        optionalText(dto.referringClinicianName, 'referringClinicianName', 120),
      );
    }
    if (dto.acceptingClinicianName !== undefined) {
      sets.push('accepting_clinician_name = ?');
      params.push(
        optionalText(dto.acceptingClinicianName, 'acceptingClinicianName', 120),
      );
    }
    if (dto.transportStatus !== undefined) {
      sets.push('transport_status = ?');
      params.push(
        oneOf(dto.transportStatus, TRANSPORT_STATUSES, 'transportStatus'),
      );
    }
    if (dto.arrivalConfirmedAt !== undefined) {
      sets.push('arrival_confirmed_at = ?');
      params.push(optionalDate(dto.arrivalConfirmedAt, 'arrivalConfirmedAt'));
    }
    if (!sets.length) {
      throw new BadRequestException('No supported fields were supplied.');
    }
    await this.dataSource.query(
      `UPDATE stroke_transfers SET ${sets.join(', ')} WHERE id = ?`,
      [...params, transferId],
    );
    await this.audit(
      'stroke_transfer',
      transferId,
      'updated',
      actor,
      rows[0].pid,
      dto,
    );
    const list = await this.listTransfers(rows[0].activation_id);
    return list.find((transfer) => transfer.id === transferId) ?? list[0];
  }

  /**
   * Structured transfer summary as a FHIR R4 collection bundle, reusing the
   * same interoperability shape as the stroke activation export.
   */
  async getTransferSummaryFhir(transferId: number, actor?: StrokeActor) {
    const rows = await this.dataSource.query<
      Array<{
        id: number;
        activation_id: number;
        pid: number;
        reason: string | null;
        status: string;
        transfer_type: string | null;
        priority: string | null;
        clinical_summary: string | null;
        referring_clinician_name: string | null;
        accepting_clinician_name: string | null;
        transport_status: string | null;
        to_facility_id: number;
        created_at: string;
      }>
    >(
      `SELECT id, activation_id, pid, reason, status, transfer_type, priority,
              clinical_summary, referring_clinician_name,
              accepting_clinician_name, transport_status, to_facility_id,
              created_at
         FROM stroke_transfers WHERE id = ?`,
      [transferId],
    );
    if (!rows.length) {
      throw new NotFoundException(`Transfer ${transferId} was not found.`);
    }
    const transfer = rows[0];
    const activation = await this.findActivation(transfer.activation_id);
    const patient = await this.dataSource.query<
      Array<{
        pid: number;
        fname: string | null;
        lname: string | null;
        DOB: string | null;
        sex: string | null;
      }>
    >(
      `SELECT pid, fname, lname,
              DATE_FORMAT(DOB, '%Y-%m-%d') AS DOB, sex
         FROM patient_data WHERE pid = ?`,
      [transfer.pid],
    );
    const person = patient[0];
    await this.audit(
      'stroke_transfer',
      transferId,
      'fhir_exported',
      actor,
      transfer.pid,
    );
    const patientRef = `Patient/${transfer.pid}`;
    const encounterRef = `Encounter/stroke-${transfer.activation_id}`;
    return {
      resourceType: 'Bundle',
      type: 'collection',
      timestamp: new Date().toISOString(),
      entry: [
        {
          resource: {
            resourceType: 'Patient',
            id: String(transfer.pid),
            identifier: [
              {
                system: 'urn:openrx:patient-pid',
                value: String(transfer.pid),
              },
            ],
            name: [
              {
                family: person?.lname ?? undefined,
                given: person?.fname ? [person.fname] : undefined,
              },
            ],
            gender: person?.sex ?? undefined,
            birthDate: person?.DOB ?? undefined,
          },
        },
        {
          resource: {
            resourceType: 'Encounter',
            id: `stroke-${transfer.activation_id}`,
            status: 'finished',
            class: {
              system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
              code: 'EMER',
              display: 'emergency',
            },
            subject: { reference: patientRef },
            period: { start: activation.arrival_at ?? undefined },
          },
        },
        {
          resource: {
            resourceType: 'Condition',
            id: `stroke-condition-${transfer.activation_id}`,
            clinicalStatus: {
              coding: [
                {
                  system:
                    'http://terminology.hl7.org/CodeSystem/condition-clinical',
                  code: 'active',
                },
              ],
            },
            code: { text: activation.stroke_type },
            subject: { reference: patientRef },
            encounter: { reference: encounterRef },
          },
        },
        {
          resource: {
            resourceType: 'ServiceRequest',
            id: `stroke-transfer-${transfer.id}`,
            status: transfer.status === 'cancelled' ? 'revoked' : 'active',
            intent: 'order',
            priority:
              transfer.priority === 'emergent'
                ? 'stat'
                : transfer.priority === 'urgent'
                  ? 'urgent'
                  : 'routine',
            code: { text: 'Inter-facility stroke transfer' },
            subject: { reference: patientRef },
            encounter: { reference: encounterRef },
            authoredOn: transfer.created_at,
            performer: transfer.referring_clinician_name
              ? [{ display: transfer.referring_clinician_name }]
              : undefined,
            reasonCode: transfer.reason
              ? [{ text: transfer.reason }]
              : undefined,
            note: [
              transfer.clinical_summary
                ? { text: transfer.clinical_summary }
                : undefined,
              transfer.accepting_clinician_name
                ? {
                    text: `Accepting clinician: ${transfer.accepting_clinician_name}`,
                  }
                : undefined,
            ].filter(Boolean),
            extension: [
              {
                url: 'urn:openrx:stroke:transfer-type',
                valueString: transfer.transfer_type ?? 'unspecified',
              },
              {
                url: 'urn:openrx:stroke:transport-status',
                valueString: transfer.transport_status ?? 'unknown',
              },
            ],
          },
        },
      ],
    };
  }

  /** Audit trail for the activation, for the timeline panel and reviews. */
  async getTimeline(activationId: number): Promise<AuditRow[]> {
    const activation = await this.findActivation(activationId);
    return this.dataSource.query<AuditRow[]>(
      `SELECT id, entity_type, entity_id, action, actor_id, actor_name,
                    detail_json,
                    DATE_FORMAT(created_at, '%Y-%m-%dT%H:%i:%s') AS created_at
               FROM stroke_audit_events
              WHERE (entity_type = 'stroke_activation' AND entity_id = ?)
                 OR patient_pid = ?
              ORDER BY created_at DESC, id DESC
              LIMIT 200`,
      [activationId, activation.pid],
    );
  }

  // ── Follow-up (outpatient / secondary prevention) ───────────────────────

  async listFollowUps(pid: number): Promise<FollowUpRow[]> {
    return this.dataSource.query<FollowUpRow[]>(
      `SELECT id, pid, activation_id, visit_type, status, notes,
                    DATE_FORMAT(due_date, '%Y-%m-%d') AS due_date,
                    DATE_FORMAT(completed_at, '%Y-%m-%dT%H:%i:%s') AS completed_at,
                    completed_by_name, created_at
               FROM stroke_followups
              WHERE pid = ?
              ORDER BY status <> 'completed', due_date ASC, id DESC`,
      [pid],
    );
  }

  async addFollowUp(
    pid: number,
    dto: FollowUpDto,
    actor?: StrokeActor,
    activationId: number | null = null,
  ) {
    await this.assertPatient(pid);
    const due = requiredDate(dto.dueDate, 'dueDate');
    const result = await this.dataSource.query<AffectedRowsResult>(
      `INSERT INTO stroke_followups
               (pid, activation_id, due_date, visit_type, status, notes, created_by)
             VALUES (?, ?, ?, ?, 'scheduled', ?, ?)`,
      [
        pid,
        activationId,
        due.slice(0, 10),
        optionalText(dto.visitType, 'visitType', 60) ?? 'stroke_clinic',
        optionalText(dto.notes, 'notes', 4000),
        actor?.id ?? null,
      ],
    );
    await this.audit(
      'stroke_followup',
      result.insertId,
      'scheduled',
      actor,
      pid,
      { dueDate: due.slice(0, 10), activationId },
    );
    const rows = await this.listFollowUps(pid);
    return rows.find((r) => r.id === result.insertId) ?? rows[0];
  }

  /** Mark a follow-up completed; the visit itself is documented in encounters. */
  async completeFollowUp(id: number, actor?: StrokeActor) {
    const rows = await this.dataSource.query<
      Array<{ id: number; pid: number; status: string }>
    >(`SELECT id, pid, status FROM stroke_followups WHERE id = ?`, [id]);
    if (!rows.length) {
      throw new NotFoundException(`Follow-up ${id} was not found.`);
    }
    if (rows[0].status === 'completed') {
      throw new ConflictException(`Follow-up ${id} is already completed.`);
    }
    await this.dataSource.query(
      `UPDATE stroke_followups
                SET status = 'completed', completed_at = CURRENT_TIMESTAMP,
                    completed_by = ?, completed_by_name = ?
              WHERE id = ?`,
      [actor?.id ?? null, this.actorName(actor), id],
    );
    await this.audit('stroke_followup', id, 'completed', actor, rows[0].pid);
    return { id, status: 'completed' };
  }

  // ── Multidisciplinary care-team tasks ───────────────────────────────────

  async listTasks(pid: number): Promise<TaskRow[]> {
    return this.dataSource.query<TaskRow[]>(
      `SELECT id, pid, activation_id, discipline, task, status,
                    assigned_to, completed_by_name,
                    DATE_FORMAT(due_at, '%Y-%m-%dT%H:%i:%s') AS due_at,
                    DATE_FORMAT(completed_at, '%Y-%m-%dT%H:%i:%s') AS completed_at,
                    created_at
               FROM stroke_care_tasks
              WHERE pid = ?
              ORDER BY status <> 'completed', COALESCE(due_at, created_at)`,
      [pid],
    );
  }

  async addTask(
    pid: number,
    dto: TaskDto,
    actor?: StrokeActor,
    activationId: number | null = null,
  ) {
    await this.assertPatient(pid);
    const result = await this.dataSource.query<AffectedRowsResult>(
      `INSERT INTO stroke_care_tasks
               (pid, activation_id, discipline, task, due_at, status,
                assigned_to, created_by)
             VALUES (?, ?, ?, ?, ?, 'open', ?, ?)`,
      [
        pid,
        activationId,
        requiredText(dto.discipline, 'discipline'),
        requiredText(dto.task, 'task'),
        optionalDate(dto.dueAt, 'dueAt'),
        optionalInteger(dto.assignedTo, 'assignedTo', 1),
        actor?.id ?? null,
      ],
    );
    await this.audit('stroke_task', result.insertId, 'created', actor, pid, {
      discipline: dto.discipline,
      activationId,
    });
    const rows = await this.listTasks(pid);
    return rows.find((r) => r.id === result.insertId) ?? rows[0];
  }

  async updateTaskStatus(id: number, status: string, actor?: StrokeActor) {
    const next = oneOf(status, TASK_STATUSES, 'status');
    const rows = await this.dataSource.query<
      Array<{ id: number; pid: number; status: string }>
    >(`SELECT id, pid, status FROM stroke_care_tasks WHERE id = ?`, [id]);
    if (!rows.length) {
      throw new NotFoundException(`Stroke care task ${id} was not found.`);
    }
    await this.dataSource.query(
      `UPDATE stroke_care_tasks
                SET status = ?, completed_at = CASE WHEN ? = 'completed'
                        THEN CURRENT_TIMESTAMP ELSE completed_at END,
                    completed_by = CASE WHEN ? = 'completed' THEN ? ELSE completed_by END,
                    completed_by_name = CASE WHEN ? = 'completed' THEN ? ELSE completed_by_name END
              WHERE id = ?`,
      [next, next, next, actor?.id ?? null, next, this.actorName(actor), id],
    );
    await this.audit('stroke_task', id, next, actor, rows[0].pid);
    return { id, status: next };
  }

  // ── Stroke encounter profile (Module A) ─────────────────────────────────

  /**
   * Stroke-specific encounter data plus the patient context that already lives
   * in OpenRx (allergies, active prescriptions, previous stroke encounters).
   * No demographic or allergy record is copied into a stroke table.
   */
  async getEncounterProfile(activationId: number) {
    const activation = await this.findActivation(activationId);
    const [profiles, allergies, medications, priorEncounters] =
      await Promise.all([
        this.dataSource.query<ProfileRow[]>(
          `SELECT id, activation_id,
                  DATE_FORMAT(symptom_discovered_at, '%Y-%m-%dT%H:%i:%s') AS symptom_discovered_at,
                  initial_neuro_findings, risk_factors_json, prior_stroke_tia,
                  prior_stroke_details, relevant_history, attending_provider_id,
                  attending_provider_name, facility_department,
                  DATE_FORMAT(updated_at, '%Y-%m-%dT%H:%i:%s') AS updated_at
             FROM stroke_encounter_profiles WHERE activation_id = ?`,
          [activationId],
        ),
        this.dataSource.query<AllergyRow[]>(
          `SELECT id, title, reaction, severity_al,
                  DATE_FORMAT(begdate, '%Y-%m-%d') AS begdate
             FROM lists
            WHERE pid = ? AND type = 'allergy' AND activity = 1
            ORDER BY begdate DESC, id DESC`,
          [activation.pid],
        ),
        this.dataSource.query<MedicationRow[]>(
          `SELECT id, drug, dosage, route,
                  DATE_FORMAT(start_date, '%Y-%m-%d') AS start_date
             FROM prescriptions
            WHERE patient_id = ? AND active = 1
            ORDER BY start_date DESC, id DESC
            LIMIT 100`,
          [activation.pid],
        ),
        this.dataSource.query<ActivationRow[]>(
          `SELECT id, activation_code, care_setting, status, stroke_type,
                  nihss_total, nihss_severity,
                  DATE_FORMAT(arrival_at, '%Y-%m-%dT%H:%i:%s') AS arrival_at
             FROM stroke_activations
            WHERE pid = ? AND id <> ?
            ORDER BY arrival_at DESC, id DESC`,
          [activation.pid, activationId],
        ),
      ]);

    const row = profiles[0] ?? null;
    return {
      activation: {
        id: activation.id,
        pid: activation.pid,
        encounterId: activation.encounter_id,
        facilityId: activation.facility_id,
        careSetting: activation.care_setting,
        status: activation.status,
        arrivalAt: activation.arrival_at,
        lkwAt: activation.lkw_at,
        strokeType: activation.stroke_type,
        codeStrokeLevel: activation.code_stroke_level,
        attendingProviderId: row?.attending_provider_id ?? null,
        attendingProviderName: row?.attending_provider_name ?? null,
        department: row?.facility_department ?? null,
      },
      profile: row
        ? {
            ...row,
            riskFactors: parseStringArray(row.risk_factors_json),
            priorStrokeTia:
              row.prior_stroke_tia === null
                ? null
                : Number(row.prior_stroke_tia) === 1,
          }
        : null,
      allergies,
      activeMedications: medications,
      priorStrokeEncounters: priorEncounters,
    };
  }

  /** Create or update the stroke-specific encounter profile. */
  async upsertEncounterProfile(
    activationId: number,
    dto: EncounterProfileDto,
    actor?: StrokeActor,
  ) {
    const activation = await this.findActivation(activationId);
    const riskFactors = Array.isArray(dto.riskFactors)
      ? dto.riskFactors
          .filter((item): item is string => typeof item === 'string')
          .map((item) => item.trim())
          .filter(Boolean)
          .slice(0, 30)
      : [];
    for (const factor of riskFactors) {
      if (factor.length > 80) {
        throw new BadRequestException(
          'Each risk factor must be 80 characters or fewer.',
        );
      }
    }
    if (
      dto.priorStrokeTia !== undefined &&
      dto.priorStrokeTia !== null &&
      typeof dto.priorStrokeTia !== 'boolean'
    ) {
      throw new BadRequestException('priorStrokeTia must be true or false.');
    }
    const priorStrokeTia =
      dto.priorStrokeTia === undefined || dto.priorStrokeTia === null
        ? null
        : dto.priorStrokeTia
          ? 1
          : 0;

    let attendingId = optionalInteger(
      dto.attendingProviderId,
      'attendingProviderId',
      1,
    );
    let attendingName = optionalText(
      dto.attendingProviderName,
      'attendingProviderName',
      120,
    );
    if (attendingId !== null) {
      const providers = await this.dataSource.query<
        Array<{ id: number; fname: string | null; lname: string | null }>
      >(`SELECT id, fname, lname FROM users WHERE id = ? LIMIT 1`, [
        attendingId,
      ]);
      if (!providers.length) {
        throw new BadRequestException(
          `Attending provider ${attendingId} was not found.`,
        );
      }
      attendingName =
        [providers[0].fname, providers[0].lname].filter(Boolean).join(' ') ||
        attendingName;
    } else {
      attendingId = null;
    }

    const department = optionalText(
      dto.facilityDepartment,
      'facilityDepartment',
      120,
    );
    if (dto.encounterStatus !== undefined) {
      await this.dataSource.query(
        `UPDATE stroke_activations
            SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [
          oneOf(dto.encounterStatus, ACTIVATION_STATUSES, 'encounterStatus'),
          activationId,
        ],
      );
    }

    await this.dataSource.query(
      `INSERT INTO stroke_encounter_profiles
         (activation_id, symptom_discovered_at, initial_neuro_findings,
          risk_factors_json, prior_stroke_tia, prior_stroke_details,
          relevant_history, attending_provider_id, attending_provider_name,
          facility_department, created_by, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON DUPLICATE KEY UPDATE
         symptom_discovered_at = VALUES(symptom_discovered_at),
         initial_neuro_findings = VALUES(initial_neuro_findings),
         risk_factors_json = VALUES(risk_factors_json),
         prior_stroke_tia = VALUES(prior_stroke_tia),
         prior_stroke_details = VALUES(prior_stroke_details),
         relevant_history = VALUES(relevant_history),
         attending_provider_id = VALUES(attending_provider_id),
         attending_provider_name = VALUES(attending_provider_name),
         facility_department = VALUES(facility_department),
         updated_at = CURRENT_TIMESTAMP`,
      [
        activationId,
        optionalDate(dto.symptomDiscoveredAt, 'symptomDiscoveredAt'),
        optionalText(dto.initialNeuroFindings, 'initialNeuroFindings', 4000),
        JSON.stringify(riskFactors),
        priorStrokeTia,
        optionalText(dto.priorStrokeDetails, 'priorStrokeDetails', 4000),
        optionalText(dto.relevantHistory, 'relevantHistory', 4000),
        attendingId,
        attendingName,
        department,
        actor?.id ?? null,
      ],
    );
    await this.audit(
      'stroke_encounter_profile',
      activationId,
      'updated',
      actor,
      activation.pid,
      { riskFactors: riskFactors.length },
    );
    return this.getEncounterProfile(activationId);
  }

  // ── Module C: durable notifications and milestones ──────────────────────

  private async createNotification(input: {
    activationId?: number | null;
    pid?: number | null;
    recipientId?: number | null;
    recipientRole?: string | null;
    kind: string;
    severity: string;
    title: string;
    detail?: string | null;
    dedupeKey?: string | null;
    actor?: StrokeActor;
  }): Promise<void> {
    await this.dataSource.query(
      `INSERT IGNORE INTO stroke_notifications
         (activation_id, pid, recipient_id, recipient_role, kind, severity,
          title, detail, status, dedupe_key)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [
        input.activationId ?? null,
        input.pid ?? null,
        input.recipientId ?? null,
        input.recipientRole ?? null,
        input.kind,
        input.severity,
        input.title.slice(0, 160),
        input.detail ?? null,
        input.dedupeKey ?? null,
      ],
    );
  }

  private async upsertMilestone(
    activationId: number,
    milestoneKey: string,
    occurredAt: string | null,
    timeQuality: TimeQuality,
    source: string | null,
    actor: StrokeActor | undefined,
    notes: string | null = null,
  ): Promise<void> {
    await this.dataSource.query(
      `INSERT INTO stroke_milestones
         (activation_id, milestone_key, occurred_at, time_quality, source,
          notes, recorded_by, recorded_by_name, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON DUPLICATE KEY UPDATE
         occurred_at = VALUES(occurred_at),
         time_quality = VALUES(time_quality),
         source = VALUES(source),
         notes = VALUES(notes),
         recorded_by = VALUES(recorded_by),
         recorded_by_name = VALUES(recorded_by_name),
         updated_at = CURRENT_TIMESTAMP`,
      [
        activationId,
        milestoneKey,
        occurredAt,
        timeQuality,
        source,
        notes,
        actor?.id ?? null,
        this.actorName(actor),
      ],
    );
  }

  private async seedActivationMilestones(
    activationId: number,
    times: {
      arrivalAt: string;
      activatedAt: string;
      lkwAt: string | null;
    },
    actor?: StrokeActor,
  ): Promise<void> {
    await this.upsertMilestone(
      activationId,
      'emergency_arrival',
      times.arrivalAt,
      'reported',
      'Activation',
      actor,
    );
    await this.upsertMilestone(
      activationId,
      'alert_activation',
      times.activatedAt,
      'reported',
      'Activation',
      actor,
    );
    if (times.lkwAt) {
      await this.upsertMilestone(
        activationId,
        'last_known_well',
        times.lkwAt,
        'reported',
        'Activation',
        actor,
      );
    }
  }

  /** Record or correct one clinical milestone with an explicit time quality. */
  async recordMilestone(
    activationId: number,
    dto: MilestoneDto,
    actor?: StrokeActor,
  ) {
    const activation = await this.findActivation(activationId);
    const key = oneOf(
      dto.milestoneKey,
      STROKE_MILESTONES.map((m) => m.key),
      'milestoneKey',
    );
    const hasTime =
      dto.occurredAt !== undefined &&
      dto.occurredAt !== null &&
      dto.occurredAt !== '';
    const timeQuality =
      dto.timeQuality === undefined ||
      dto.timeQuality === null ||
      dto.timeQuality === ''
        ? hasTime
          ? 'reported'
          : 'unknown'
        : oneOf(dto.timeQuality, TIME_QUALITIES, 'timeQuality');
    if (timeQuality === 'unknown' && hasTime) {
      throw new BadRequestException(
        'An unknown milestone must not carry a timestamp.',
      );
    }
    if (timeQuality !== 'unknown' && !hasTime) {
      throw new BadRequestException(
        'Timing is required when the milestone is estimated, reported or verified.',
      );
    }
    const occurredAt = hasTime
      ? optionalDate(dto.occurredAt, 'occurredAt')
      : null;
    await this.upsertMilestone(
      activationId,
      key,
      occurredAt,
      timeQuality,
      optionalText(dto.source, 'source', 120) ??
        STROKE_MILESTONES.find((m) => m.key === key)?.source ??
        null,
      actor,
      optionalText(dto.notes, 'notes', 2000),
    );
    await this.audit(
      'stroke_milestone',
      activationId,
      'recorded',
      actor,
      activation.pid,
      { milestoneKey: key, occurredAt, timeQuality },
    );
    return this.listClinicalTimeline(activationId);
  }

  /**
   * Clinical timeline. Explicit milestones win; otherwise a structured record
   * (activation, signed NIHSS, imaging, decision, treatment, transfer) supplies
   * the time marked `reported`. Absent events stay `unknown` with no timestamp.
   */
  async listClinicalTimeline(activationId: number) {
    const activation = await this.findActivation(activationId);
    const [
      profiles,
      assessments,
      imaging,
      decisions,
      treatments,
      transfers,
      explicit,
    ] = await Promise.all([
      this.dataSource.query<ProfileRow[]>(
        `SELECT DATE_FORMAT(symptom_discovered_at, '%Y-%m-%dT%H:%i:%s') AS symptom_discovered_at
             FROM stroke_encounter_profiles WHERE activation_id = ?`,
        [activationId],
      ),
      this.dataSource.query<AssessmentRow[]>(
        `SELECT id, DATE_FORMAT(assessed_at, '%Y-%m-%dT%H:%i:%s') AS assessed_at
             FROM stroke_assessments
            WHERE activation_id = ? AND status = 'finalized'
            ORDER BY assessed_at ASC, id ASC`,
        [activationId],
      ),
      this.dataSource.query<ImagingRow[]>(
        `SELECT id, modality, interpretation_status,
                  DATE_FORMAT(ordered_at, '%Y-%m-%dT%H:%i:%s') AS ordered_at,
                  DATE_FORMAT(performed_at, '%Y-%m-%dT%H:%i:%s') AS performed_at,
                  DATE_FORMAT(interpreted_at, '%Y-%m-%dT%H:%i:%s') AS interpreted_at
             FROM stroke_imaging_studies WHERE activation_id = ?`,
        [activationId],
      ),
      this.dataSource.query<DecisionRow[]>(
        `SELECT id, decision_type, decision,
                  DATE_FORMAT(decided_at, '%Y-%m-%dT%H:%i:%s') AS decided_at
             FROM stroke_treatment_decisions WHERE activation_id = ?`,
        [activationId],
      ),
      this.dataSource.query<TreatmentEventRow[]>(
        `SELECT id, event_type, status,
                  DATE_FORMAT(occurred_at, '%Y-%m-%dT%H:%i:%s') AS occurred_at
             FROM stroke_treatment_events WHERE activation_id = ?`,
        [activationId],
      ),
      this.dataSource.query<TransferRow[]>(
        `SELECT id, status,
                  DATE_FORMAT(created_at, '%Y-%m-%dT%H:%i:%s') AS created_at,
                  DATE_FORMAT(departure_at, '%Y-%m-%dT%H:%i:%s') AS departure_at,
                  DATE_FORMAT(arrival_at, '%Y-%m-%dT%H:%i:%s') AS arrival_at
             FROM stroke_transfers WHERE activation_id = ?`,
        [activationId],
      ),
      this.dataSource.query<MilestoneRow[]>(
        `SELECT id, activation_id, milestone_key,
                  DATE_FORMAT(occurred_at, '%Y-%m-%dT%H:%i:%s') AS occurred_at,
                  time_quality, source, notes, recorded_by_name,
                  DATE_FORMAT(updated_at, '%Y-%m-%dT%H:%i:%s') AS updated_at
             FROM stroke_milestones WHERE activation_id = ?`,
        [activationId],
      ),
    ]);

    const earliest = (
      values: Array<string | null | undefined>,
    ): string | null => {
      const present = values.filter(
        (value): value is string => typeof value === 'string' && value !== '',
      );
      return present.length ? present.sort()[0] : null;
    };

    const derived: Record<string, { at: string | null; source: string }> = {
      symptom_discovered: {
        at: profiles[0]?.symptom_discovered_at ?? null,
        source: 'Encounter profile',
      },
      last_known_well: { at: activation.lkw_at, source: 'Activation' },
      emergency_arrival: { at: activation.arrival_at, source: 'Activation' },
      alert_activation: {
        at: activation.activated_at ?? null,
        source: 'Activation',
      },
      first_clinical_assessment: {
        at: assessments[0]?.assessed_at ?? null,
        source: 'Finalized NIHSS',
      },
      nihss_assessment: {
        at: assessments[0]?.assessed_at ?? null,
        source: 'Finalized NIHSS',
      },
      imaging_order: {
        at: earliest(imaging.map((row) => row.ordered_at)),
        source: 'Imaging link',
      },
      imaging_acquisition: {
        at: earliest(imaging.map((row) => row.performed_at)),
        source: 'Imaging link',
      },
      imaging_interpretation: {
        at: earliest(imaging.map((row) => row.interpreted_at)),
        source: 'Imaging link',
      },
      treatment_decision: {
        at: earliest(decisions.map((row) => row.decided_at)),
        source: 'Reperfusion decision',
      },
      treatment_administration: {
        at:
          earliest(
            treatments
              .filter(
                (row) =>
                  row.event_type.endsWith('_administration') &&
                  row.status === 'given',
              )
              .map((row) => row.occurred_at),
          ) ?? activation.tpa_given_at,
        source: 'Treatment record',
      },
      transfer_request: {
        at: earliest(transfers.map((row) => row.created_at)),
        source: 'Transfer record',
      },
      transfer_departure: {
        at: earliest(transfers.map((row) => row.departure_at)),
        source: 'Transfer record',
      },
      admission: {
        at: /admit/i.test(
          String(activation.outcome ?? activation.disposition ?? ''),
        )
          ? activation.disposition_at
          : null,
        source: 'Disposition',
      },
      discharge: {
        at: /discharg|home|rehab/i.test(
          String(activation.outcome ?? activation.disposition ?? ''),
        )
          ? activation.disposition_at
          : null,
        source: 'Disposition',
      },
    };

    return this.buildClinicalTimeline(
      activationId,
      activation,
      explicit,
      derived,
    );
  }

  private buildClinicalTimeline(
    activationId: number,
    activation: ActivationRow,
    explicit: MilestoneRow[],
    derived: Record<string, { at: string | null; source: string }>,
  ) {
    const explicitByKey = new Map(
      explicit.map((row) => [row.milestone_key, row]),
    );
    const arrivalMs = activation.arrival_at
      ? new Date(activation.arrival_at).getTime()
      : null;

    return {
      activationId,
      pathway: pathwayForStrokeType(activation.stroke_type),
      milestones: STROKE_MILESTONES.map((definition) => {
        const stored = explicitByKey.get(definition.key);
        if (stored) {
          const at = stored.occurred_at ?? null;
          return {
            key: definition.key,
            label: definition.label,
            occurredAt: at,
            timeQuality: stored.time_quality,
            source: stored.source ?? definition.source,
            recordedBy: stored.recorded_by_name,
            recordedAt: stored.updated_at,
            derived: false,
            minutesFromArrival:
              at && arrivalMs !== null
                ? Math.round((new Date(at).getTime() - arrivalMs) / 60000)
                : null,
          };
        }
        const fallback = derived[definition.key];
        const at = fallback?.at ?? null;
        return {
          key: definition.key,
          label: definition.label,
          occurredAt: at,
          timeQuality: at ? 'reported' : 'unknown',
          source: fallback?.source ?? definition.source,
          recordedBy: null,
          recordedAt: null,
          derived: at !== null,
          minutesFromArrival:
            at && arrivalMs !== null
              ? Math.round((new Date(at).getTime() - arrivalMs) / 60000)
              : null,
        };
      }),
    };
  }

  // ── Module C: alert team, acknowledgment and closure ────────────────────

  async listTeam(activationId: number): Promise<TeamRow[]> {
    return this.dataSource.query<TeamRow[]>(
      `SELECT t.id, t.activation_id, t.user_id, t.team_role,
              DATE_FORMAT(t.assigned_at, '%Y-%m-%dT%H:%i:%s') AS assigned_at,
              DATE_FORMAT(t.acknowledged_at, '%Y-%m-%dT%H:%i:%s') AS acknowledged_at,
              t.acknowledged_by, t.escalation_level, u.fname, u.lname
         FROM stroke_alert_team t
         LEFT JOIN users u ON u.id = t.user_id
        WHERE t.activation_id = ?
        ORDER BY t.team_role, t.id`,
      [activationId],
    );
  }

  async assignTeamMember(
    activationId: number,
    dto: TeamMemberDto,
    actor?: StrokeActor,
  ) {
    const activation = await this.findActivation(activationId);
    const userId = optionalInteger(dto.userId, 'userId', 1);
    if (userId === null) {
      throw new BadRequestException('userId is required.');
    }
    const teamRole = oneOf(dto.teamRole, STROKE_TEAM_ROLES, 'teamRole');
    const users = await this.dataSource.query<
      Array<{ id: number; fname: string | null; lname: string | null }>
    >(`SELECT id, fname, lname FROM users WHERE id = ? LIMIT 1`, [userId]);
    if (!users.length) {
      throw new NotFoundException(`Team member ${userId} was not found.`);
    }
    await this.dataSource.query(
      `INSERT INTO stroke_alert_team
         (activation_id, user_id, team_role, assigned_by)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE team_role = VALUES(team_role)`,
      [activationId, userId, teamRole, actor?.id ?? null],
    );
    await this.audit(
      'stroke_team',
      activationId,
      'assigned',
      actor,
      activation.pid,
      { userId, teamRole },
    );
    await this.createNotification({
      activationId,
      pid: activation.pid,
      recipientId: userId,
      kind: 'team_assignment',
      severity: 'critical',
      title: `Stroke alert team assignment: ${teamRole}`,
      detail: `You are assigned as ${teamRole} for activation ${activation.activation_code}. Acknowledge the alert.`,
      dedupeKey: `team:${activationId}:${userId}:${teamRole}`,
      actor,
    });
    return this.listTeam(activationId);
  }

  /** A clinician acknowledges their own assignment; admins may acknowledge for a member. */
  async acknowledgeTeamMember(
    activationId: number,
    actor: StrokeActor | undefined,
    teamMemberId?: number | null,
  ) {
    const rows = await this.dataSource.query<
      Array<{ id: number; user_id: number; pid: number }>
    >(
      `SELECT t.id, t.user_id, a.pid
         FROM stroke_alert_team t
         JOIN stroke_activations a ON a.id = t.activation_id
        WHERE t.activation_id = ?`,
      [activationId],
    );
    if (!rows.length) {
      throw new NotFoundException('No team is assigned to this activation.');
    }
    const target = teamMemberId
      ? rows.find((row) => Number(row.id) === Number(teamMemberId))
      : rows.find((row) => Number(row.user_id) === Number(actor?.id));
    if (!target) {
      throw new NotFoundException('Team assignment was not found.');
    }
    if (
      teamMemberId &&
      actor?.id !== target.user_id &&
      actor?.role !== 'admin'
    ) {
      throw new BadRequestException(
        'Only the assigned member or an administrator can acknowledge this assignment.',
      );
    }
    await this.dataSource.query(
      `UPDATE stroke_alert_team
          SET acknowledged_at = CURRENT_TIMESTAMP, acknowledged_by = ?
        WHERE id = ? AND acknowledged_at IS NULL`,
      [actor?.id ?? null, target.id],
    );
    await this.dataSource.query(
      `UPDATE stroke_notifications
          SET status = 'acknowledged', acknowledged_at = CURRENT_TIMESTAMP,
              acknowledged_by = ?, acknowledged_by_name = ?
        WHERE activation_id = ? AND recipient_id = ?
          AND status IN ('pending','delivered','escalated')`,
      [actor?.id ?? null, this.actorName(actor), activationId, target.user_id],
    );
    await this.audit(
      'stroke_team',
      activationId,
      'acknowledged',
      actor,
      target.pid,
      { teamMemberId: target.id, userId: target.user_id },
    );
    return this.listTeam(activationId);
  }

  /** Close the alert with a recorded outcome; the alert cannot be silently dropped. */
  async closeActivation(
    activationId: number,
    dto: CloseActivationDto,
    actor?: StrokeActor,
  ) {
    const activation = await this.findActivation(activationId);
    if (activation.closed_at) {
      throw new ConflictException('This stroke alert is already closed.');
    }
    const outcome = requiredText(dto.outcome, 'outcome');
    const disposition = optionalText(dto.disposition, 'disposition', 80);
    const closedAt = dto.closedAt
      ? requiredDate(dto.closedAt, 'closedAt')
      : new Date().toISOString().slice(0, 19).replace('T', ' ');

    await this.dataSource.query(
      `UPDATE stroke_activations
          SET status = 'completed', outcome = ?, outcome_notes = ?,
              disposition = COALESCE(?, disposition),
              disposition_at = COALESCE(disposition_at, ?),
              closed_at = ?, closed_by = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
      [
        outcome,
        optionalText(dto.notes, 'notes', 4000),
        disposition,
        closedAt,
        closedAt,
        actor?.id ?? null,
        activationId,
      ],
    );

    const outcomeText = `${outcome} ${disposition ?? ''}`;
    const milestoneKey = /admit/i.test(outcomeText)
      ? 'admission'
      : /discharg|home|rehab|transfer/i.test(outcomeText)
        ? 'discharge'
        : null;
    if (milestoneKey) {
      await this.upsertMilestone(
        activationId,
        milestoneKey,
        closedAt,
        'reported',
        'Close alert',
        actor,
        outcome,
      );
    }
    await this.audit(
      'stroke_activation',
      activationId,
      'closed',
      actor,
      activation.pid,
      { outcome, disposition },
    );
    const team = await this.listTeam(activationId);
    for (const member of team) {
      await this.createNotification({
        activationId,
        pid: activation.pid,
        recipientId: member.user_id,
        kind: 'alert_closed',
        severity: 'info',
        title: `Stroke alert closed: ${outcome}`,
        detail: activation.activation_code,
        dedupeKey: `closed:${activationId}:${member.user_id}`,
        actor,
      });
    }
    return this.getActivation(activationId);
  }

  // ── Module C: pathway-separated treatment documentation ─────────────────

  async getPathway(activationId: number) {
    const activation = await this.findActivation(activationId);
    const pathway = pathwayForStrokeType(activation.stroke_type);
    return {
      activationId,
      strokeType: activation.stroke_type,
      pathway,
      allowedEventTypes:
        pathway === 'ischemic'
          ? TREATMENT_EVENT_TYPES
          : TREATMENT_EVENT_TYPES.filter(
              (event) => !ISCHEMIC_ONLY_EVENTS.includes(event),
            ),
      note: 'Documentation only. No eligibility calculation or automatic treatment is performed.',
    };
  }

  async listTreatmentEvents(activationId: number) {
    return this.dataSource.query<TreatmentEventRow[]>(
      `SELECT id, activation_id, pid, event_type, status, medication, dose,
              route, contraindications, details, adverse_severity,
              specialist_name, time_quality, recorded_by_name,
              DATE_FORMAT(occurred_at, '%Y-%m-%dT%H:%i:%s') AS occurred_at,
              created_at
         FROM stroke_treatment_events
        WHERE activation_id = ?
        ORDER BY created_at DESC, id DESC`,
      [activationId],
    );
  }

  /**
   * Record a clinician-directed treatment event. The server enforces pathway
   * separation (no reperfusion documentation on a haemorrhagic pathway) and
   * requires an administration time when a dose is recorded as given. It does
   * not calculate eligibility or recommend treatment.
   */
  async recordTreatmentEvent(
    activationId: number,
    dto: TreatmentEventDto,
    actor?: StrokeActor,
  ) {
    const activation = await this.findActivation(activationId);
    const eventType = oneOf(dto.eventType, TREATMENT_EVENT_TYPES, 'eventType');
    const status = oneOf(dto.status, TREATMENT_EVENT_STATUSES, 'status');
    const pathway = pathwayForStrokeType(activation.stroke_type);
    if (ISCHEMIC_ONLY_EVENTS.includes(eventType) && pathway !== 'ischemic') {
      throw new BadRequestException(
        'Reperfusion documentation is only available after an ischemic pathway is documented.',
      );
    }
    let adverseSeverity: string | null = null;
    if (eventType === 'adverse_event') {
      adverseSeverity = oneOf(
        dto.adverseSeverity,
        ADVERSE_SEVERITIES,
        'adverseSeverity',
      );
    }
    const hasTime =
      dto.occurredAt !== undefined &&
      dto.occurredAt !== null &&
      dto.occurredAt !== '';
    const timeQuality =
      dto.timeQuality === undefined ||
      dto.timeQuality === null ||
      dto.timeQuality === ''
        ? hasTime
          ? 'reported'
          : 'unknown'
        : oneOf(dto.timeQuality, TIME_QUALITIES, 'timeQuality');
    if (timeQuality === 'unknown' && hasTime) {
      throw new BadRequestException(
        'An unknown treatment time must not carry a timestamp.',
      );
    }
    if (timeQuality !== 'unknown' && !hasTime) {
      throw new BadRequestException(
        'A time is required for an estimated, reported or verified treatment event.',
      );
    }
    if (
      eventType.endsWith('_administration') &&
      status === 'given' &&
      !hasTime
    ) {
      throw new BadRequestException(
        'The administration time is required when a treatment is recorded as given.',
      );
    }
    const occurredAt = hasTime
      ? optionalDate(dto.occurredAt, 'occurredAt')
      : null;

    const result = await this.dataSource.query<AffectedRowsResult>(
      `INSERT INTO stroke_treatment_events
         (activation_id, encounter_id, facility_id, pid, event_type, status,
          medication, dose, route,
          contraindications, details, adverse_severity, specialist_name,
          occurred_at, time_quality, recorded_by, recorded_by_name,
          protocol_key, protocol_version)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        activationId,
        activation.encounter_id,
        activation.facility_id,
        activation.pid,
        eventType,
        status,
        optionalText(dto.medication, 'medication', 160),
        optionalText(dto.dose, 'dose', 120),
        optionalText(dto.route, 'route', 80),
        optionalText(dto.contraindications, 'contraindications', 4000),
        optionalText(dto.details, 'details', 4000),
        adverseSeverity,
        optionalText(dto.specialistName, 'specialistName', 120),
        occurredAt,
        timeQuality,
        actor?.id ?? null,
        this.actorName(actor),
        ACUTE_ISCHEMIC_STROKE_PROTOCOL.key,
        ACUTE_ISCHEMIC_STROKE_PROTOCOL.version,
      ],
    );
    await this.audit(
      'stroke_treatment_event',
      result.insertId,
      'recorded',
      actor,
      activation.pid,
      { activationId, eventType, status, pathway, occurredAt, timeQuality },
    );
    if (
      adverseSeverity === 'severe' ||
      adverseSeverity === 'life_threatening'
    ) {
      await this.createNotification({
        activationId,
        pid: activation.pid,
        recipientRole: 'physician',
        kind: 'adverse_event',
        severity: 'critical',
        title: `Severe adverse event: ${eventType.replace(/_/g, ' ')}`,
        detail: optionalText(dto.details, 'details', 4000) ?? undefined,
        dedupeKey: `adverse:${result.insertId}`,
        actor,
      });
    }
    const rows = await this.listTreatmentEvents(activationId);
    return rows.find((row) => row.id === result.insertId) ?? rows[0];
  }

  // ── Module C: durable notification delivery, ack and escalation ─────────

  /** Inbox for the signed-in user (direct assignments plus role broadcasts). */
  async listNotifications(actor: StrokeActor & { role?: string }) {
    if (!actor?.id && !actor?.role) {
      throw new BadRequestException('A signed-in user is required.');
    }
    return this.dataSource.query<NotificationRow[]>(
      `SELECT n.id, n.activation_id, n.pid, n.recipient_id, n.recipient_role,
              n.kind, n.severity, n.title, n.detail, n.status,
              n.escalation_level, n.acknowledged_by_name,
              DATE_FORMAT(n.created_at, '%Y-%m-%dT%H:%i:%s') AS created_at,
              DATE_FORMAT(n.delivered_at, '%Y-%m-%dT%H:%i:%s') AS delivered_at,
              DATE_FORMAT(n.acknowledged_at, '%Y-%m-%dT%H:%i:%s') AS acknowledged_at,
              DATE_FORMAT(n.escalated_at, '%Y-%m-%dT%H:%i:%s') AS escalated_at,
              a.activation_code, a.pid AS activation_pid
         FROM stroke_notifications n
         LEFT JOIN stroke_activations a ON a.id = n.activation_id
        WHERE (n.recipient_id = ? OR (n.recipient_id IS NULL AND n.recipient_role = ?))
          AND n.status IN ('pending','delivered','escalated')
        ORDER BY FIELD(n.severity, 'critical', 'warning', 'info'), n.created_at ASC
        LIMIT 100`,
      [actor.id ?? 0, actor.role ?? ''],
    );
  }

  async acknowledgeNotification(
    notificationId: number,
    actor: StrokeActor & { role?: string },
  ) {
    const rows = await this.dataSource.query<
      Array<{
        id: number;
        recipient_id: number | null;
        recipient_role: string | null;
        activation_id: number | null;
      }>
    >(
      `SELECT id, recipient_id, recipient_role, activation_id
         FROM stroke_notifications WHERE id = ?`,
      [notificationId],
    );
    if (!rows.length) {
      throw new NotFoundException(
        `Notification ${notificationId} was not found.`,
      );
    }
    const row = rows[0];
    const allowed =
      actor.role === 'admin' ||
      (row.recipient_id !== null &&
        Number(row.recipient_id) === Number(actor.id)) ||
      (row.recipient_id === null && row.recipient_role === actor.role);
    if (!allowed) {
      throw new BadRequestException(
        'This notification is assigned to another user or role.',
      );
    }
    await this.dataSource.query(
      `UPDATE stroke_notifications
          SET status = 'acknowledged', acknowledged_at = CURRENT_TIMESTAMP,
              acknowledged_by = ?, acknowledged_by_name = ?
        WHERE id = ? AND status <> 'acknowledged'`,
      [actor.id ?? null, this.actorName(actor), notificationId],
    );
    await this.audit(
      'stroke_notification',
      notificationId,
      'acknowledged',
      actor,
      null,
      { activationId: row.activation_id },
    );
    return { id: notificationId, status: 'acknowledged' };
  }

  /**
   * Durable delivery sweep. Pending rows are marked delivered (the database is
   * the delivery channel), then unacknowledged critical rows older than five
   * minutes are escalated. No WebSocket is required for any of this.
   */
  async runNotificationSweep(actor = 'scheduler') {
    const delivered = await this.dataSource.query<AffectedRowsResult>(
      `UPDATE stroke_notifications
          SET status = 'delivered', delivered_at = CURRENT_TIMESTAMP,
              last_attempt_at = CURRENT_TIMESTAMP, attempt_count = attempt_count + 1
        WHERE status = 'pending' AND created_at <= NOW()`,
    );
    const escalated = await this.dataSource.query<AffectedRowsResult>(
      `UPDATE stroke_notifications
          SET status = 'escalated', escalation_level = escalation_level + 1,
              escalated_at = CURRENT_TIMESTAMP
        WHERE status IN ('pending','delivered')
          AND severity = 'critical'
          AND created_at < DATE_SUB(NOW(), INTERVAL 5 MINUTE)`,
    );
    const teamEscalated = await this.dataSource.query<AffectedRowsResult>(
      `UPDATE stroke_alert_team
          SET escalation_level = escalation_level + 1, escalated_at = CURRENT_TIMESTAMP
        WHERE acknowledged_at IS NULL
          AND escalated_at IS NULL
          AND assigned_at < DATE_SUB(NOW(), INTERVAL 5 MINUTE)`,
    );
    const summary = {
      ranAt: new Date().toISOString(),
      by: actor,
      delivered: Number(delivered.affectedRows) || 0,
      escalated: Number(escalated.affectedRows) || 0,
      teamEscalations: Number(teamEscalated.affectedRows) || 0,
    };
    if (summary.escalated || summary.teamEscalations) {
      await this.audit(
        'stroke_notification',
        0,
        'escalation_sweep',
        { username: actor },
        null,
        summary,
      );
    }
    return summary;
  }

  // ── Module C: acute emergency dashboard ─────────────────────────────────

  async getEmergencyDashboard(facilityId?: unknown) {
    const id = optionalInteger(facilityId, 'facilityId', 0);
    const where = [
      "a.status IN ('active','in_progress')",
      id !== null ? 'a.facility_id = ?' : null,
    ].filter(Boolean);
    const params: unknown[] = id !== null ? [id] : [];
    const activations = await this.dataSource.query<
      Array<ActivationRow & { fname: string; lname: string }>
    >(
      `SELECT a.id, a.pid, a.activation_code, a.care_setting, a.status,
              a.stroke_type, a.facility_id, a.outcome,
              DATE_FORMAT(a.arrival_at, '%Y-%m-%dT%H:%i:%s') AS arrival_at,
              DATE_FORMAT(a.activated_at, '%Y-%m-%dT%H:%i:%s') AS activated_at,
              DATE_FORMAT(a.lkw_at, '%Y-%m-%dT%H:%i:%s') AS lkw_at,
              pd.fname, pd.lname
         FROM stroke_activations a
         JOIN patient_data pd ON pd.pid = a.pid
        WHERE ${where.join(' AND ')}
        ORDER BY FIELD(a.stroke_type, 'hemorrhagic', 'ischemic', 'undetermined'),
                 a.activated_at ASC, a.id ASC
        LIMIT 50`,
      params,
    );

    const alerts = await Promise.all(
      activations.map(async (activation) => {
        const [team, assessments, imaging, tasks, notifications, transfers] =
          await Promise.all([
            this.listTeam(activation.id),
            this.dataSource.query<AssessmentRow[]>(
              `SELECT id, total_score, severity,
                      DATE_FORMAT(assessed_at, '%Y-%m-%dT%H:%i:%s') AS assessed_at
                 FROM stroke_assessments
                WHERE activation_id = ? AND status = 'finalized'
                ORDER BY assessed_at DESC, id DESC LIMIT 1`,
              [activation.id],
            ),
            this.dataSource.query<ImagingRow[]>(
              `SELECT id, modality, interpretation_status,
                      DATE_FORMAT(ordered_at, '%Y-%m-%dT%H:%i:%s') AS ordered_at,
                      DATE_FORMAT(performed_at, '%Y-%m-%dT%H:%i:%s') AS performed_at,
                      DATE_FORMAT(interpreted_at, '%Y-%m-%dT%H:%i:%s') AS interpreted_at
                 FROM stroke_imaging_studies WHERE activation_id = ?
                 ORDER BY id DESC`,
              [activation.id],
            ),
            this.dataSource.query<
              Array<{
                id: number;
                discipline: string;
                task: string;
                status: string;
              }>
            >(
              `SELECT id, discipline, task, status
                 FROM stroke_care_tasks
                WHERE activation_id = ? AND status IN ('open','in_progress')
                ORDER BY COALESCE(due_at, created_at) ASC LIMIT 5`,
              [activation.id],
            ),
            this.dataSource.query<Array<{ n: number | string }>>(
              `SELECT COUNT(*) AS n FROM stroke_notifications
                WHERE activation_id = ?
                  AND status IN ('pending','delivered','escalated')`,
              [activation.id],
            ),
            this.dataSource.query<TransferRow[]>(
              `SELECT id, status, to_facility_id,
                      DATE_FORMAT(created_at, '%Y-%m-%dT%H:%i:%s') AS created_at,
                      DATE_FORMAT(departure_at, '%Y-%m-%dT%H:%i:%s') AS departure_at
                 FROM stroke_transfers WHERE activation_id = ?
                 ORDER BY id DESC LIMIT 1`,
              [activation.id],
            ),
          ]);
        const latestNihss = assessments[0] ?? null;
        return {
          id: activation.id,
          activationCode: activation.activation_code,
          pid: activation.pid,
          patientName: `${activation.fname} ${activation.lname}`.trim(),
          careSetting: activation.care_setting,
          status: activation.status,
          strokeType: activation.stroke_type,
          pathway: pathwayForStrokeType(activation.stroke_type),
          arrivalAt: activation.arrival_at,
          activatedAt: activation.activated_at ?? null,
          lkwAt: activation.lkw_at,
          nihss: latestNihss
            ? {
                total: Number(latestNihss.total_score),
                severity: latestNihss.severity,
                assessedAt: latestNihss.assessed_at,
              }
            : null,
          imaging: {
            count: imaging.length,
            latestStatus: imaging[0]?.interpretation_status ?? null,
            modalities: imaging.map((row) => row.modality),
          },
          team: team.map((member) => ({
            id: member.id,
            userId: member.user_id,
            name:
              [member.fname, member.lname].filter(Boolean).join(' ') ||
              'Unknown',
            role: member.team_role,
            acknowledgedAt: member.acknowledged_at,
            escalationLevel: Number(member.escalation_level) || 0,
          })),
          pendingAcknowledgments: team.filter(
            (member) => !member.acknowledged_at,
          ).length,
          tasks,
          pendingNotifications: Number(notifications[0]?.n) || 0,
          transfer: transfers[0] ?? null,
        };
      }),
    );

    return {
      generatedAt: new Date().toISOString(),
      facilityId: id,
      summary: {
        activeAlerts: alerts.length,
        unassignedAlerts: alerts.filter((alert) => alert.team.length === 0)
          .length,
        pendingAcknowledgments: alerts.reduce(
          (sum, alert) => sum + alert.pendingAcknowledgments,
          0,
        ),
        pendingNotifications: alerts.reduce(
          (sum, alert) => sum + alert.pendingNotifications,
          0,
        ),
        openTasks: alerts.reduce((sum, alert) => sum + alert.tasks.length, 0),
      },
      alerts,
    };
  }

  // ── Module D: imaging metadata, reports and viewer access ───────────────

  /**
   * DICOM metadata already stored with the stroke imaging link, plus the
   * existing authorized viewer path. No second PACS is created; an Orthanc or
   * PACS server can supply the study behind the same identifiers.
   */
  async getDicomMetadata(strokeImagingId: number, actor?: StrokeActor) {
    const rows = await this.dataSource.query<
      Array<{
        id: number;
        activation_id: number;
        pid: number;
        imaging_id: number | null;
        modality: string;
        dicom_study_uid: string | null;
        orthanc_study_id: string | null;
        study_description: string | null;
        accession_number: string | null;
        series_count: number | null;
        instance_count: number | null;
        study_date: string | null;
        dicom_patient_id: string | null;
        patient_match_status: string | null;
        interpretation_status: string;
        interpretation_by: string | null;
        ordered_at: string | null;
        performed_at: string | null;
        interpreted_at: string | null;
      }>
    >(
      `SELECT id, activation_id, pid, imaging_id, modality, dicom_study_uid,
              orthanc_study_id, study_description, accession_number,
              series_count, instance_count, dicom_patient_id,
              patient_match_status, interpretation_status, interpretation_by,
              DATE_FORMAT(study_date, '%Y-%m-%dT%H:%i:%s') AS study_date,
              DATE_FORMAT(ordered_at, '%Y-%m-%dT%H:%i:%s') AS ordered_at,
              DATE_FORMAT(performed_at, '%Y-%m-%dT%H:%i:%s') AS performed_at,
              DATE_FORMAT(interpreted_at, '%Y-%m-%dT%H:%i:%s') AS interpreted_at
         FROM stroke_imaging_studies WHERE id = ?`,
      [strokeImagingId],
    );
    if (!rows.length) {
      throw new NotFoundException(
        `Stroke imaging record ${strokeImagingId} was not found.`,
      );
    }
    await this.audit(
      'stroke_imaging',
      strokeImagingId,
      'viewed',
      actor,
      rows[0].pid,
      { source: 'dicom-metadata' },
    );
    return {
      ...rows[0],
      viewerPath: '/dicom',
      viewerNote:
        'Opens the existing authorized OpenRx DICOM viewer; image bytes remain in the configured imaging store.',
    };
  }

  async listRadiologyReports(activationId: number) {
    return this.dataSource.query<Array<Record<string, unknown>>>(
      `SELECT id, activation_id, stroke_imaging_id, report_text, impression,
              status, reported_by_name, external_id,
              DATE_FORMAT(reported_at, '%Y-%m-%dT%H:%i:%s') AS reported_at,
              created_at
         FROM stroke_radiology_reports
        WHERE activation_id = ?
        ORDER BY reported_at DESC, id DESC`,
      [activationId],
    );
  }

  async addRadiologyReport(
    activationId: number,
    dto: RadiologyReportDto,
    actor?: StrokeActor,
  ) {
    const activation = await this.findActivation(activationId);
    const imagingId = optionalInteger(
      dto.strokeImagingId,
      'strokeImagingId',
      1,
    );
    if (imagingId !== null) {
      const rows = await this.dataSource.query<Array<{ id: number }>>(
        `SELECT id FROM stroke_imaging_studies
          WHERE id = ? AND activation_id = ?`,
        [imagingId, activationId],
      );
      if (!rows.length) {
        throw new BadRequestException(
          'The imaging study does not belong to this activation.',
        );
      }
    }
    const result = await this.dataSource.query<AffectedRowsResult>(
      `INSERT INTO stroke_radiology_reports
         (activation_id, stroke_imaging_id, report_text, impression, status,
          reported_by_name, reported_at, external_id, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        activationId,
        imagingId,
        optionalText(dto.reportText, 'reportText', 20000),
        optionalText(dto.impression, 'impression', 4000),
        oneOf(
          dto.status,
          ['preliminary', 'final', 'amended', 'addendum'],
          'status',
          'preliminary',
        ),
        this.actorName(actor),
        optionalDate(dto.reportedAt, 'reportedAt') ??
          new Date().toISOString().slice(0, 19).replace('T', ' '),
        optionalText(dto.externalId, 'externalId', 120),
        actor?.id ?? null,
      ],
    );
    await this.audit(
      'stroke_radiology_report',
      result.insertId,
      'created',
      actor,
      activation.pid,
      { activationId, imagingId },
    );
    const rows = await this.listRadiologyReports(activationId);
    return rows.find((row) => Number(row.id) === result.insertId) ?? rows[0];
  }

  // ── Module E: inpatient stays and stroke-unit workflow ──────────────────

  private async findStay(stayId: number): Promise<StayRow> {
    const rows = await this.dataSource.query<StayRow[]>(
      `SELECT id, activation_id, pid, facility_id, unit, status,
              DATE_FORMAT(admitted_at, '%Y-%m-%dT%H:%i:%s') AS admitted_at,
              DATE_FORMAT(discharged_at, '%Y-%m-%dT%H:%i:%s') AS discharged_at,
              discharge_disposition, attending_name, notes
         FROM stroke_inpatient_stays WHERE id = ?`,
      [stayId],
    );
    if (!rows.length) {
      throw new NotFoundException(
        `Stroke inpatient stay ${stayId} was not found.`,
      );
    }
    const stay = rows[0];
    const room = await this.dataSource.query<Array<{ room: string | null }>>(
      `SELECT room FROM patient_care_assignment WHERE pid = ?`,
      [Number(stay.pid)],
    );
    return { ...stay, room: room[0]?.room ?? null };
  }

  async admitInpatient(
    activationId: number,
    dto: InpatientAdmitDto,
    actor?: StrokeActor,
  ) {
    const activation = await this.findActivation(activationId);
    const admittedAt = requiredDate(
      dto.admittedAt ?? new Date().toISOString(),
      'admittedAt',
    );
    const facilityId =
      optionalInteger(dto.facilityId, 'facilityId', 0) ??
      activation.facility_id;
    const result = await this.dataSource.query<AffectedRowsResult>(
      `INSERT INTO stroke_inpatient_stays
         (activation_id, pid, facility_id, unit, admitted_at, attending_name,
          status, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, 'admitted', ?, ?)
       ON DUPLICATE KEY UPDATE
         unit = VALUES(unit), admitted_at = VALUES(admitted_at),
         attending_name = VALUES(attending_name), status = 'admitted',
         discharged_at = NULL, updated_at = CURRENT_TIMESTAMP`,
      [
        activationId,
        activation.pid,
        facilityId,
        optionalText(dto.unit, 'unit', 80),
        admittedAt,
        optionalText(dto.attendingName, 'attendingName', 120),
        optionalText(dto.notes, 'notes', 4000),
        actor?.id ?? null,
      ],
    );
    const room = optionalText(dto.room, 'room', 40);
    if (room !== null) {
      await this.dataSource.query(
        `INSERT INTO patient_care_assignment (pid, room, updated_at)
         VALUES (?, ?, CURRENT_TIMESTAMP)
         ON DUPLICATE KEY UPDATE room = VALUES(room), updated_at = CURRENT_TIMESTAMP`,
        [activation.pid, room],
      );
    }
    await this.audit(
      'stroke_inpatient_stay',
      result.insertId || activationId,
      'admitted',
      actor,
      activation.pid,
      { activationId, room },
    );
    const stays = await this.listInpatientStays();
    return (
      stays.find((stay) => Number(stay.activation_id) === activationId) ?? {
        activationId,
      }
    );
  }

  async listInpatientStays(facilityId?: unknown) {
    const id = optionalInteger(facilityId, 'facilityId', 0);
    const params: unknown[] = id !== null ? [id] : [];
    return this.dataSource.query<Array<Record<string, unknown>>>(
      `SELECT s.id, s.activation_id, s.pid, s.facility_id, s.unit, s.status,
              s.attending_name, s.discharge_disposition, s.notes,
              DATE_FORMAT(s.admitted_at, '%Y-%m-%dT%H:%i:%s') AS admitted_at,
              DATE_FORMAT(s.discharged_at, '%Y-%m-%dT%H:%i:%s') AS discharged_at,
              ca.room, pd.fname, pd.lname, a.activation_code, a.stroke_type,
              a.nihss_total, a.nihss_severity
         FROM stroke_inpatient_stays s
         JOIN patient_data pd ON pd.pid = s.pid
         JOIN stroke_activations a ON a.id = s.activation_id
         LEFT JOIN patient_care_assignment ca ON ca.pid = s.pid
        ${id !== null ? 'WHERE s.facility_id = ?' : ''}
        ORDER BY s.status = 'discharged', s.admitted_at DESC`,
      params,
    );
  }

  async dischargeInpatient(
    stayId: number,
    dto: {
      dischargedAt?: string;
      disposition?: string;
      notes?: string | null;
    },
    actor?: StrokeActor,
  ) {
    const stay = await this.findStay(stayId);
    const dischargedAt = dto.dischargedAt
      ? requiredDate(dto.dischargedAt, 'dischargedAt')
      : new Date().toISOString().slice(0, 19).replace('T', ' ');
    await this.dataSource.query(
      `UPDATE stroke_inpatient_stays
          SET status = 'discharged', discharged_at = ?,
              discharge_disposition = ?, notes = COALESCE(?, notes),
              updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
      [
        dischargedAt,
        optionalText(dto.disposition, 'disposition', 80),
        optionalText(dto.notes, 'notes', 4000),
        stayId,
      ],
    );
    await this.dataSource.query(
      `UPDATE patient_care_assignment SET room = '', updated_at = CURRENT_TIMESTAMP
        WHERE pid = ?`,
      [Number(stay.pid)],
    );
    await this.audit(
      'stroke_inpatient_stay',
      stayId,
      'discharged',
      actor,
      Number(stay.pid),
      { disposition: dto.disposition },
    );
    return this.findStay(stayId);
  }

  async addInpatientAssessment(
    stayId: number,
    dto: InpatientAssessmentDto,
    actor?: StrokeActor,
  ) {
    const stay = await this.findStay(stayId);
    const assessmentType = oneOf(
      dto.assessmentType,
      ['neuro', 'nursing', 'swallow', 'fall_risk', 'mobility'],
      'assessmentType',
    );
    const score = optionalInteger(dto.score, 'score', 0, 1000);
    const result = await this.dataSource.query<AffectedRowsResult>(
      `INSERT INTO stroke_inpatient_assessments
         (stay_id, activation_id, pid, assessment_type, data_json, score,
          risk_level, notes, recorded_at, recorded_by, recorded_by_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        stayId,
        Number(stay.activation_id),
        Number(stay.pid),
        assessmentType,
        JSON.stringify(dto.data ?? {}),
        score,
        optionalText(dto.riskLevel, 'riskLevel', 20),
        optionalText(dto.notes, 'notes', 4000),
        optionalDate(dto.recordedAt, 'recordedAt') ??
          new Date().toISOString().slice(0, 19).replace('T', ' '),
        actor?.id ?? null,
        this.actorName(actor),
      ],
    );
    await this.audit(
      'stroke_inpatient_assessment',
      result.insertId,
      assessmentType,
      actor,
      Number(stay.pid),
      { stayId },
    );
    const rows = await this.listInpatientAssessments(stayId);
    return rows.find((row) => Number(row.id) === result.insertId) ?? rows[0];
  }

  async listInpatientAssessments(
    stayId: number,
  ): Promise<Array<Record<string, unknown>>> {
    const rows = await this.dataSource.query<Array<Record<string, unknown>>>(
      `SELECT id, stay_id, activation_id, pid, assessment_type, data_json,
              score, risk_level, notes, recorded_by_name,
              DATE_FORMAT(recorded_at, '%Y-%m-%dT%H:%i:%s') AS recorded_at,
              created_at
         FROM stroke_inpatient_assessments
        WHERE stay_id = ?
        ORDER BY recorded_at DESC, id DESC`,
      [stayId],
    );
    return rows.map(({ data_json, ...row }) => ({
      ...row,
      data: safeJson(data_json),
    }));
  }

  async addCarePlan(
    activationId: number,
    dto: CarePlanDto,
    actor?: StrokeActor,
  ) {
    const activation = await this.findActivation(activationId);
    const stays = await this.dataSource.query<Array<{ id: number }>>(
      `SELECT id FROM stroke_inpatient_stays WHERE activation_id = ?`,
      [activationId],
    );
    const result = await this.dataSource.query<AffectedRowsResult>(
      `INSERT INTO stroke_care_plans
         (stay_id, activation_id, pid, plan_type, summary, goals_json,
          review_at, status, created_by, created_by_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        stays[0]?.id ?? null,
        activationId,
        activation.pid,
        oneOf(
          dto.planType,
          [
            'multidisciplinary',
            'nursing',
            'medical',
            'rehabilitation',
            'discharge',
          ],
          'planType',
          'multidisciplinary',
        ),
        optionalText(dto.summary, 'summary', 8000),
        JSON.stringify(dto.goals ?? []),
        optionalDate(dto.reviewAt, 'reviewAt'),
        oneOf(
          dto.status,
          ['active', 'completed', 'cancelled'],
          'status',
          'active',
        ),
        actor?.id ?? null,
        this.actorName(actor),
      ],
    );
    await this.audit(
      'stroke_care_plan',
      result.insertId,
      'created',
      actor,
      activation.pid,
      { activationId },
    );
    const rows = await this.listCarePlans(activationId);
    return rows.find((row) => Number(row.id) === result.insertId) ?? rows[0];
  }

  async listCarePlans(
    activationId: number,
  ): Promise<Array<Record<string, unknown>>> {
    const rows = await this.dataSource.query<Array<Record<string, unknown>>>(
      `SELECT id, stay_id, activation_id, pid, plan_type, summary, goals_json,
              status, created_by_name,
              DATE_FORMAT(review_at, '%Y-%m-%dT%H:%i:%s') AS review_at,
              created_at, updated_at
         FROM stroke_care_plans WHERE activation_id = ?
        ORDER BY status = 'active' DESC, created_at DESC`,
      [activationId],
    );
    return rows.map(({ goals_json, ...row }) => ({
      ...row,
      goals: safeJson(goals_json),
    }));
  }

  async addComplication(
    activationId: number,
    dto: ComplicationDto,
    actor?: StrokeActor,
  ) {
    const activation = await this.findActivation(activationId);
    const stays = await this.dataSource.query<Array<{ id: number }>>(
      `SELECT id FROM stroke_inpatient_stays WHERE activation_id = ?`,
      [activationId],
    );
    const result = await this.dataSource.query<AffectedRowsResult>(
      `INSERT INTO stroke_complications
         (stay_id, activation_id, pid, complication_type, severity, description,
          onset_at, resolved_at, management, recorded_by, recorded_by_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        stays[0]?.id ?? null,
        activationId,
        activation.pid,
        requiredText(dto.complicationType, 'complicationType'),
        oneOf(
          dto.severity,
          ['mild', 'moderate', 'severe', 'life_threatening'],
          'severity',
          'moderate',
        ),
        optionalText(dto.description, 'description', 4000),
        optionalDate(dto.onsetAt, 'onsetAt'),
        optionalDate(dto.resolvedAt, 'resolvedAt'),
        optionalText(dto.management, 'management', 4000),
        actor?.id ?? null,
        this.actorName(actor),
      ],
    );
    await this.audit(
      'stroke_complication',
      result.insertId,
      'created',
      actor,
      activation.pid,
      { activationId },
    );
    const rows = await this.listComplications(activationId);
    return rows.find((row) => Number(row.id) === result.insertId) ?? rows[0];
  }

  async listComplications(activationId: number) {
    return this.dataSource.query<Array<Record<string, unknown>>>(
      `SELECT id, stay_id, activation_id, pid, complication_type, severity,
              description, management, recorded_by_name,
              DATE_FORMAT(onset_at, '%Y-%m-%dT%H:%i:%s') AS onset_at,
              DATE_FORMAT(resolved_at, '%Y-%m-%dT%H:%i:%s') AS resolved_at,
              created_at
         FROM stroke_complications WHERE activation_id = ?
        ORDER BY resolved_at IS NULL DESC, onset_at DESC`,
      [activationId],
    );
  }

  async upsertDischargePlan(
    stayId: number,
    dto: DischargePlanDto,
    actor?: StrokeActor,
  ) {
    const stay = await this.findStay(stayId);
    await this.dataSource.query(
      `INSERT INTO stroke_discharge_plans
         (stay_id, activation_id, pid, target_date, destination, services_json,
          medication_reconciled, followup_scheduled, status, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         target_date = VALUES(target_date), destination = VALUES(destination),
         services_json = VALUES(services_json),
         medication_reconciled = VALUES(medication_reconciled),
         followup_scheduled = VALUES(followup_scheduled),
         status = VALUES(status), notes = VALUES(notes),
         updated_at = CURRENT_TIMESTAMP`,
      [
        stayId,
        Number(stay.activation_id),
        Number(stay.pid),
        optionalDate(dto.targetDate, 'targetDate'),
        optionalText(dto.destination, 'destination', 80),
        JSON.stringify(dto.services ?? []),
        dto.medicationReconciled ? 1 : 0,
        dto.followupScheduled ? 1 : 0,
        oneOf(
          dto.status,
          ['planning', 'ready', 'completed', 'cancelled'],
          'status',
          'planning',
        ),
        optionalText(dto.notes, 'notes', 4000),
        actor?.id ?? null,
      ],
    );
    await this.audit(
      'stroke_discharge_plan',
      stayId,
      'updated',
      actor,
      Number(stay.pid),
      { stayId },
    );
    return this.getDischargePlan(stayId);
  }

  async getDischargePlan(stayId: number) {
    const rows = await this.dataSource.query<
      Array<{
        id: number;
        stay_id: number;
        services_json: string | null;
      }>
    >(
      `SELECT id, stay_id, activation_id, pid, destination, services_json,
              medication_reconciled, followup_scheduled, status, notes,
              DATE_FORMAT(target_date, '%Y-%m-%d') AS target_date,
              DATE_FORMAT(updated_at, '%Y-%m-%dT%H:%i:%s') AS updated_at
         FROM stroke_discharge_plans WHERE stay_id = ?`,
      [stayId],
    );
    if (!rows.length) return null;
    const { services_json, ...plan } = rows[0];
    return { ...plan, services: safeJson(services_json) };
  }

  /**
   * Stroke-unit board. Vitals, MAR, tasks, labs and imaging are read from the
   * existing OpenRx modules; this method only joins stroke-specific context.
   */
  async getInpatientDashboard(facilityId?: unknown) {
    const stays = await this.listInpatientStays(facilityId);
    const active = stays.filter((stay) => String(stay.status) !== 'discharged');
    const patients = [];
    for (const stay of active) {
      const stayId = Number(stay.id);
      const pid = Number(stay.pid);
      const activationId = Number(stay.activation_id);
      const vitals = await this.dataSource.query<
        Array<Record<string, unknown>>
      >(
        `SELECT bps, bpd, pulse, respiration, temperature, oxygen_saturation,
                DATE_FORMAT(date, '%Y-%m-%dT%H:%i:%s') AS recorded_at
           FROM form_vitals WHERE pid = ?
          ORDER BY date DESC, id DESC LIMIT 1`,
        [pid],
      );
      const labs = await this.dataSource.query<Array<{ total: number }>>(
        `SELECT COUNT(*) AS total
           FROM procedure_report pr
           JOIN procedure_order po ON po.procedure_order_id = pr.procedure_order_id
          WHERE po.patient_id = ?
            AND pr.date_report >= DATE_SUB(NOW(), INTERVAL 24 HOUR)`,
        [pid],
      );
      const mar = await this.dataSource.query<Array<{ total: number }>>(
        `SELECT COUNT(*) AS total FROM medication_administration_orders
          WHERE pid = ? AND status = 'active' AND next_due_at IS NOT NULL
            AND next_due_at <= DATE_ADD(NOW(), INTERVAL 1 HOUR)`,
        [pid],
      );
      const tasks = await this.dataSource.query<Array<{ total: number }>>(
        `SELECT COUNT(*) AS total FROM stroke_care_tasks
          WHERE activation_id = ? AND status <> 'completed'`,
        [activationId],
      );
      const assessments = await this.listInpatientAssessments(stayId);
      const latestNeuro =
        assessments.find((item) => item.assessment_type === 'neuro') ?? null;
      const complications = await this.dataSource.query<
        Array<{ total: number }>
      >(
        `SELECT COUNT(*) AS total FROM stroke_complications
          WHERE activation_id = ? AND resolved_at IS NULL`,
        [activationId],
      );
      patients.push({
        ...stay,
        latestVitals: vitals[0] ?? null,
        labsReported24h: Number(labs[0]?.total ?? 0),
        medicationsDueSoon: Number(mar[0]?.total ?? 0),
        outstandingTasks: Number(tasks[0]?.total ?? 0),
        latestNeuroAssessment: latestNeuro,
        unresolvedComplications: Number(complications[0]?.total ?? 0),
        dischargePlan: await this.getDischargePlan(stayId),
      });
    }
    return { generatedAt: new Date().toISOString(), patients };
  }

  // ── Module F: rehabilitation ────────────────────────────────────────────

  async addRehabReferral(
    pid: number,
    dto: RehabReferralDto,
    actor?: StrokeActor,
  ) {
    const patient = await this.findPatient(pid);
    const activationId = optionalInteger(dto.activationId, 'activationId', 1);
    const result = await this.dataSource.query<AffectedRowsResult>(
      `INSERT INTO stroke_rehab_referrals
         (activation_id, pid, discipline, reason, status, referred_by_name, created_by)
       VALUES (?, ?, ?, ?, 'referral', ?, ?)`,
      [
        activationId,
        patient.pid,
        oneOf(
          dto.discipline,
          [
            'physical_therapy',
            'occupational_therapy',
            'speech_language_therapy',
            'swallowing_therapy',
            'cognitive_rehabilitation',
          ],
          'discipline',
        ),
        optionalText(dto.reason, 'reason', 4000),
        this.actorName(actor),
        actor?.id ?? null,
      ],
    );
    await this.audit(
      'stroke_rehab_referral',
      result.insertId,
      'referred',
      actor,
      patient.pid,
      { discipline: dto.discipline },
    );
    const rows = await this.listRehabReferrals(pid);
    return rows.find((row) => Number(row.id) === result.insertId) ?? rows[0];
  }

  async listRehabReferrals(pid?: number) {
    return this.dataSource.query<Array<Record<string, unknown>>>(
      `SELECT r.id, r.activation_id, r.pid, r.discipline, r.reason, r.status,
              r.referred_by_name,
              DATE_FORMAT(r.referred_at, '%Y-%m-%dT%H:%i:%s') AS referred_at,
              DATE_FORMAT(r.accepted_at, '%Y-%m-%dT%H:%i:%s') AS accepted_at,
              (SELECT COUNT(*) FROM stroke_rehab_sessions s
                WHERE s.referral_id = r.id) AS session_count
         FROM stroke_rehab_referrals r
        ${pid !== undefined ? 'WHERE r.pid = ?' : ''}
        ORDER BY r.status IN ('referral','accepted','active') DESC,
                 r.referred_at DESC`,
      pid !== undefined ? [pid] : [],
    );
  }

  async updateRehabReferral(
    referralId: number,
    dto: { status?: string },
    actor?: StrokeActor,
  ) {
    const status = oneOf(
      dto.status,
      ['referral', 'accepted', 'active', 'completed', 'declined'],
      'status',
    );
    const rows = await this.dataSource.query<
      Array<{ id: number; pid: number }>
    >(`SELECT id, pid FROM stroke_rehab_referrals WHERE id = ?`, [referralId]);
    if (!rows.length) {
      throw new NotFoundException(
        `Rehabilitation referral ${referralId} was not found.`,
      );
    }
    await this.dataSource.query(
      `UPDATE stroke_rehab_referrals
          SET status = ?, accepted_at = IF(? = 'accepted',
                COALESCE(accepted_at, NOW()), accepted_at)
        WHERE id = ?`,
      [status, status, referralId],
    );
    await this.audit(
      'stroke_rehab_referral',
      referralId,
      status,
      actor,
      rows[0].pid,
    );
    return (await this.listRehabReferrals(rows[0].pid)).find(
      (row) => Number(row.id) === referralId,
    );
  }

  async addRehabPlan(
    referralId: number,
    dto: RehabPlanDto,
    actor?: StrokeActor,
  ) {
    const referral = await this.findRehabReferral(referralId);
    const result = await this.dataSource.query<AffectedRowsResult>(
      `INSERT INTO stroke_rehab_plans
         (referral_id, summary, goals_json, frequency, start_date, end_date,
          status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        referralId,
        optionalText(dto.summary, 'summary', 8000),
        JSON.stringify(dto.goals ?? []),
        optionalText(dto.frequency, 'frequency', 80),
        optionalDate(dto.startDate, 'startDate'),
        optionalDate(dto.endDate, 'endDate'),
        oneOf(
          dto.status,
          ['active', 'completed', 'cancelled'],
          'status',
          'active',
        ),
        actor?.id ?? null,
      ],
    );
    await this.audit(
      'stroke_rehab_plan',
      result.insertId,
      'created',
      actor,
      referral.pid,
      { referralId },
    );
    const rows = await this.listRehabPlans(referralId);
    return rows.find((row) => Number(row.id) === result.insertId) ?? rows[0];
  }

  private async findRehabReferral(referralId: number) {
    const rows = await this.dataSource.query<
      Array<{ id: number; pid: number; discipline: string }>
    >(`SELECT id, pid, discipline FROM stroke_rehab_referrals WHERE id = ?`, [
      referralId,
    ]);
    if (!rows.length) {
      throw new NotFoundException(
        `Rehabilitation referral ${referralId} was not found.`,
      );
    }
    return rows[0];
  }

  async listRehabPlans(
    referralId: number,
  ): Promise<Array<Record<string, unknown>>> {
    const rows = await this.dataSource.query<Array<Record<string, unknown>>>(
      `SELECT id, referral_id, summary, goals_json, frequency, status,
              DATE_FORMAT(start_date, '%Y-%m-%d') AS start_date,
              DATE_FORMAT(end_date, '%Y-%m-%d') AS end_date, created_at
         FROM stroke_rehab_plans WHERE referral_id = ?
        ORDER BY created_at DESC`,
      [referralId],
    );
    return rows.map(({ goals_json, ...row }) => ({
      ...row,
      goals: safeJson(goals_json),
    }));
  }

  async addRehabSession(
    referralId: number,
    dto: RehabSessionDto,
    actor?: StrokeActor,
  ) {
    const referral = await this.findRehabReferral(referralId);
    const duration =
      optionalInteger(dto.durationMinutes, 'durationMinutes', 0, 1440) ?? null;
    const result = await this.dataSource.query<AffectedRowsResult>(
      `INSERT INTO stroke_rehab_sessions
         (referral_id, scheduled_at, attended, duration_minutes, notes,
          therapist_name, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        referralId,
        requiredDate(dto.scheduledAt, 'scheduledAt'),
        dto.attended === undefined || dto.attended === null
          ? null
          : dto.attended
            ? 1
            : 0,
        duration,
        optionalText(dto.notes, 'notes', 8000),
        optionalText(dto.therapistName, 'therapistName', 120),
        actor?.id ?? null,
      ],
    );
    await this.audit(
      'stroke_rehab_session',
      result.insertId,
      'scheduled',
      actor,
      referral.pid,
      { referralId },
    );
    const rows = await this.listRehabSessions(referralId);
    return rows.find((row) => Number(row.id) === result.insertId) ?? rows[0];
  }

  async listRehabSessions(referralId: number) {
    return this.dataSource.query<Array<Record<string, unknown>>>(
      `SELECT id, referral_id, attended, duration_minutes, notes,
              therapist_name,
              DATE_FORMAT(scheduled_at, '%Y-%m-%dT%H:%i:%s') AS scheduled_at,
              created_at
         FROM stroke_rehab_sessions WHERE referral_id = ?
        ORDER BY scheduled_at DESC`,
      [referralId],
    );
  }

  /**
   * Clinician-entered functional score. Attendance, session counts and
   * therapist notes never generate or adjust a score.
   */
  async addFunctionalAssessment(
    pid: number,
    dto: FunctionalAssessmentDto,
    actor?: StrokeActor,
  ) {
    const patient = await this.findPatient(pid);
    const instrument = oneOf(dto.instrument, ['mrs', 'barthel'], 'instrument');
    const score = requiredInteger(dto.score, 'score', 0, 100);
    if (instrument === 'mrs' && score > 6) {
      throw new BadRequestException(
        'The modified Rankin Scale score must be between 0 and 6.',
      );
    }
    if (instrument === 'barthel' && score % 5 !== 0) {
      throw new BadRequestException(
        'The Barthel Index score must be a multiple of 5 (0-100).',
      );
    }
    const activationId = optionalInteger(dto.activationId, 'activationId', 1);
    if (activationId !== null) {
      await this.findActivation(activationId);
    }
    const result = await this.dataSource.query<AffectedRowsResult>(
      `INSERT INTO stroke_functional_assessments
         (pid, activation_id, instrument, score, details_json, assessed_at,
          assessed_by_name, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        patient.pid,
        activationId,
        instrument,
        score,
        JSON.stringify(dto.details ?? {}),
        requiredDate(dto.assessedAt, 'assessedAt'),
        optionalText(dto.assessedByName, 'assessedByName', 120),
        optionalText(dto.notes, 'notes', 4000),
        actor?.id ?? null,
      ],
    );
    await this.audit(
      'stroke_functional_assessment',
      result.insertId,
      instrument,
      actor,
      patient.pid,
      { score, activationId },
    );
    const rows = await this.listFunctionalAssessments(patient.pid);
    return rows.find((row) => Number(row.id) === result.insertId) ?? rows[0];
  }

  async listFunctionalAssessments(
    pid: number,
  ): Promise<Array<Record<string, unknown>>> {
    const rows = await this.dataSource.query<Array<Record<string, unknown>>>(
      `SELECT id, pid, activation_id, instrument, score, details_json,
              assessed_by_name, notes,
              DATE_FORMAT(assessed_at, '%Y-%m-%dT%H:%i:%s') AS assessed_at,
              created_at
         FROM stroke_functional_assessments WHERE pid = ?
        ORDER BY assessed_at ASC, id ASC`,
      [pid],
    );
    return rows.map(({ details_json, ...row }) => ({
      ...row,
      details: safeJson(details_json),
    }));
  }

  /** Longitudinal scores in assessment order, never derived from attendance. */
  async getRehabProgress(pid: number) {
    const patient = await this.findPatient(pid);
    const assessments = await this.listFunctionalAssessments(patient.pid);
    const referrals = await this.listRehabReferrals(patient.pid);
    return {
      pid: patient.pid,
      instruments: {
        mrs: {
          label: 'modified Rankin Scale (mRS)',
          range: [0, 6],
          licensing:
            'Clinician-selected instrument; facility must validate use and attribution.',
        },
        barthel: {
          label: 'Barthel Index',
          range: [0, 100],
          licensing:
            'Use subject to applicable licensing and validation by the facility.',
        },
      },
      assessments,
      referrals,
    };
  }

  // ── Module G: outpatient stroke clinic ──────────────────────────────────

  async addClinicVisit(pid: number, dto: ClinicVisitDto, actor?: StrokeActor) {
    const patient = await this.findPatient(pid);
    const activationId = optionalInteger(dto.activationId, 'activationId', 1);
    if (activationId !== null) {
      const activation = await this.findActivation(activationId);
      if (activation.pid !== patient.pid) {
        throw new BadRequestException(
          'The activation does not belong to this patient.',
        );
      }
    }
    const result = await this.dataSource.query<AffectedRowsResult>(
      `INSERT INTO stroke_clinic_visits
         (activation_id, pid, facility_id, visit_at, neurologist_name,
          visit_type, history_review, medication_reconciliation_json,
          risk_factors_json, hba1c, ldl, diabetes_plan, lipid_plan,
          functional_status, patient_education, care_plan,
          next_followup_date, appointment_id, status, created_by,
          created_by_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        activationId,
        patient.pid,
        optionalInteger(dto.facilityId, 'facilityId', 0),
        requiredDate(dto.visitAt, 'visitAt'),
        optionalText(dto.neurologistName, 'neurologistName', 120),
        oneOf(
          dto.visitType,
          ['new_referral', 'follow_up', 'post_discharge', 'annual_review'],
          'visitType',
          'follow_up',
        ),
        optionalText(dto.historyReview, 'historyReview', 8000),
        JSON.stringify(dto.medicationReconciliation ?? []),
        JSON.stringify(dto.riskFactors ?? []),
        optionalDecimal(dto.hba1c, 'hba1c', 0, 30),
        optionalDecimal(dto.ldl, 'ldl', 0, 1000),
        optionalText(dto.diabetesPlan, 'diabetesPlan', 4000),
        optionalText(dto.lipidPlan, 'lipidPlan', 4000),
        optionalText(dto.functionalStatus, 'functionalStatus', 4000),
        optionalText(dto.patientEducation, 'patientEducation', 8000),
        optionalText(dto.carePlan, 'carePlan', 8000),
        optionalDate(dto.nextFollowupDate, 'nextFollowupDate'),
        optionalInteger(dto.appointmentId, 'appointmentId', 0),
        oneOf(
          dto.status,
          ['scheduled', 'completed', 'cancelled'],
          'status',
          'completed',
        ),
        actor?.id ?? null,
        this.actorName(actor),
      ],
    );
    await this.audit(
      'stroke_clinic_visit',
      result.insertId,
      'created',
      actor,
      patient.pid,
      { facilityId: dto.facilityId, appointmentId: dto.appointmentId },
    );
    const rows = await this.listClinicVisits(patient.pid);
    return rows.find((row) => Number(row.id) === result.insertId) ?? rows[0];
  }

  async listClinicVisits(
    pid?: number,
    facilityId?: unknown,
  ): Promise<Array<Record<string, unknown>>> {
    const patientId = optionalInteger(pid, 'pid', 0);
    const facility = optionalInteger(facilityId, 'facilityId', 0);
    const where: string[] = [];
    const params: unknown[] = [];
    if (patientId !== null) {
      where.push('v.pid = ?');
      params.push(patientId);
    }
    if (facility !== null) {
      where.push('v.facility_id = ?');
      params.push(facility);
    }
    const rows = await this.dataSource.query<Array<Record<string, unknown>>>(
      `SELECT v.id, v.activation_id, v.pid, v.facility_id, v.neurologist_name,
              v.visit_type, v.history_review, v.medication_reconciliation_json,
              v.risk_factors_json, v.hba1c, v.ldl, v.diabetes_plan,
              v.lipid_plan, v.functional_status, v.patient_education,
              v.care_plan, v.appointment_id, v.status, v.created_by_name,
              DATE_FORMAT(v.visit_at, '%Y-%m-%dT%H:%i:%s') AS visit_at,
              DATE_FORMAT(v.next_followup_date, '%Y-%m-%d') AS next_followup_date,
              v.created_at, pd.fname, pd.lname
         FROM stroke_clinic_visits v
         JOIN patient_data pd ON pd.pid = v.pid
        ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
        ORDER BY v.visit_at DESC`,
      params,
    );
    return rows.map(
      ({ medication_reconciliation_json, risk_factors_json, ...row }) => ({
        ...row,
        medicationReconciliation: safeJson(medication_reconciliation_json),
        riskFactors: safeJson(risk_factors_json),
      }),
    );
  }

  async addBpReading(pid: number, dto: BpReadingDto, actor?: StrokeActor) {
    const patient = await this.findPatient(pid);
    const systolic = requiredInteger(dto.systolic, 'systolic', 50, 300);
    const diastolic = requiredInteger(dto.diastolic, 'diastolic', 20, 200);
    if (systolic <= diastolic) {
      throw new BadRequestException(
        'Systolic pressure must be greater than diastolic pressure.',
      );
    }
    const result = await this.dataSource.query<AffectedRowsResult>(
      `INSERT INTO stroke_bp_readings
         (pid, visit_id, systolic, diastolic, pulse, measured_at, position,
          notes, recorded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        patient.pid,
        optionalInteger(dto.visitId, 'visitId', 1),
        systolic,
        diastolic,
        optionalInteger(dto.pulse, 'pulse', 20, 300),
        requiredDate(dto.measuredAt, 'measuredAt'),
        optionalText(dto.position, 'position', 30),
        optionalText(dto.notes, 'notes', 255),
        actor?.id ?? null,
      ],
    );
    await this.audit(
      'stroke_bp_reading',
      result.insertId,
      'recorded',
      actor,
      patient.pid,
    );
    const rows = await this.listBpReadings(patient.pid);
    return rows.find((row) => Number(row.id) === result.insertId) ?? rows[0];
  }

  async listBpReadings(pid: number) {
    return this.dataSource.query<Array<Record<string, unknown>>>(
      `SELECT id, pid, visit_id, systolic, diastolic, pulse, position, notes,
              DATE_FORMAT(measured_at, '%Y-%m-%dT%H:%i:%s') AS measured_at
         FROM stroke_bp_readings WHERE pid = ?
        ORDER BY measured_at ASC, id ASC`,
      [pid],
    );
  }

  /** Cross-facility longitudinal clinic view for one patient. */
  async getClinicSummary(pid: number) {
    const patient = await this.findPatient(pid);
    return {
      patient,
      visits: await this.listClinicVisits(patient.pid),
      bpReadings: await this.listBpReadings(patient.pid),
      functionalAssessments: await this.listFunctionalAssessments(patient.pid),
      rehabReferrals: await this.listRehabReferrals(patient.pid),
    };
  }

  // ── Unified patient record, board and quality ───────────────────────────

  /** Everything stroke-related about one patient, in one response. */
  async getPatientRecord(pid: number) {
    await this.assertPatient(pid);
    const patients = await this.dataSource.query<PatientRow[]>(
      `SELECT pid, public_id, fname, lname, mname, DOB, sex, phone_contact
               FROM patient_data WHERE pid = ? LIMIT 1`,
      [pid],
    );
    const [activationResult, followUps, tasks] = await Promise.all([
      this.listActivations({ patientId: pid, limit: 200 }),
      this.listFollowUps(pid),
      this.listTasks(pid),
    ]);
    return {
      patient: patients[0],
      activations: activationResult.activations,
      followUps,
      tasks,
    };
  }

  /** Stroke board summary for a facility (or the whole installation). */
  async getOverview(facilityId?: unknown) {
    const id = optionalInteger(facilityId, 'facilityId', 0);
    const where = id !== null ? 'WHERE facility_id = ?' : '';
    const params = id !== null ? [id] : [];
    const rows = await this.dataSource.query<SummaryRow[]>(
      `SELECT COUNT(*) AS total,
                    SUM(status IN ('active','in_progress')) AS active,
                    SUM(status = 'completed') AS completed,
                    SUM(care_setting = 'acute') AS acute,
                    SUM(care_setting = 'outpatient') AS outpatient,
                    SUM(care_setting = 'comprehensive') AS comprehensive,
                    SUM(tpa_status = 'given') AS thrombolysis_given,
                    SUM(thrombectomy_status = 'given') AS thrombectomy_given
               FROM stroke_activations ${where}`,
      params,
    );
    const summary = rows[0] ?? {};
    const recent = await this.listActivations({
      facilityId: id,
      limit: 25,
    });
    return {
      facilityId: id,
      summary: {
        total: Number(summary.total) || 0,
        active: Number(summary.active) || 0,
        completed: Number(summary.completed) || 0,
        acute: Number(summary.acute) || 0,
        outpatient: Number(summary.outpatient) || 0,
        comprehensive: Number(summary.comprehensive) || 0,
        thrombolysisGiven: Number(summary.thrombolysis_given) || 0,
        thrombectomyGiven: Number(summary.thrombectomy_given) || 0,
      },
      active: recent.activations.filter((a) =>
        ['active', 'in_progress'].includes(a.status),
      ),
      recent: recent.activations,
    };
  }

  /**
   * Quality metrics against the versioned timing targets.
   *
   * Percentages are null when the denominator is zero — a facility that has
   * not treated anyone has no door-to-needle performance, not 0 %.
   */
  async getQuality(days?: unknown, facilityId?: unknown) {
    const window = Math.min(optionalInteger(days, 'days', 1, 3650) ?? 30, 3650);
    const id = optionalInteger(facilityId, 'facilityId', 0);
    const facilityClause = id !== null ? 'AND facility_id = ?' : '';
    const params: unknown[] = [
      STROKE_TIMING_TARGETS.doorToImagingMinutes,
      STROKE_TIMING_TARGETS.doorToNeedleMinutes,
    ];
    if (id !== null) params.push(id);

    const rows = await this.dataSource.query<QualityRow[]>(
      `SELECT COUNT(*) AS activations,
                    SUM(status = 'completed') AS completed,
                    SUM(tpa_status = 'given') AS thrombolysis_given,
                    SUM(thrombectomy_status = 'given') AS thrombectomy_given,
                    AVG(CASE WHEN ct_performed_at IS NOT NULL
                             THEN TIMESTAMPDIFF(MINUTE, arrival_at, ct_performed_at) END)
                        AS avg_door_to_ct_minutes,
                    AVG(CASE WHEN tpa_given_at IS NOT NULL
                             THEN TIMESTAMPDIFF(MINUTE, arrival_at, tpa_given_at) END)
                        AS avg_door_to_needle_minutes,
                    SUM(CASE WHEN ct_performed_at IS NOT NULL
                                  AND TIMESTAMPDIFF(MINUTE, arrival_at, ct_performed_at) <= ?
                             THEN 1 ELSE 0 END) AS ct_within_target,
                    SUM(CASE WHEN tpa_given_at IS NOT NULL
                                  AND TIMESTAMPDIFF(MINUTE, arrival_at, tpa_given_at) <= ?
                             THEN 1 ELSE 0 END) AS needle_within_target
               FROM stroke_activations
              WHERE arrival_at >= DATE_SUB(NOW(), INTERVAL ${window} DAY)
              ${facilityClause}`,
      params,
    );
    const row = rows[0] ?? {};
    const total = Number(row.activations) || 0;
    const withCt = Number(row.ct_within_target) || 0;
    const withNeedle = Number(row.needle_within_target) || 0;
    const tpa = Number(row.thrombolysis_given) || 0;
    return {
      windowDays: window,
      facilityId: id,
      targets: STROKE_TIMING_TARGETS,
      activations: total,
      completed: Number(row.completed) || 0,
      thrombolysisGiven: tpa,
      thrombectomyGiven: Number(row.thrombectomy_given) || 0,
      averageDoorToCtMinutes:
        row.avg_door_to_ct_minutes === null
          ? null
          : Number(row.avg_door_to_ct_minutes),
      averageDoorToNeedleMinutes:
        row.avg_door_to_needle_minutes === null
          ? null
          : Number(row.avg_door_to_needle_minutes),
      ctWithinTarget: withCt,
      ctWithinTargetPercent: total ? Math.round((withCt / total) * 100) : null,
      needleWithinTarget: withNeedle,
      needleWithinTargetPercent: tpa
        ? Math.round((withNeedle / tpa) * 100)
        : null,
    };
  }

  // ── HL7 FHIR R4 export ──────────────────────────────────────────────────

  /**
   * Export the activation as a FHIR R4 collection Bundle so it can be shared
   * with a registry or another system. Only resources the record actually
   * supports are emitted; no derived diagnosis or procedure is invented.
   */
  async toFhirBundle(activationId: number) {
    const record = await this.getActivation(activationId);
    const a = record.activation;
    const patientRef = `Patient/${a.pid}`;
    const encoded =
      STROKE_CONDITION_CODES[a.stroke_type] ??
      STROKE_CONDITION_CODES.not_documented;
    const encounterStatus =
      a.status === 'completed'
        ? 'finished'
        : a.status === 'cancelled'
          ? 'cancelled'
          : 'in-progress';
    const encounterClass =
      a.care_setting === 'outpatient'
        ? {
            system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
            code: 'AMB',
            display: 'ambulatory',
          }
        : a.care_setting === 'comprehensive'
          ? {
              system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
              code: 'IMP',
              display: 'inpatient encounter',
            }
          : {
              system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
              code: 'EMER',
              display: 'emergency',
            };

    const coding = {
      system: 'http://hl7.org/fhir/sid/icd-10',
      code: encoded.code,
      display: encoded.display,
    };

    const entries: NonNullable<FhirBundle['entry']> = [
      {
        fullUrl: `urn:uuid:patient-${a.pid}`,
        resource: {
          resourceType: 'Patient',
          id: String(a.pid),
          name: [
            {
              family: a.lname,
              given: [a.fname, a.mname].filter(Boolean),
            },
          ],
          gender: fhirGender(a.sex),
          birthDate: a.DOB ? String(a.DOB).slice(0, 10) : undefined,
        },
      },
      {
        fullUrl: `urn:uuid:condition-${a.id}`,
        resource: {
          resourceType: 'Condition',
          id: `stroke-condition-${a.id}`,
          clinicalStatus: {
            coding: [
              {
                system:
                  'http://terminology.hl7.org/CodeSystem/condition-clinical',
                code: a.status === 'completed' ? 'resolved' : 'active',
              },
            ],
          },
          verificationStatus: {
            coding: [
              {
                system:
                  'http://terminology.hl7.org/CodeSystem/condition-ver-status',
                code:
                  a.stroke_type === 'not_documented'
                    ? 'unconfirmed'
                    : 'confirmed',
              },
            ],
          },
          code: { coding: [coding] },
          subject: { reference: patientRef },
          onsetDateTime: a.lkw_at || a.arrival_at,
          recordedDate: a.created_at,
        },
      },
      {
        fullUrl: `urn:uuid:encounter-${a.id}`,
        resource: {
          resourceType: 'Encounter',
          id: `stroke-encounter-${a.id}`,
          identifier: [
            {
              system: 'urn:openrx:stroke-activation',
              value: a.activation_code,
            },
          ],
          status: encounterStatus,
          class: encounterClass,
          subject: { reference: patientRef },
          period: {
            start: a.arrival_at,
            end: a.disposition_at ?? undefined,
          },
          reasonCode: [{ coding: [coding] }],
        },
      },
    ];
    return this.buildFhirBundle(record, entries);
  }

  /**
   * FHIR R4 export for one NIHSS assessment.
   *
   * Uses the verified LOINC panel 70182-1, the 15 item codes and total 72089-6.
   * Untestable items are exported with a data-absent-reason, never value 0.
   */
  async toAssessmentFhirBundle(assessmentId: number) {
    const assessment = await this.getAssessment(assessmentId);
    const items = (assessment.items ?? {}) as Record<string, number>;
    const untestable = (assessment.untestable ?? {}) as Record<string, unknown>;
    const observationStatus =
      assessment.status === 'finalized' ? 'final' : 'preliminary';
    const patientRef = `Patient/${assessment.pid}`;
    const encounterRef = `Encounter/stroke-encounter-${assessment.activation_id}`;
    const meta = {
      tag: [
        {
          system: 'urn:openrx:stroke-protocol',
          code: assessment.protocol_version,
          display: assessment.protocol_key,
        },
      ],
    };
    const itemRefs: string[] = [];
    const entries: NonNullable<FhirBundle['entry']> = [];

    for (const item of NIHSS_ITEMS) {
      const loinc =
        NIHSS_LOINC.items[item.key as keyof typeof NIHSS_LOINC.items];
      const fullUrl = `urn:uuid:nihss-${assessment.id}-${item.key}`;
      itemRefs.push(fullUrl);
      const scored = items[item.key];
      const reason = untestable[item.key];
      const absentText =
        typeof reason === 'string' && reason.trim()
          ? reason.trim()
          : 'Untestable';
      entries.push({
        fullUrl,
        resource: {
          resourceType: 'Observation',
          id: `stroke-nihss-${assessment.id}-${item.key}`,
          status: observationStatus,
          category: [
            {
              coding: [
                {
                  system:
                    'http://terminology.hl7.org/CodeSystem/observation-category',
                  code: 'survey',
                },
              ],
            },
          ],
          code: {
            coding: [
              {
                system: NIHSS_LOINC.panel.system,
                code: loinc.code,
                display: loinc.display,
              },
            ],
          },
          subject: { reference: patientRef },
          encounter: { reference: encounterRef },
          effectiveDateTime: assessment.assessed_at,
          ...(scored === undefined
            ? {
                dataAbsentReason: {
                  coding: [
                    {
                      system:
                        'http://terminology.hl7.org/CodeSystem/data-absent-reason',
                      code: 'not-performed',
                      display: 'Not performed',
                    },
                  ],
                  text: absentText,
                },
              }
            : {
                valueQuantity: {
                  value: scored,
                  unit: 'score',
                  system: 'http://unitsofmeasure.org',
                  code: '{score}',
                },
              }),
          meta,
        },
      });
    }

    entries.unshift({
      fullUrl: `urn:uuid:nihss-panel-${assessment.id}`,
      resource: {
        resourceType: 'Observation',
        id: `stroke-nihss-panel-${assessment.id}`,
        status: observationStatus,
        category: [
          {
            coding: [
              {
                system:
                  'http://terminology.hl7.org/CodeSystem/observation-category',
                code: 'survey',
              },
            ],
          },
        ],
        code: {
          coding: [
            {
              system: NIHSS_LOINC.panel.system,
              code: NIHSS_LOINC.panel.code,
              display: NIHSS_LOINC.panel.display,
            },
          ],
        },
        subject: { reference: patientRef },
        encounter: { reference: encounterRef },
        effectiveDateTime: assessment.assessed_at,
        hasMember: itemRefs.map((reference) => ({ reference })),
        meta,
      },
    });

    const untestableKeys = Object.keys(untestable).filter(
      (key) => untestable[key],
    );
    entries.push({
      fullUrl: `urn:uuid:nihss-total-${assessment.id}`,
      resource: {
        resourceType: 'Observation',
        id: `stroke-nihss-total-${assessment.id}`,
        status: observationStatus,
        category: [
          {
            coding: [
              {
                system:
                  'http://terminology.hl7.org/CodeSystem/observation-category',
                code: 'survey',
              },
            ],
          },
        ],
        code: {
          coding: [
            {
              system: NIHSS_LOINC.total.system,
              code: NIHSS_LOINC.total.code,
              display: NIHSS_LOINC.total.display,
            },
          ],
        },
        subject: { reference: patientRef },
        encounter: { reference: encounterRef },
        effectiveDateTime: assessment.assessed_at,
        valueQuantity: {
          value: assessment.total_score,
          unit: 'score',
          system: 'http://unitsofmeasure.org',
          code: '{score}',
        },
        note:
          untestableKeys.length > 0
            ? [
                {
                  text: `Partial total: ${untestableKeys.length} item(s) untestable (${untestableKeys.join(
                    ', ',
                  )}); untestable items are not scored as zero.`,
                },
              ]
            : undefined,
        meta,
      },
    });

    const targetReferences = entries
      .map((entry) => entry.fullUrl)
      .filter((url): url is string => Boolean(url));
    entries.push({
      fullUrl: `urn:uuid:provenance-nihss-${assessment.id}`,
      resource: {
        resourceType: 'Provenance',
        id: `provenance-nihss-${assessment.id}`,
        meta,
        target: targetReferences.map((reference) => ({ reference })),
        recorded: assessment.finalized_at ?? assessment.assessed_at,
        activity: {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/v3-DataOperation',
              code: 'CREATE',
              display: 'create',
            },
          ],
        },
        agent: [
          {
            type: {
              coding: [
                {
                  system:
                    'http://terminology.hl7.org/CodeSystem/v3-ParticipationType',
                  code: 'AUT',
                  display: 'author',
                },
              ],
            },
            who: {
              display:
                assessment.finalized_by_name ??
                assessment.assessed_by_name ??
                'OpenRx Stroke Care',
            },
          },
        ],
      },
    });
    return applyFhirProfiles({
      resourceType: 'Bundle',
      type: 'collection',
      timestamp: new Date().toISOString(),
      identifier: {
        system: 'urn:openrx:stroke-assessment',
        value: String(assessment.id),
      },
      meta: {
        tag: [
          {
            system: 'urn:openrx:stroke-protocol',
            code: assessment.protocol_version,
            display: assessment.protocol_key,
          },
          {
            system: 'urn:openrx:fhir-version',
            code: STROKE_FHIR_VERSION,
          },
        ],
      },
      entry: entries,
    });
  }

  /** Validate the comprehensive R4 bundle without asserting HL7 conformance. */
  async validateActivationFhir(activationId: number, actor?: StrokeActor) {
    const bundle = await this.toFhirBundle(activationId);
    const result = validateFhirBundle(bundle);
    await this.audit(
      'stroke_activation',
      activationId,
      'fhir_validated',
      actor,
      (await this.findActivation(activationId)).pid,
      {
        fhirVersion: result.fhirVersion,
        valid: result.valid,
        errors: result.errors.length,
        warnings: result.warnings.length,
      },
    );
    return result;
  }

  /** Validate one NIHSS assessment export. */
  async validateAssessmentFhir(assessmentId: number, actor?: StrokeActor) {
    const bundle = await this.toAssessmentFhirBundle(assessmentId);
    const result = validateFhirBundle(bundle);
    const assessment = await this.getAssessment(assessmentId);
    await this.audit(
      'stroke_assessment',
      assessmentId,
      'fhir_validated',
      actor,
      assessment.pid,
      {
        fhirVersion: result.fhirVersion,
        valid: result.valid,
        errors: result.errors.length,
        warnings: result.warnings.length,
      },
    );
    return result;
  }

  private async buildFhirBundle(
    record: ActivationRecord,
    entries: NonNullable<FhirBundle['entry']>,
  ) {
    const a = record.activation;
    const patientRef = `Patient/${a.pid}`;
    const encounterRef = `Encounter/stroke-encounter-${a.id}`;
    const meta = {
      tag: [
        {
          system: 'urn:openrx:stroke-protocol',
          code: ACUTE_ISCHEMIC_STROKE_PROTOCOL.version,
          display: ACUTE_ISCHEMIC_STROKE_PROTOCOL.key,
        },
      ],
    };
    const push = (
      type: string,
      id: string,
      resource: Omit<FhirResource, 'resourceType' | 'id'>,
    ) => {
      entries.push({
        fullUrl: `urn:uuid:${type.toLowerCase()}-${id}`,
        resource: {
          resourceType: type,
          id: `${type.toLowerCase()}-${id}`,
          ...resource,
          meta,
        },
      });
    };
    const latest = record.assessments?.find(
      (item) => item.status === 'finalized',
    );
    if (latest) {
      entries.push({
        fullUrl: `urn:uuid:nihss-${latest.id}`,
        resource: {
          resourceType: 'Observation',
          id: `stroke-nihss-${latest.id}`,
          status: 'final',
          category: [
            {
              coding: [
                {
                  system:
                    'http://terminology.hl7.org/CodeSystem/observation-category',
                  code: 'survey',
                },
              ],
            },
          ],
          code: {
            coding: [
              {
                system: NIHSS_LOINC.total.system,
                code: NIHSS_LOINC.total.code,
                display: NIHSS_LOINC.total.display,
              },
            ],
          },
          subject: { reference: `Patient/${a.pid}` },
          encounter: {
            reference: `Encounter/stroke-encounter-${a.id}`,
          },
          effectiveDateTime: latest.assessed_at,
          valueQuantity: {
            value: latest.total_score,
            unit: 'score',
            system: 'http://unitsofmeasure.org',
            code: '{score}',
          },
          note: latest.notes ? [{ text: latest.notes }] : undefined,
          meta: {
            tag: [
              {
                system: 'urn:openrx:stroke-protocol',
                code: latest.protocol_version,
                display: latest.protocol_key,
              },
            ],
          },
        },
      });
    }
    const [treatmentEvents, carePlans, reports] = await Promise.all([
      this.listTreatmentEvents(a.id),
      this.listCarePlans(a.id),
      this.dataSource.query<
        Array<{
          id: number;
          stroke_imaging_id: number | null;
          report_text: string | null;
          impression: string | null;
          status: string;
          reported_by_name: string | null;
          reported_at: string;
        }>
      >(
        `SELECT id, stroke_imaging_id, report_text, impression, status,
                reported_by_name,
                DATE_FORMAT(reported_at, '%Y-%m-%dT%H:%i:%s') AS reported_at
           FROM stroke_radiology_reports WHERE activation_id = ?
          ORDER BY reported_at DESC, id DESC`,
        [a.id],
      ),
    ]);

    for (const study of record.imaging) {
      push('ImagingStudy', String(study.id), {
        status:
          study.interpretation_status === 'ordered'
            ? 'registered'
            : 'available',
        subject: { reference: patientRef },
        encounter: { reference: encounterRef },
        identifier: [
          study.dicom_study_uid
            ? {
                system: 'urn:dicom:uid',
                value: `urn:oid:${study.dicom_study_uid.replace(/^urn:oid:/, '')}`,
              }
            : { system: 'urn:openrx:stroke-imaging', value: String(study.id) },
          ...(study.accession_number
            ? [
                {
                  system: 'urn:openrx:accession',
                  value: study.accession_number,
                },
              ]
            : []),
        ],
        modality: [
          {
            system: 'http://dicom.nema.org/resources/ontology/DCM',
            code: fhirDicomModality(study.modality),
            display: study.modality.toUpperCase(),
          },
        ],
        numberOfSeries: study.series_count ?? undefined,
        numberOfInstances: study.instance_count ?? undefined,
        started: study.performed_at ?? study.study_date ?? undefined,
        description: study.study_description ?? undefined,
        note: study.findings ? [{ text: study.findings }] : undefined,
      });
    }

    for (const report of reports) {
      const reportStatus =
        report.status === 'preliminary'
          ? 'preliminary'
          : report.status === 'amended'
            ? 'amended'
            : report.status === 'addendum'
              ? 'appended'
              : 'final';
      const imagingStudy = record.imaging.find(
        (study) => study.id === report.stroke_imaging_id,
      );
      push('DiagnosticReport', String(report.id), {
        status: reportStatus,
        subject: { reference: patientRef },
        encounter: { reference: encounterRef },
        code: {
          coding: [
            {
              system: 'http://loinc.org',
              code: '18748-4',
              display: 'Diagnostic imaging report',
            },
          ],
        },
        effectiveDateTime: report.reported_at,
        issued: report.reported_at,
        conclusion: report.impression ?? undefined,
        performer: report.reported_by_name
          ? [{ display: report.reported_by_name }]
          : undefined,
        imagingStudy: imagingStudy
          ? [{ reference: `ImagingStudy/imagingstudy-${imagingStudy.id}` }]
          : undefined,
      });
      if (report.report_text) {
        push('DocumentReference', `radiology-${report.id}`, {
          status: 'current',
          type: {
            coding: [
              {
                system: 'http://loinc.org',
                code: '18748-4',
                display: 'Diagnostic imaging report',
              },
            ],
          },
          subject: { reference: patientRef },
          date: report.reported_at,
          context: { encounter: [{ reference: encounterRef }] },
          description: report.impression ?? 'Radiology report',
          author: report.reported_by_name
            ? [{ display: report.reported_by_name }]
            : undefined,
          content: [
            {
              attachment: {
                contentType: 'text/plain',
                data: Buffer.from(report.report_text, 'utf8').toString(
                  'base64',
                ),
                title: `Radiology report ${report.id}`,
              },
            },
          ],
        });
      }
    }

    for (const event of treatmentEvents) {
      const eventStatus =
        event.status === 'given'
          ? 'completed'
          : event.status === 'pending'
            ? 'in-progress'
            : 'not-done';
      push('Procedure', String(event.id), {
        status: eventStatus,
        subject: { reference: patientRef },
        encounter: { reference: encounterRef },
        code: {
          text: `Stroke treatment: ${event.event_type.replace(/_/g, ' ')}`,
        },
        performedDateTime: event.occurred_at ?? undefined,
        performer: event.specialist_name
          ? [{ display: event.specialist_name }]
          : undefined,
        note: event.details ? [{ text: event.details }] : undefined,
      });
      if (event.medication) {
        push('MedicationRequest', String(event.id), {
          status:
            event.status === 'given'
              ? 'completed'
              : event.status === 'pending'
                ? 'active'
                : 'cancelled',
          intent: 'order',
          subject: { reference: patientRef },
          encounter: { reference: encounterRef },
          authoredOn: event.occurred_at ?? event.created_at,
          medicationCodeableConcept: { text: event.medication },
          dosageInstruction: [
            {
              text:
                [event.dose, event.route].filter(Boolean).join(' · ') ||
                undefined,
              timing: { code: { text: event.time_quality ?? undefined } },
            },
          ],
          statusReasonCodeableConcept:
            event.status === 'given'
              ? undefined
              : { text: `Documented as ${event.status.replace(/_/g, ' ')}` },
          requester: event.recorded_by_name
            ? { display: event.recorded_by_name }
            : undefined,
        });
      }
    }

    for (const order of record.orders) {
      push('ServiceRequest', String(order.id), {
        status: order.status === 'completed' ? 'completed' : 'active',
        intent: 'order',
        subject: { reference: patientRef },
        encounter: { reference: encounterRef },
        code: { text: order.order_set_label },
        authoredOn: order.acknowledged_at,
        requester: order.ordered_by_name
          ? { display: order.ordered_by_name }
          : undefined,
        note: order.notes ? [{ text: order.notes }] : undefined,
      });
    }

    for (const [index, plan] of carePlans.entries()) {
      const planStatus = ['active', 'completed', 'cancelled'].includes(
        String(plan.status),
      )
        ? String(plan.status)
        : 'active';
      const goals = Array.isArray(plan.goals) ? plan.goals : [];
      push('CarePlan', `${String(plan.id)}-${index}`, {
        status: planStatus,
        intent: 'plan',
        title:
          typeof plan.plan_type === 'string'
            ? plan.plan_type
            : 'Stroke care plan',
        description:
          typeof plan.summary === 'string' ? plan.summary : undefined,
        subject: { reference: patientRef },
        encounter: { reference: encounterRef },
        created:
          typeof plan.created_at === 'string' ? plan.created_at : undefined,
        goal: goals.map((goal) => ({
          description: { text: String(goal) },
          status: planStatus === 'completed' ? 'completed' : 'in-progress',
        })),
      });
    }

    for (const transfer of record.transfers) {
      push('ServiceRequest', `transfer-${transfer.id}`, {
        status:
          transfer.status === 'cancelled'
            ? 'revoked'
            : transfer.status === 'arrived'
              ? 'completed'
              : 'active',
        intent: 'order',
        priority:
          transfer.priority === 'emergent'
            ? 'stat'
            : transfer.priority === 'urgent'
              ? 'urgent'
              : 'routine',
        subject: { reference: patientRef },
        encounter: { reference: encounterRef },
        code: { text: 'Inter-facility stroke transfer' },
        authoredOn: transfer.created_at,
        reasonCode: transfer.reason ? [{ text: transfer.reason }] : undefined,
        note: transfer.clinical_summary
          ? [{ text: transfer.clinical_summary }]
          : undefined,
      });
    }

    const targetReferences = entries
      .map((entry) => entry.fullUrl)
      .filter((url): url is string => Boolean(url));
    entries.push({
      fullUrl: `urn:uuid:provenance-stroke-${a.id}`,
      resource: {
        resourceType: 'Provenance',
        id: `provenance-stroke-${a.id}`,
        meta,
        target: targetReferences.map((reference) => ({ reference })),
        recorded: new Date().toISOString(),
        activity: {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/v3-DataOperation',
              code: 'CREATE',
              display: 'create',
            },
          ],
        },
        agent: [
          {
            type: {
              coding: [
                {
                  system:
                    'http://terminology.hl7.org/CodeSystem/v3-ParticipationType',
                  code: 'AUT',
                  display: 'author',
                },
              ],
            },
            who: { display: 'OpenRx Stroke Care' },
          },
        ],
        reason: [
          {
            text: `Generated from stroke activation ${a.activation_code} for interoperability export.`,
          },
        ],
      },
    });

    const bundle: FhirBundle = {
      resourceType: 'Bundle',
      type: 'collection',
      timestamp: new Date().toISOString(),
      meta: {
        tag: [
          {
            system: 'urn:openrx:stroke-protocol',
            code: ACUTE_ISCHEMIC_STROKE_PROTOCOL.version,
            display: ACUTE_ISCHEMIC_STROKE_PROTOCOL.key,
          },
          {
            system: 'urn:openrx:fhir-version',
            code: STROKE_FHIR_VERSION,
            display: `FHIR R4 ${STROKE_FHIR_VERSION}`,
          },
        ],
      },
      entry: entries,
    };
    return applyFhirProfiles(bundle);
  }
}

/** ICD-10 codes used only to label the stroke type that was documented. */
const STROKE_CONDITION_CODES: Record<
  string,
  { code: string; display: string }
> = {
  ischemic: { code: 'I63.9', display: 'Cerebral infarction, unspecified' },
  hemorrhagic: {
    code: 'I61.9',
    display: 'Intracerebral haemorrhage, unspecified',
  },
  tia: {
    code: 'G45.9',
    display: 'Transient cerebral ischaemic attack, unspecified',
  },
  undetermined: {
    code: 'I64',
    display: 'Stroke, not specified as haemorrhage or infarction',
  },
  not_documented: {
    code: 'R29.7',
    display: 'National Institutes of Health Stroke Scale score',
  },
};

function fhirGender(sex: unknown): string | undefined {
  const value = (typeof sex === 'string' ? sex : '').toLowerCase();
  if (value.startsWith('m')) return 'male';
  if (value.startsWith('f')) return 'female';
  if (value === '' || value === 'unknown') return 'unknown';
  return 'other';
}

/** Map the stroke module's modality labels to DICOM modality codes. */
function fhirDicomModality(modality: string): string {
  switch (modality.toLowerCase()) {
    case 'cta':
    case 'ctp':
      return 'CT';
    case 'mri':
    case 'mra':
      return 'MR';
    case 'angiography':
      return 'XA';
    case 'ct':
    default:
      return modality.toUpperCase();
  }
}

/** Parse a JSON column that may already have been decoded by the driver. */
function safeJson(value: unknown): unknown {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

/** Parse a JSON array of strings, ignoring anything else. */
function parseStringArray(value: unknown): string[] {
  const parsed = safeJson(value);
  return Array.isArray(parsed)
    ? parsed.filter((item): item is string => typeof item === 'string')
    : [];
}
