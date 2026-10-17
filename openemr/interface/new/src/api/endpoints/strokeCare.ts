import nestClient from '../nest-client';

/**
 * OpenRx Stroke Care API.
 *
 * Clinical rules stay on the server: this module only transports the values the
 * clinician documents, and never decides eligibility. The `/protocols` payload
 * is the single source for NIHSS items and order sets in the UI.
 */

export type CareSetting = 'outpatient' | 'acute' | 'comprehensive';

export type StrokeType =
  | 'ischemic'
  | 'hemorrhagic'
  | 'undetermined'
  | 'tia'
  | 'not_documented';

export interface NihssOption {
  value: number;
  label: string;
}

export interface NihssItemDef {
  key: string;
  label: string;
  max: number;
  guidance: string;
  options: NihssOption[];
}

export interface ProtocolDescriptor {
  key: string;
  version: string;
  effectiveDate: string;
  label: string;
  source: string;
  advisoryOnly: true;
}

export interface OrderSetItem {
  key: string;
  label: string;
  category: string;
  detail: string;
  requiresExplicitDoseConfirmation?: boolean;
}

export interface StrokeOrderSet {
  key: string;
  label: string;
  protocol: ProtocolDescriptor;
  description: string;
  items: OrderSetItem[];
}

export interface StrokeModule {
  key: string;
  label: string;
  description: string;
  settings: CareSetting[];
  enabled?: boolean;
}

export interface NihssLoinc {
  panel: { code: string; display: string; system: string };
  total: { code: string; display: string; system: string };
  items: Record<string, { code: string; display: string }>;
}

export interface ProtocolCatalogue {
  nihss: {
    protocol: ProtocolDescriptor;
    items: NihssItemDef[];
    loinc: NihssLoinc;
    untestableKeys: string[];
  };
  acute: {
    protocol: ProtocolDescriptor;
    timingTargets: {
      doorToImagingMinutes: number;
      doorToNeedleMinutes: number;
      thrombolysisWindowMinutes: number;
      thrombectomyWindowMinutes: number;
    };
    orderSets: StrokeOrderSet[];
  };
  followUp: { protocol: ProtocolDescriptor };
  modules: StrokeModule[];
}

export interface StrokeActivationRow {
  id: number;
  pid: number;
  encounter_id: number | null;
  facility_id: number;
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
  minutes_since_arrival?: number | null;
  door_to_ct_minutes?: number | null;
  door_to_needle_minutes?: number | null;
  fname: string;
  lname: string;
  mname?: string | null;
  DOB?: string | null;
  sex?: string | null;
}

export interface StrokeCriterion {
  key: string;
  label: string;
  status: 'met' | 'not_met' | 'unknown';
  detail: string;
  requiresClinicianReview: boolean;
}

export interface TreatmentCriteria {
  protocol: ProtocolDescriptor;
  minutesFromLastKnownWell: number | null;
  thrombolysis: {
    windowMinutes: number;
    withinWindow: boolean | null;
    criteria: StrokeCriterion[];
    unmetOrUnknown: number;
  };
  thrombectomy: {
    windowMinutes: number;
    withinWindow: boolean | null;
    criteria: StrokeCriterion[];
    unmetOrUnknown: number;
  };
  clinicianReviewRequired: true;
  advisoryOnly: true;
}

export interface StrokeAssessment {
  id: number;
  activation_id: number;
  pid: number;
  scale: string;
  items: Record<string, number>;
  untestable: Record<string, string>;
  total_score: number;
  severity: string;
  status: 'draft' | 'finalized';
  version: number;
  amends_id: number | null;
  amendment_reason: string | null;
  assessed_at: string;
  assessed_by_name: string | null;
  signed_by_name: string;
  signed_at: string;
  finalized_at: string | null;
  finalized_by_name: string | null;
  notes: string | null;
  protocol_key: string;
  protocol_version: string;
}

export interface NihssTrendPoint {
  id: number;
  activation_id: number;
  total_score: number;
  severity: string;
  version: number;
  amends_id: number | null;
  assessed_at: string;
  finalized_by_name: string | null;
  protocol_version: string;
}

export interface EncounterProfile {
  id: number;
  activation_id: number;
  symptom_discovered_at: string | null;
  initial_neuro_findings: string | null;
  riskFactors: string[];
  priorStrokeTia: boolean | null;
  prior_stroke_details: string | null;
  relevant_history: string | null;
  attending_provider_id: number | null;
  attending_provider_name: string | null;
  facility_department: string | null;
  updated_at: string | null;
}

export interface EncounterContext {
  activation: {
    id: number;
    pid: number;
    encounterId: number | null;
    facilityId: number | null;
    careSetting: CareSetting;
    status: string;
    arrivalAt: string;
    lkwAt: string | null;
    strokeType: StrokeType;
    codeStrokeLevel: string | null;
    attendingProviderId: number | null;
    attendingProviderName: string | null;
    department: string | null;
  };
  profile: EncounterProfile | null;
  allergies: Array<{
    id: number;
    title: string;
    reaction: string | null;
    severity_al: string | null;
    begdate: string | null;
  }>;
  activeMedications: Array<{
    id: number;
    drug: string | null;
    dosage: string | null;
    route: string | null;
    start_date: string | null;
  }>;
  priorStrokeEncounters: Array<{
    id: number;
    activation_code: string;
    care_setting: string;
    status: string;
    stroke_type: string;
    nihss_total: number | null;
    nihss_severity: string | null;
    arrival_at: string;
  }>;
}

export interface EncounterProfileInput {
  symptomDiscoveredAt?: string | null;
  initialNeuroFindings?: string | null;
  riskFactors?: string[];
  priorStrokeTia?: boolean | null;
  priorStrokeDetails?: string | null;
  relevantHistory?: string | null;
  attendingProviderId?: number | null;
  attendingProviderName?: string | null;
  facilityDepartment?: string | null;
  encounterStatus?: string;
}

export interface StrokeOrder {
  id: number;
  order_set_key: string;
  order_set_label: string;
  protocol_key: string;
  protocol_version: string;
  status: string;
  clinician_acknowledged: number;
  contraindications_reviewed: number;
  ordered_by_name: string | null;
  acknowledged_at: string;
  notes: string | null;
  items: OrderSetItem[];
}

export interface StrokeDecision {
  id: number;
  decision_type: 'thrombolysis' | 'thrombectomy';
  decision: 'given' | 'withheld' | 'not_indicated' | 'pending';
  reason: string | null;
  decided_by_name: string | null;
  decided_at: string;
  criteria: TreatmentCriteria;
}

export interface StrokeImagingLink {
  id: number;
  imaging_id: number | null;
  modality: string;
  dicom_study_uid: string | null;
  orthanc_study_id: string | null;
  performed_at: string | null;
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

export interface StrokeTransfer {
  id: number;
  from_facility_id: number | null;
  to_facility_id: number;
  reason: string | null;
  status: string;
  accepted_by_name: string | null;
  transferred_at: string | null;
  created_at: string;
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
}

export interface StrokeTask {
  id: number;
  discipline: string;
  task: string;
  status: string;
  due_at: string | null;
  completed_at: string | null;
  assigned_to: number | null;
  completed_by_name: string | null;
}

export interface StrokeAuditEvent {
  id: number;
  entity_type: string;
  entity_id: number;
  action: string;
  actor_name: string | null;
  detail_json: string | null;
  created_at: string;
}

export interface StrokeFollowUp {
  id: number;
  pid: number;
  activation_id: number | null;
  due_date: string;
  visit_type: string;
  status: string;
  notes: string | null;
  completed_at: string | null;
  completed_by_name: string | null;
}

export interface StrokeActivationDetail {
  activation: StrokeActivationRow & Record<string, unknown>;
  assessments: StrokeAssessment[];
  orders: StrokeOrder[];
  decisions: StrokeDecision[];
  imaging: StrokeImagingLink[];
  transfers: StrokeTransfer[];
  tasks: StrokeTask[];
  criteria: TreatmentCriteria;
}

export interface StrokeOverview {
  facilityId: number | null;
  summary: {
    total: number;
    active: number;
    completed: number;
    acute: number;
    outpatient: number;
    comprehensive: number;
    thrombolysisGiven: number;
    thrombectomyGiven: number;
  };
  active: StrokeActivationRow[];
  recent: StrokeActivationRow[];
}

export interface StrokeQuality {
  windowDays: number;
  facilityId: number | null;
  targets: ProtocolCatalogue['acute']['timingTargets'];
  activations: number;
  completed: number;
  thrombolysisGiven: number;
  thrombectomyGiven: number;
  averageDoorToCtMinutes: number | null;
  averageDoorToNeedleMinutes: number | null;
  ctWithinTarget: number;
  ctWithinTargetPercent: number | null;
  needleWithinTarget: number;
  needleWithinTargetPercent: number | null;
}

export interface CreateActivationInput {
  patientId: number | string;
  careSetting: CareSetting;
  arrivalAt: string;
  lkwAt?: string | null;
  strokeType: StrokeType;
  laterality?: string | null;
  codeStrokeLevel?: string | null;
}

export interface AssessmentInput {
  items: Record<string, number>;
  untestable?: Record<string, string>;
  assessedAt?: string;
  notes?: string | null;
  signedByName?: string;
  signatureConfirmed?: boolean;
  finalize?: boolean;
}

export interface FinalizeAssessmentInput {
  assessedAt?: string;
  notes?: string | null;
  signedByName: string;
  signatureConfirmed: boolean;
}

export interface AmendAssessmentInput {
  items: Record<string, number>;
  untestable?: Record<string, string>;
  amendmentReason: string;
  assessedAt?: string;
  notes?: string | null;
  signedByName: string;
  signatureConfirmed: boolean;
}

export interface DecisionInput {
  decisionType: 'thrombolysis' | 'thrombectomy';
  decision: 'given' | 'withheld' | 'not_indicated' | 'pending';
  reason?: string | null;
  systolicBloodPressure?: number | null;
  diastolicBloodPressure?: number | null;
  glucose?: number | null;
  plateletCount?: number | null;
  inr?: number | null;
  age?: number | null;
  ctExcludedHemorrhage?: boolean | null;
  anticoagulantUse?: boolean | null;
  largeVesselOcclusion?: boolean | null;
  imagingSelectionForLateWindow?: boolean | null;
  preMorbidModifiedRankin?: number | null;
}

export type TimeQuality = 'unknown' | 'estimated' | 'reported' | 'verified';

export interface StrokeMilestone {
  key: string;
  label: string;
  occurredAt: string | null;
  timeQuality: TimeQuality;
  source: string;
  recordedBy: string | null;
  recordedAt: string | null;
  derived: boolean;
  minutesFromArrival: number | null;
}

export interface ClinicalTimeline {
  activationId: number;
  pathway: 'ischemic' | 'hemorrhagic' | 'undetermined';
  milestones: StrokeMilestone[];
}

export interface StrokeTeamMember {
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

export interface StrokeNotification {
  id: number;
  activation_id: number | null;
  pid: number | null;
  kind: string;
  severity: string;
  title: string;
  detail: string | null;
  status: string;
  escalation_level: number;
  created_at: string;
  acknowledged_at: string | null;
  activation_code: string | null;
}

export interface EmergencyAlert {
  id: number;
  activationCode: string;
  pid: number;
  patientName: string;
  careSetting: CareSetting;
  status: string;
  strokeType: StrokeType;
  pathway: 'ischemic' | 'hemorrhagic' | 'undetermined';
  arrivalAt: string;
  activatedAt: string | null;
  lkwAt: string | null;
  nihss: {
    total: number;
    severity: string;
    assessedAt: string;
  } | null;
  imaging: {
    count: number;
    latestStatus: string | null;
    modalities: string[];
  };
  team: Array<{
    id: number;
    userId: number;
    name: string;
    role: string;
    acknowledgedAt: string | null;
    escalationLevel: number;
  }>;
  pendingAcknowledgments: number;
  tasks: Array<{ id: number; discipline: string; task: string; status: string }>;
  pendingNotifications: number;
  transfer: {
    id: number;
    status: string;
    to_facility_id: number;
    departure_at: string | null;
  } | null;
}

export interface EmergencyDashboard {
  generatedAt: string;
  facilityId: number | null;
  summary: {
    activeAlerts: number;
    unassignedAlerts: number;
    pendingAcknowledgments: number;
    pendingNotifications: number;
    openTasks: number;
  };
  alerts: EmergencyAlert[];
}

export interface TreatmentEvent {
  id: number;
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

export interface PathwayState {
  activationId: number;
  strokeType: StrokeType;
  pathway: 'ischemic' | 'hemorrhagic' | 'undetermined';
  allowedEventTypes: string[];
  note: string;
}

export interface TreatmentEventInput {
  eventType: string;
  status: string;
  medication?: string | null;
  dose?: string | null;
  route?: string | null;
  contraindications?: string | null;
  details?: string | null;
  adverseSeverity?: string | null;
  specialistName?: string | null;
  occurredAt?: string | null;
  timeQuality?: TimeQuality;
}

export interface ImagingLinkInput {
  imagingId?: number | null;
  modality: string;
  dicomStudyUid?: string | null;
  orthancStudyId?: string | null;
  performedAt?: string | null;
  findings?: string | null;
  interpretationStatus?: string;
}

export async function getStrokeProtocols(): Promise<ProtocolCatalogue> {
  const r = await nestClient.get('/stroke-care/protocols');
  return r.data;
}

export async function getStrokeOverview(
  facilityId?: number | null,
): Promise<StrokeOverview> {
  const r = await nestClient.get('/stroke-care/overview', {
    params: facilityId ? { facilityId } : undefined,
  });
  return r.data;
}

export async function listStrokeActivations(params: {
  facilityId?: number | null;
  setting?: CareSetting;
  status?: string;
  patientId?: number;
  limit?: number;
}): Promise<{ activations: StrokeActivationRow[]; count: number }> {
  const r = await nestClient.get('/stroke-care/activations', {
    params: {
      facilityId: params.facilityId || undefined,
      setting: params.setting || undefined,
      status: params.status || undefined,
      patientId: params.patientId || undefined,
      limit: params.limit || undefined,
    },
  });
  return r.data;
}

export async function createStrokeActivation(
  input: CreateActivationInput,
): Promise<StrokeActivationDetail> {
  const r = await nestClient.post('/stroke-care/activations', input);
  return r.data;
}

export async function getStrokeActivation(
  id: number,
): Promise<StrokeActivationDetail> {
  const r = await nestClient.get(`/stroke-care/activations/${id}`);
  return r.data;
}

export async function updateStrokeActivation(
  id: number,
  patch: Record<string, unknown>,
): Promise<StrokeActivationDetail> {
  const r = await nestClient.patch(`/stroke-care/activations/${id}`, patch);
  return r.data;
}

export async function signStrokeAssessment(
  activationId: number,
  input: AssessmentInput,
): Promise<StrokeAssessment> {
  const r = await nestClient.post(
    `/stroke-care/activations/${activationId}/assessments`,
    input,
  );
  return r.data;
}

export async function updateStrokeAssessmentDraft(
  assessmentId: number,
  input: AssessmentInput,
): Promise<StrokeAssessment> {
  const r = await nestClient.patch(
    `/stroke-care/assessments/${assessmentId}`,
    input,
  );
  return r.data;
}

export async function finalizeStrokeAssessment(
  assessmentId: number,
  input: FinalizeAssessmentInput,
): Promise<StrokeAssessment> {
  const r = await nestClient.post(
    `/stroke-care/assessments/${assessmentId}/finalize`,
    input,
  );
  return r.data;
}

export async function amendStrokeAssessment(
  assessmentId: number,
  input: AmendAssessmentInput,
): Promise<StrokeAssessment> {
  const r = await nestClient.post(
    `/stroke-care/assessments/${assessmentId}/amend`,
    input,
  );
  return r.data;
}

export async function getStrokeAssessmentFhir(
  assessmentId: number,
): Promise<Record<string, unknown>> {
  const r = await nestClient.get(
    `/stroke-care/assessments/${assessmentId}/fhir`,
  );
  return r.data;
}

export async function getNihssTrend(
  pid: number,
): Promise<NihssTrendPoint[]> {
  const r = await nestClient.get(`/stroke-care/patients/${pid}/nihss-trend`);
  return r.data;
}

export async function getStrokeEncounterContext(
  activationId: number,
): Promise<EncounterContext> {
  const r = await nestClient.get(
    `/stroke-care/activations/${activationId}/profile`,
  );
  return r.data;
}

export async function saveStrokeEncounterProfile(
  activationId: number,
  input: EncounterProfileInput,
): Promise<EncounterContext> {
  const r = await nestClient.put(
    `/stroke-care/activations/${activationId}/profile`,
    input,
  );
  return r.data;
}

export async function acknowledgeStrokeOrder(
  activationId: number,
  input: {
    orderSetKey: string;
    clinicianAcknowledged: boolean;
    contraindicationsReviewed: boolean;
    notes?: string;
  },
): Promise<StrokeOrder> {
  const r = await nestClient.post(
    `/stroke-care/activations/${activationId}/orders`,
    input,
  );
  return r.data;
}

export async function recordStrokeDecision(
  activationId: number,
  input: DecisionInput,
): Promise<StrokeDecision> {
  const r = await nestClient.post(
    `/stroke-care/activations/${activationId}/decisions`,
    input,
  );
  return r.data;
}

export async function linkStrokeImaging(
  activationId: number,
  input: ImagingLinkInput,
): Promise<StrokeImagingLink> {
  const r = await nestClient.post(
    `/stroke-care/activations/${activationId}/imaging`,
    input,
  );
  return r.data;
}

export async function requestStrokeTransfer(
  activationId: number,
  input: { toFacilityId: number; reason?: string; acceptedByName?: string },
): Promise<StrokeTransfer> {
  const r = await nestClient.post(
    `/stroke-care/activations/${activationId}/transfers`,
    input,
  );
  return r.data;
}

export async function getStrokeTimeline(
  activationId: number,
): Promise<StrokeAuditEvent[]> {
  const r = await nestClient.get(
    `/stroke-care/activations/${activationId}/timeline`,
  );
  return r.data;
}

export async function getStrokeQuality(
  days = 30,
  facilityId?: number | null,
): Promise<StrokeQuality> {
  const r = await nestClient.get('/stroke-care/quality', {
    params: { days, ...(facilityId ? { facilityId } : {}) },
  });
  return r.data;
}

export async function getStrokePatientRecord(pid: number) {
  const r = await nestClient.get(`/stroke-care/patients/${pid}`);
  return r.data;
}

export async function scheduleStrokeFollowUp(
  pid: number,
  input: { dueDate: string; visitType?: string; notes?: string },
): Promise<StrokeFollowUp> {
  const r = await nestClient.post(
    `/stroke-care/patients/${pid}/follow-ups`,
    input,
  );
  return r.data;
}

export async function completeStrokeFollowUp(id: number) {
  const r = await nestClient.post(`/stroke-care/follow-ups/${id}/complete`);
  return r.data;
}

export async function addStrokeTask(
  pid: number,
  input: { discipline: string; task: string; dueAt?: string | null },
): Promise<StrokeTask> {
  const r = await nestClient.post(`/stroke-care/patients/${pid}/tasks`, input);
  return r.data;
}

export async function updateStrokeTask(id: number, status: string) {
  const r = await nestClient.patch(`/stroke-care/tasks/${id}`, { status });
  return r.data;
}

export async function getEmergencyDashboard(
  facilityId?: number | null,
): Promise<EmergencyDashboard> {
  const r = await nestClient.get('/stroke-care/emergency-dashboard', {
    params: facilityId ? { facilityId } : undefined,
  });
  return r.data;
}

export async function listStrokeNotifications(): Promise<StrokeNotification[]> {
  const r = await nestClient.get('/stroke-care/notifications');
  return r.data;
}

export async function acknowledgeStrokeNotification(id: number) {
  const r = await nestClient.post(`/stroke-care/notifications/${id}/ack`);
  return r.data;
}

export async function runStrokeNotificationSweep() {
  const r = await nestClient.post('/stroke-care/notifications/sweep');
  return r.data;
}

export async function listStrokeTeam(
  activationId: number,
): Promise<StrokeTeamMember[]> {
  const r = await nestClient.get(`/stroke-care/activations/${activationId}/team`);
  return r.data;
}

export async function assignStrokeTeamMember(
  activationId: number,
  input: { userId: number; teamRole: string },
): Promise<StrokeTeamMember[]> {
  const r = await nestClient.post(
    `/stroke-care/activations/${activationId}/team`,
    input,
  );
  return r.data;
}

export async function acknowledgeStrokeTeam(
  activationId: number,
  teamMemberId?: number,
): Promise<StrokeTeamMember[]> {
  const r = await nestClient.post(
    `/stroke-care/activations/${activationId}/team/acknowledge`,
    teamMemberId ? { teamMemberId } : {},
  );
  return r.data;
}

export async function recordStrokeMilestone(
  activationId: number,
  input: {
    milestoneKey: string;
    occurredAt?: string | null;
    timeQuality: TimeQuality;
    source?: string | null;
    notes?: string | null;
  },
): Promise<ClinicalTimeline> {
  const r = await nestClient.post(
    `/stroke-care/activations/${activationId}/milestones`,
    input,
  );
  return r.data;
}

export async function getClinicalTimeline(
  activationId: number,
): Promise<ClinicalTimeline> {
  const r = await nestClient.get(
    `/stroke-care/activations/${activationId}/clinical-timeline`,
  );
  return r.data;
}

export async function closeStrokeActivation(
  activationId: number,
  input: {
    outcome: string;
    disposition?: string | null;
    notes?: string | null;
    closedAt?: string | null;
  },
) {
  const r = await nestClient.post(
    `/stroke-care/activations/${activationId}/close`,
    input,
  );
  return r.data;
}

export async function getStrokePathway(
  activationId: number,
): Promise<PathwayState> {
  const r = await nestClient.get(
    `/stroke-care/activations/${activationId}/pathway`,
  );
  return r.data;
}

export async function listStrokeTreatmentEvents(
  activationId: number,
): Promise<TreatmentEvent[]> {
  const r = await nestClient.get(
    `/stroke-care/activations/${activationId}/treatment-events`,
  );
  return r.data;
}

export async function recordStrokeTreatmentEvent(
  activationId: number,
  input: TreatmentEventInput,
): Promise<TreatmentEvent> {
  const r = await nestClient.post(
    `/stroke-care/activations/${activationId}/treatment-events`,
    input,
  );
  return r.data;
}

export async function updateStrokeImaging(
  imagingRecordId: number,
  input: {
    interpretationStatus?: string;
    orderedAt?: string | null;
    performedAt?: string | null;
    interpretedAt?: string | null;
    findings?: string | null;
  },
) {
  const r = await nestClient.patch(
    `/stroke-care/imaging/${imagingRecordId}`,
    input,
  );
  return r.data;
}

export async function updateStrokeTransfer(
  transferId: number,
  input: {
    status?: string;
    departureAt?: string | null;
    arrivalAt?: string | null;
    acceptedByName?: string | null;
  },
) {
  const r = await nestClient.patch(
    `/stroke-care/transfers/${transferId}`,
    input,
  );
  return r.data;
}

export async function getFacilityStrokeModules(
  facilityId: number,
  setting?: CareSetting,
) {
  const r = await nestClient.get(
    `/stroke-care/facilities/${facilityId}/modules`,
    { params: setting ? { setting } : undefined },
  );
  return r.data as {
    facilityId: number;
    setting: CareSetting | null;
    modules: StrokeModule[];
  };
}

export async function setFacilityStrokeModules(
  facilityId: number,
  modules: Array<{ key: string; enabled: boolean }>,
) {
  const r = await nestClient.put(
    `/stroke-care/facilities/${facilityId}/modules`,
    { modules },
  );
  return r.data;
}

// ── Modules D–H: imaging metadata, inpatient, rehab, clinic, transfers ───

export interface StrokeRadiologyReport {
  id: number;
  activation_id: number;
  stroke_imaging_id: number | null;
  report_text?: string | null;
  impression: string | null;
  status: string;
  reported_by_name: string | null;
  reported_at: string;
  external_id: string | null;
}

export interface StrokeDicomMetadata {
  id: number;
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
  viewerPath: string;
  viewerNote: string;
}

export interface StrokeInpatientStay {
  id: number;
  activation_id: number;
  pid: number;
  facility_id: number | null;
  unit: string | null;
  room: string | null;
  status: string;
  attending_name: string | null;
  discharge_disposition: string | null;
  admitted_at: string;
  discharged_at: string | null;
  fname?: string;
  lname?: string;
  activation_code?: string;
  stroke_type?: StrokeType;
  nihss_total?: number | null;
  nihss_severity?: string | null;
}

export interface StrokeInpatientDashboard {
  generatedAt: string;
  patients: Array<
    StrokeInpatientStay & {
      latestVitals: Record<string, unknown> | null;
      labsReported24h: number;
      medicationsDueSoon: number;
      outstandingTasks: number;
      latestNeuroAssessment: Record<string, unknown> | null;
      unresolvedComplications: number;
      dischargePlan: Record<string, unknown> | null;
    }
  >;
}

export interface StrokeInpatientAssessment {
  id: number;
  stay_id: number;
  assessment_type: string;
  data: unknown;
  score: number | null;
  risk_level: string | null;
  notes: string | null;
  recorded_by_name: string | null;
  recorded_at: string;
}

export interface StrokeRehabReferral {
  id: number;
  activation_id: number | null;
  pid: number;
  discipline: string;
  reason: string | null;
  status: string;
  referred_at: string;
  accepted_at: string | null;
  session_count?: number;
}

export interface StrokeFunctionalAssessment {
  id: number;
  pid: number;
  instrument: 'mrs' | 'barthel';
  score: number;
  assessed_at: string;
  assessed_by_name: string | null;
  notes: string | null;
}

export interface StrokeBpReading {
  id: number;
  pid: number;
  visit_id: number | null;
  systolic: number;
  diastolic: number;
  pulse: number | null;
  measured_at: string;
  position: string | null;
  notes: string | null;
}

export interface StrokeClinicVisit {
  id: number;
  activation_id: number | null;
  pid: number;
  facility_id: number | null;
  visit_at: string;
  neurologist_name: string | null;
  visit_type: string;
  history_review: string | null;
  hba1c: number | null;
  ldl: number | null;
  functional_status: string | null;
  patient_education: string | null;
  care_plan: string | null;
  next_followup_date: string | null;
  appointment_id: number | null;
  status: string;
  fname?: string;
  lname?: string;
}

export async function getStrokeDicomMetadata(
  imagingRecordId: number,
): Promise<StrokeDicomMetadata> {
  const r = await nestClient.get(
    `/stroke-care/imaging/${imagingRecordId}/dicom-metadata`,
  );
  return r.data;
}

export async function listStrokeRadiologyReports(
  activationId: number,
): Promise<StrokeRadiologyReport[]> {
  const r = await nestClient.get(
    `/stroke-care/activations/${activationId}/radiology-reports`,
  );
  return r.data;
}

export async function addStrokeRadiologyReport(
  activationId: number,
  input: {
    strokeImagingId?: number | null;
    impression?: string | null;
    reportText?: string | null;
    status?: string;
    externalId?: string | null;
  },
): Promise<StrokeRadiologyReport> {
  const r = await nestClient.post(
    `/stroke-care/activations/${activationId}/radiology-reports`,
    input,
  );
  return r.data;
}

export async function getInpatientDashboard(
  facilityId?: number | null,
): Promise<StrokeInpatientDashboard> {
  const r = await nestClient.get('/stroke-care/inpatient/dashboard', {
    params: facilityId ? { facilityId } : undefined,
  });
  return r.data;
}

export async function listInpatientStays(
  facilityId?: number | null,
): Promise<StrokeInpatientStay[]> {
  const r = await nestClient.get('/stroke-care/inpatient/stays', {
    params: facilityId ? { facilityId } : undefined,
  });
  return r.data;
}

export async function admitStrokeInpatient(
  activationId: number,
  input: {
    facilityId?: number | null;
    unit?: string | null;
    admittedAt?: string;
    room?: string | null;
    attendingName?: string | null;
    notes?: string | null;
  },
): Promise<StrokeInpatientStay> {
  const r = await nestClient.post(
    `/stroke-care/activations/${activationId}/inpatient-admission`,
    input,
  );
  return r.data;
}

export async function dischargeStrokeInpatient(
  stayId: number,
  input: {
    dischargedAt?: string;
    disposition?: string;
    notes?: string | null;
  },
): Promise<StrokeInpatientStay> {
  const r = await nestClient.post(
    `/stroke-care/inpatient/stays/${stayId}/discharge`,
    input,
  );
  return r.data;
}

export async function listInpatientAssessments(
  stayId: number,
): Promise<StrokeInpatientAssessment[]> {
  const r = await nestClient.get(
    `/stroke-care/inpatient/stays/${stayId}/assessments`,
  );
  return r.data;
}

export async function addInpatientAssessment(
  stayId: number,
  input: {
    assessmentType: string;
    data?: Record<string, unknown>;
    score?: number | null;
    riskLevel?: string | null;
    notes?: string | null;
    recordedAt?: string;
  },
): Promise<StrokeInpatientAssessment> {
  const r = await nestClient.post(
    `/stroke-care/inpatient/stays/${stayId}/assessments`,
    input,
  );
  return r.data;
}

export async function listStrokeCarePlans(
  activationId: number,
): Promise<Array<Record<string, unknown>>> {
  const r = await nestClient.get(
    `/stroke-care/activations/${activationId}/care-plans`,
  );
  return r.data;
}

export async function addStrokeCarePlan(
  activationId: number,
  input: {
    planType?: string;
    summary?: string | null;
    goals?: string[];
    reviewAt?: string | null;
    status?: string;
  },
) {
  const r = await nestClient.post(
    `/stroke-care/activations/${activationId}/care-plans`,
    input,
  );
  return r.data;
}

export async function listStrokeComplications(
  activationId: number,
): Promise<Array<Record<string, unknown>>> {
  const r = await nestClient.get(
    `/stroke-care/activations/${activationId}/complications`,
  );
  return r.data;
}

export async function addStrokeComplication(
  activationId: number,
  input: {
    complicationType: string;
    severity?: string;
    description?: string | null;
    onsetAt?: string | null;
    resolvedAt?: string | null;
    management?: string | null;
  },
) {
  const r = await nestClient.post(
    `/stroke-care/activations/${activationId}/complications`,
    input,
  );
  return r.data;
}

export async function getStrokeDischargePlan(stayId: number) {
  const r = await nestClient.get(
    `/stroke-care/inpatient/stays/${stayId}/discharge-plan`,
  );
  return r.data;
}

export async function saveStrokeDischargePlan(
  stayId: number,
  input: {
    targetDate?: string | null;
    destination?: string | null;
    services?: string[];
    medicationReconciled?: boolean;
    followupScheduled?: boolean;
    status?: string;
    notes?: string | null;
  },
) {
  const r = await nestClient.put(
    `/stroke-care/inpatient/stays/${stayId}/discharge-plan`,
    input,
  );
  return r.data;
}

// ── Module F: rehabilitation ────────────────────────────────────────────

export async function listStrokeRehabReferrals(
  pid: number,
): Promise<StrokeRehabReferral[]> {
  const r = await nestClient.get(
    `/stroke-care/patients/${pid}/rehab-referrals`,
  );
  return r.data;
}

export async function addStrokeRehabReferral(
  pid: number,
  input: { activationId?: number | null; discipline: string; reason?: string },
): Promise<StrokeRehabReferral> {
  const r = await nestClient.post(
    `/stroke-care/patients/${pid}/rehab-referrals`,
    input,
  );
  return r.data;
}

export async function updateStrokeRehabReferral(
  referralId: number,
  status: string,
) {
  const r = await nestClient.patch(
    `/stroke-care/rehab-referrals/${referralId}`,
    { status },
  );
  return r.data;
}

export async function addStrokeRehabPlan(
  referralId: number,
  input: {
    summary?: string | null;
    goals?: string[];
    frequency?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    status?: string;
  },
) {
  const r = await nestClient.post(
    `/stroke-care/rehab-referrals/${referralId}/plans`,
    input,
  );
  return r.data;
}

export async function listStrokeRehabPlans(
  referralId: number,
): Promise<Array<Record<string, unknown>>> {
  const r = await nestClient.get(
    `/stroke-care/rehab-referrals/${referralId}/plans`,
  );
  return r.data;
}

export async function addStrokeRehabSession(
  referralId: number,
  input: {
    scheduledAt: string;
    attended?: boolean | null;
    durationMinutes?: number | null;
    notes?: string | null;
    therapistName?: string | null;
  },
) {
  const r = await nestClient.post(
    `/stroke-care/rehab-referrals/${referralId}/sessions`,
    input,
  );
  return r.data;
}

export async function listStrokeRehabSessions(
  referralId: number,
): Promise<Array<Record<string, unknown>>> {
  const r = await nestClient.get(
    `/stroke-care/rehab-referrals/${referralId}/sessions`,
  );
  return r.data;
}

export async function listStrokeFunctionalAssessments(
  pid: number,
): Promise<StrokeFunctionalAssessment[]> {
  const r = await nestClient.get(
    `/stroke-care/patients/${pid}/functional-assessments`,
  );
  return r.data;
}

export async function addStrokeFunctionalAssessment(
  pid: number,
  input: {
    instrument: 'mrs' | 'barthel';
    score: number;
    assessedAt: string;
    assessedByName?: string | null;
    activationId?: number | null;
    notes?: string | null;
  },
): Promise<StrokeFunctionalAssessment> {
  const r = await nestClient.post(
    `/stroke-care/patients/${pid}/functional-assessments`,
    input,
  );
  return r.data;
}

export async function getStrokeRehabProgress(pid: number) {
  const r = await nestClient.get(`/stroke-care/patients/${pid}/rehab-progress`);
  return r.data as {
    pid: number;
    instruments: Record<
      string,
      { label: string; range: number[]; licensing: string }
    >;
    assessments: StrokeFunctionalAssessment[];
    referrals: StrokeRehabReferral[];
  };
}

// ── Module G: outpatient clinic ─────────────────────────────────────────

export async function listStrokeClinicVisits(
  pid: number,
): Promise<StrokeClinicVisit[]> {
  const r = await nestClient.get(`/stroke-care/patients/${pid}/clinic-visits`);
  return r.data;
}

export async function addStrokeClinicVisit(
  pid: number,
  input: {
    activationId?: number | null;
    facilityId?: number | null;
    visitAt: string;
    neurologistName?: string | null;
    visitType?: string;
    historyReview?: string | null;
    riskFactors?: string[];
    hba1c?: number | null;
    ldl?: number | null;
    diabetesPlan?: string | null;
    lipidPlan?: string | null;
    functionalStatus?: string | null;
    patientEducation?: string | null;
    carePlan?: string | null;
    nextFollowupDate?: string | null;
    appointmentId?: number | null;
    status?: string;
  },
): Promise<StrokeClinicVisit> {
  const r = await nestClient.post(
    `/stroke-care/patients/${pid}/clinic-visits`,
    input,
  );
  return r.data;
}

export async function listStrokeBpReadings(
  pid: number,
): Promise<StrokeBpReading[]> {
  const r = await nestClient.get(`/stroke-care/patients/${pid}/bp-readings`);
  return r.data;
}

export async function addStrokeBpReading(
  pid: number,
  input: {
    visitId?: number | null;
    systolic: number;
    diastolic: number;
    pulse?: number | null;
    measuredAt: string;
    position?: string | null;
    notes?: string | null;
  },
): Promise<StrokeBpReading> {
  const r = await nestClient.post(
    `/stroke-care/patients/${pid}/bp-readings`,
    input,
  );
  return r.data;
}

export async function getStrokeClinicSummary(pid: number) {
  const r = await nestClient.get(`/stroke-care/patients/${pid}/clinic-summary`);
  return r.data;
}

// ── Module H: transfer interoperability ────────────────────────────────

export async function getStrokeTransferSummaryFhir(transferId: number) {
  const r = await nestClient.get(
    `/stroke-care/transfers/${transferId}/summary-fhir`,
  );
  return r.data;
}

export async function listFacilityStrokeUsers(facilityId: number) {
  const r = await nestClient.get(
    `/stroke-care/facilities/${facilityId}/users`,
  );
  return r.data as Array<{
    id: number;
    user_id: number;
    facility_id: number;
    username?: string | null;
    fname?: string | null;
    lname?: string | null;
    role?: string | null;
  }>;
}

export async function setFacilityStrokeUser(
  facilityId: number,
  userId: number,
  enabled: boolean,
) {
  const r = await nestClient.put(
    `/stroke-care/facilities/${facilityId}/users`,
    { userId, enabled },
  );
  return r.data;
}

export async function getStrokeFhirMetadata() {
  const r = await nestClient.get('/stroke-care/fhir/metadata');
  return r.data as {
    fhirVersion: string;
    supportedResources: string[];
    profiles: Record<string, string>;
    validation: string;
    nihssLoinc: unknown;
  };
}

export async function validateStrokeFhir(activationId: number) {
  const r = await nestClient.get(
    `/stroke-care/activations/${activationId}/fhir/validation`,
  );
  return r.data as {
    valid: boolean;
    fhirVersion: string;
    checkedResources: number;
    checkedReferences: number;
    errors: Array<{ path: string; message: string }>;
    warnings: Array<{ path: string; message: string }>;
    conformanceStatement: string;
  };
}
