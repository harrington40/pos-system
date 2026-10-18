import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { parseNumericId } from '../common/id.util';
import { StrokeCareService } from './stroke-care.service';
import { StrokeFacilityGuard } from './stroke-facility.guard';
import { StrokeFeatureGuard } from './stroke-feature.guard';
import type {
  ActivationDto,
  ActivationUpdateDto,
  AmendAssessmentDto,
  AssessmentDto,
  BpReadingDto,
  CarePlanDto,
  ClinicVisitDto,
  ClinicVisitUpdateDto,
  CloseActivationDto,
  ComplicationDto,
  DecisionDto,
  DischargePlanDto,
  EncounterProfileDto,
  FacilityModulesDto,
  FinalizeAssessmentDto,
  FollowUpDto,
  FunctionalAssessmentDto,
  ImagingLinkDto,
  ImagingUpdateDto,
  InpatientAdmitDto,
  InpatientAssessmentDto,
  MedicationReconciliationDto,
  MilestoneDto,
  OrderDto,
  RadiologyReportDto,
  RehabPlanDto,
  RehabReferralDto,
  RehabSessionDto,
  StrokeActor,
  TaskDto,
  TeamMemberDto,
  TransferCreateDto,
  TransferUpdateDto,
  TreatmentEventDto,
} from './stroke-care.service';
import type { CareSetting } from './stroke-protocols';

/** Authenticated request used by the stroke-care endpoints. */
interface StrokeRequest {
  user?: {
    sub?: number | string;
    id?: number | string;
    username?: string;
    displayName?: string;
    role?: string;
  };
}

/** Anyone who may read the stroke record. */
const READ_ROLES = [
  'admin',
  'physician',
  'nurse',
  'registered_nurse',
  'midwife',
  'front_desk',
];

/** Clinicians who may document assessments, orders and care tasks. */
const CLINICIAN_ROLES = ['admin', 'physician', 'nurse', 'registered_nurse'];

/** Reperfusion decisions are the treating physician's (or an admin's). */
const DECISION_ROLES = ['admin', 'physician'];

function actor(req: StrokeRequest): StrokeActor {
  return {
    id: Number(req?.user?.sub ?? req?.user?.id) || undefined,
    username: req?.user?.username,
    displayName: req?.user?.displayName,
    role: req?.user?.role,
  };
}

/**
 * OpenRx Stroke Care.
 *
 * A single modular surface for outpatient stroke clinics, acute stroke
 * activations and comprehensive inpatient stroke care. It reuses the existing
 * patient, encounter, imaging and authentication modules; it does not create a
 * second patient index or a second image store.
 */
@ApiTags('Stroke Care')
@ApiBearerAuth()
@Controller('stroke-care')
@UseGuards(JwtAuthGuard, RolesGuard, StrokeFeatureGuard, StrokeFacilityGuard)
export class StrokeCareController {
  constructor(private readonly stroke: StrokeCareService) {}

  // ── Catalogue and facility configuration ────────────────────────────────

  /** Versioned protocols, NIHSS items, order sets and module definitions. */
  @Get('protocols')
  @Roles(...READ_ROLES)
  getProtocols() {
    return this.stroke.getProtocols();
  }

  /** Pinned FHIR version, supported resources and validation scope. */
  @Get('fhir/metadata')
  @Roles(...READ_ROLES)
  getFhirMetadata() {
    return this.stroke.getFhirCapability();
  }

  @Get('facilities/:facilityId/modules')
  @Roles(...READ_ROLES)
  getModules(
    @Param('facilityId') facilityId: string,
    @Query('setting') setting?: string,
  ) {
    return this.stroke.getFacilityModules(
      parseNumericId(facilityId, 'facilityId'),
      setting ? (setting as CareSetting) : undefined,
    );
  }

  @Put('facilities/:facilityId/modules')
  @Roles('admin')
  setModules(
    @Param('facilityId') facilityId: string,
    @Body() dto: FacilityModulesDto,
    @Req() req: StrokeRequest,
  ) {
    return this.stroke.setFacilityModules(
      parseNumericId(facilityId, 'facilityId'),
      dto || {},
      actor(req),
    );
  }

  @Get('facilities/:facilityId/users')
  @Roles('admin')
  getFacilityUsers(@Param('facilityId') facilityId: string) {
    return this.stroke.listFacilityUsers(
      parseNumericId(facilityId, 'facilityId'),
    );
  }

  @Put('facilities/:facilityId/users')
  @Roles('admin')
  setFacilityUser(
    @Param('facilityId') facilityId: string,
    @Body() dto: { userId?: number | string; enabled?: boolean },
    @Req() req: StrokeRequest,
  ) {
    return this.stroke.setFacilityUser(
      parseNumericId(facilityId, 'facilityId'),
      parseNumericId(String(dto?.userId ?? ''), 'userId'),
      dto?.enabled !== false,
      actor(req),
    );
  }

  // ── Encounters (pagination; aliases keep the existing activation API) ───

  @Get('encounters')
  @Roles(...READ_ROLES)
  listEncounters(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('facilityId') facilityId?: string,
    @Query('setting') setting?: string,
    @Query('status') status?: string,
    @Query('patientId') patientId?: string,
  ) {
    return this.stroke.listActivations({
      page,
      pageSize,
      facilityId,
      setting,
      status,
      patientId,
    });
  }

  @Get('encounters/:id')
  @Roles(...READ_ROLES)
  getEncounter(@Param('id') id: string) {
    return this.stroke.getActivation(parseNumericId(id, 'encounter id'));
  }

  // ── Board and quality ───────────────────────────────────────────────────

  @Get('overview')
  @Roles(...READ_ROLES)
  getOverview(@Query('facilityId') facilityId?: string) {
    return this.stroke.getOverview(facilityId);
  }

  /** Active alerts with team acknowledgment, imaging, tasks and transfers. */
  @Get('emergency-dashboard')
  @Roles(...READ_ROLES)
  getEmergencyDashboard(@Query('facilityId') facilityId?: string) {
    return this.stroke.getEmergencyDashboard(facilityId);
  }

  /** Current user's durable stroke notifications. */
  @Get('notifications')
  @Roles(...READ_ROLES)
  listNotifications(@Req() req: StrokeRequest) {
    return this.stroke.listNotifications({
      ...actor(req),
      role: req.user?.role,
    });
  }

  @Post('notifications/:id/ack')
  @Roles(...READ_ROLES)
  acknowledgeNotification(@Param('id') id: string, @Req() req: StrokeRequest) {
    return this.stroke.acknowledgeNotification(
      parseNumericId(id, 'notification id'),
      { ...actor(req), role: req.user?.role },
    );
  }

  /** Administrator-triggered durable delivery/escalation sweep. */
  @Post('notifications/sweep')
  @Roles('admin')
  runNotificationSweep(@Req() req: StrokeRequest) {
    return this.stroke.runNotificationSweep(
      req.user?.username || req.user?.displayName || 'admin',
    );
  }

  @Get('quality')
  @Roles('admin', 'physician', 'nurse', 'registered_nurse', 'midwife')
  getQuality(
    @Query('days') days?: string,
    @Query('facilityId') facilityId?: string,
  ) {
    return this.stroke.getQuality(days, facilityId);
  }

  // ── Activations ─────────────────────────────────────────────────────────

  @Get('activations')
  @Roles(...READ_ROLES)
  listActivations(
    @Query('facilityId') facilityId?: string,
    @Query('setting') setting?: string,
    @Query('status') status?: string,
    @Query('patientId') patientId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.stroke.listActivations({
      facilityId,
      setting,
      status,
      patientId,
      limit,
    });
  }

  /** Register a code-stroke activation (front desk may start the clock). */
  @Post('activations')
  @Roles('admin', 'physician', 'nurse', 'registered_nurse', 'front_desk')
  createActivation(@Body() dto: ActivationDto, @Req() req: StrokeRequest) {
    return this.stroke.createActivation(dto || {}, actor(req));
  }

  @Get('activations/:id')
  @Roles(...READ_ROLES)
  getActivation(@Param('id') id: string) {
    return this.stroke.getActivation(parseNumericId(id, 'activation id'));
  }

  @Patch('activations/:id')
  @Roles(...CLINICIAN_ROLES)
  updateActivation(
    @Param('id') id: string,
    @Body() dto: ActivationUpdateDto,
    @Req() req: StrokeRequest,
  ) {
    return this.stroke.updateActivation(
      parseNumericId(id, 'activation id'),
      dto || {},
      actor(req),
    );
  }

  // ── Alert team, milestones and closure ─────────────────────────────────

  @Get('activations/:id/team')
  @Roles(...READ_ROLES)
  listTeam(@Param('id') id: string) {
    return this.stroke.listTeam(parseNumericId(id, 'activation id'));
  }

  @Post('activations/:id/team')
  @Roles(...CLINICIAN_ROLES)
  assignTeamMember(
    @Param('id') id: string,
    @Body() dto: TeamMemberDto,
    @Req() req: StrokeRequest,
  ) {
    return this.stroke.assignTeamMember(
      parseNumericId(id, 'activation id'),
      dto || {},
      actor(req),
    );
  }

  @Post('activations/:id/team/acknowledge')
  @Roles(...CLINICIAN_ROLES)
  acknowledgeTeam(
    @Param('id') id: string,
    @Body() dto: { teamMemberId?: number | string | null },
    @Req() req: StrokeRequest,
  ) {
    return this.stroke.acknowledgeTeamMember(
      parseNumericId(id, 'activation id'),
      actor(req),
      dto?.teamMemberId ? Number(dto.teamMemberId) : null,
    );
  }

  /** Explicit milestone with a time-quality (unknown/estimated/reported/verified). */
  @Post('activations/:id/milestones')
  @Roles(...CLINICIAN_ROLES)
  recordMilestone(
    @Param('id') id: string,
    @Body() dto: MilestoneDto,
    @Req() req: StrokeRequest,
  ) {
    return this.stroke.recordMilestone(
      parseNumericId(id, 'activation id'),
      dto || {},
      actor(req),
    );
  }

  @Get('activations/:id/clinical-timeline')
  @Roles(...READ_ROLES)
  getClinicalTimeline(@Param('id') id: string) {
    return this.stroke.listClinicalTimeline(
      parseNumericId(id, 'activation id'),
    );
  }

  /** Close the alert with a recorded outcome. */
  @Post('activations/:id/close')
  @Roles('admin', 'physician')
  closeActivation(
    @Param('id') id: string,
    @Body() dto: CloseActivationDto,
    @Req() req: StrokeRequest,
  ) {
    return this.stroke.closeActivation(
      parseNumericId(id, 'activation id'),
      dto || {},
      actor(req),
    );
  }

  /** Stroke-specific encounter profile plus existing allergies/medications/history. */
  @Get('activations/:id/profile')
  @Roles(...READ_ROLES)
  getEncounterProfile(@Param('id') id: string) {
    return this.stroke.getEncounterProfile(parseNumericId(id, 'activation id'));
  }

  @Put('activations/:id/profile')
  @Roles(...CLINICIAN_ROLES)
  upsertEncounterProfile(
    @Param('id') id: string,
    @Body() dto: EncounterProfileDto,
    @Req() req: StrokeRequest,
  ) {
    return this.stroke.upsertEncounterProfile(
      parseNumericId(id, 'activation id'),
      dto || {},
      actor(req),
    );
  }

  @Get('activations/:id/timeline')
  @Roles(...READ_ROLES)
  getTimeline(@Param('id') id: string) {
    return this.stroke.getTimeline(parseNumericId(id, 'activation id'));
  }

  /** FHIR R4 Bundle for registries and downstream systems. */
  @Get('activations/:id/fhir')
  @Roles(...READ_ROLES)
  getFhir(@Param('id') id: string) {
    return this.stroke.toFhirBundle(parseNumericId(id, 'activation id'));
  }

  /** Structural R4 profile/terminology/reference validation report. */
  @Get('activations/:id/fhir/validation')
  @Roles(...READ_ROLES)
  validateFhir(@Param('id') id: string, @Req() req: StrokeRequest) {
    return this.stroke.validateActivationFhir(
      parseNumericId(id, 'activation id'),
      actor(req),
    );
  }

  // ── NIHSS assessments ───────────────────────────────────────────────────

  @Get('activations/:id/assessments')
  @Roles(...READ_ROLES)
  listAssessments(@Param('id') id: string) {
    return this.stroke.listAssessments(parseNumericId(id, 'activation id'));
  }

  /** Sign and store an NIHSS assessment; the server computes the total. */
  @Post('activations/:id/assessments')
  @Roles(...CLINICIAN_ROLES)
  addAssessment(
    @Param('id') id: string,
    @Body() dto: AssessmentDto,
    @Req() req: StrokeRequest,
  ) {
    return this.stroke.addAssessment(
      parseNumericId(id, 'activation id'),
      dto || {},
      actor(req),
    );
  }

  /** Update an unsigned draft (finalized assessments must be amended). */
  @Patch('assessments/:id')
  @Roles(...CLINICIAN_ROLES)
  updateDraft(
    @Param('id') id: string,
    @Body() dto: AssessmentDto,
    @Req() req: StrokeRequest,
  ) {
    return this.stroke.updateDraftAssessment(
      parseNumericId(id, 'assessment id'),
      dto || {},
      actor(req),
    );
  }

  /** Sign and finalize a draft. */
  @Post('assessments/:id/finalize')
  @Roles(...CLINICIAN_ROLES)
  finalizeAssessment(
    @Param('id') id: string,
    @Body() dto: FinalizeAssessmentDto,
    @Req() req: StrokeRequest,
  ) {
    return this.stroke.finalizeAssessment(
      parseNumericId(id, 'assessment id'),
      dto || {},
      actor(req),
    );
  }

  /** Create a new signed version of a finalized assessment. */
  @Post('assessments/:id/amend')
  @Roles(...CLINICIAN_ROLES)
  amendAssessment(
    @Param('id') id: string,
    @Body() dto: AmendAssessmentDto,
    @Req() req: StrokeRequest,
  ) {
    return this.stroke.amendAssessment(
      parseNumericId(id, 'assessment id'),
      dto || {},
      actor(req),
    );
  }

  /** FHIR R4 Bundle for one assessment (panel + items + total). */
  @Get('assessments/:id/fhir')
  @Roles(...READ_ROLES)
  getAssessmentFhir(@Param('id') id: string) {
    return this.stroke.toAssessmentFhirBundle(
      parseNumericId(id, 'assessment id'),
    );
  }

  @Get('assessments/:id/fhir/validation')
  @Roles(...READ_ROLES)
  validateAssessmentFhir(@Param('id') id: string, @Req() req: StrokeRequest) {
    return this.stroke.validateAssessmentFhir(
      parseNumericId(id, 'assessment id'),
      actor(req),
    );
  }

  /** Normalized LOINC-coded NIHSS items for one assessment. */
  @Get('assessments/:id/items')
  @Roles(...READ_ROLES)
  listAssessmentItems(@Param('id') id: string) {
    return this.stroke.listAssessmentItems(parseNumericId(id, 'assessment id'));
  }

  /** Paginated NIHSS history for one patient across encounters. */
  @Get('patients/:pid/nihss-assessments')
  @Roles(...READ_ROLES)
  listPatientAssessments(
    @Param('pid') pid: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.stroke.listPatientAssessments(
      parseNumericId(pid, 'patient id'),
      page,
      pageSize,
    );
  }

  /** Finalized NIHSS history for the trend chart. */
  @Get('patients/:pid/nihss-trend')
  @Roles(...READ_ROLES)
  getNihssTrend(@Param('pid') pid: string) {
    return this.stroke.getNihssTrend(parseNumericId(pid, 'patient id'));
  }

  // ── Order sets ──────────────────────────────────────────────────────────

  @Get('activations/:id/orders')
  @Roles(...READ_ROLES)
  listOrders(@Param('id') id: string) {
    return this.stroke.listOrders(parseNumericId(id, 'activation id'));
  }

  /** Acknowledge a versioned order set. Explicit reviewer sign-off is required. */
  @Post('activations/:id/orders')
  @Roles('admin', 'physician')
  addOrder(
    @Param('id') id: string,
    @Body() dto: OrderDto,
    @Req() req: StrokeRequest,
  ) {
    return this.stroke.addOrder(
      parseNumericId(id, 'activation id'),
      dto || {},
      actor(req),
    );
  }

  // ── Reperfusion decisions ───────────────────────────────────────────────

  @Get('activations/:id/decisions')
  @Roles(...READ_ROLES)
  listDecisions(@Param('id') id: string) {
    return this.stroke.listDecisions(parseNumericId(id, 'activation id'));
  }

  /**
   * Record the clinician's own decision. The checklist returned to the UI is
   * advisory; this endpoint stores whatever the clinician decided and why.
   */
  @Post('activations/:id/decisions')
  @Roles(...DECISION_ROLES)
  recordDecision(
    @Param('id') id: string,
    @Body() dto: DecisionDto,
    @Req() req: StrokeRequest,
  ) {
    return this.stroke.recordDecision(
      parseNumericId(id, 'activation id'),
      dto || {},
      actor(req),
    );
  }

  // ── Pathway-separated treatment documentation ──────────────────────────

  @Get('activations/:id/pathway')
  @Roles(...READ_ROLES)
  getPathway(@Param('id') id: string) {
    return this.stroke.getPathway(parseNumericId(id, 'activation id'));
  }

  @Get('activations/:id/treatment-events')
  @Roles(...READ_ROLES)
  listTreatmentEvents(@Param('id') id: string) {
    return this.stroke.listTreatmentEvents(parseNumericId(id, 'activation id'));
  }

  @Post('activations/:id/treatment-events')
  @Roles(...CLINICIAN_ROLES)
  recordTreatmentEvent(
    @Param('id') id: string,
    @Body() dto: TreatmentEventDto,
    @Req() req: StrokeRequest,
  ) {
    return this.stroke.recordTreatmentEvent(
      parseNumericId(id, 'activation id'),
      dto || {},
      actor(req),
    );
  }

  // ── Imaging links ───────────────────────────────────────────────────────

  @Get('activations/:id/imaging')
  @Roles(...READ_ROLES)
  listImaging(@Param('id') id: string) {
    return this.stroke.listImaging(parseNumericId(id, 'activation id'));
  }

  /** Link a study from the existing imaging/DICOM store — never re-upload. */
  @Post('activations/:id/imaging')
  @Roles(...CLINICIAN_ROLES, 'lab_tech')
  linkImaging(
    @Param('id') id: string,
    @Body() dto: ImagingLinkDto,
    @Req() req: StrokeRequest,
  ) {
    return this.stroke.linkImaging(
      parseNumericId(id, 'activation id'),
      dto || {},
      actor(req),
    );
  }

  // ── Transfers ───────────────────────────────────────────────────────────

  @Get('activations/:id/transfers')
  @Roles(...READ_ROLES)
  listTransfers(@Param('id') id: string) {
    return this.stroke.listTransfers(parseNumericId(id, 'activation id'));
  }

  @Post('activations/:id/transfers')
  @Roles(...CLINICIAN_ROLES)
  addTransfer(
    @Param('id') id: string,
    @Body() dto: TransferCreateDto,
    @Req() req: StrokeRequest,
  ) {
    return this.stroke.addTransfer(
      parseNumericId(id, 'activation id'),
      dto || {},
      actor(req),
    );
  }

  @Patch('transfers/:id')
  @Roles(...CLINICIAN_ROLES)
  updateTransfer(
    @Param('id') id: string,
    @Body() dto: TransferUpdateDto,
    @Req() req: StrokeRequest,
  ) {
    return this.stroke.updateTransfer(
      parseNumericId(id, 'transfer id'),
      dto || {},
      actor(req),
    );
  }

  @Patch('imaging/:id')
  @Roles(...CLINICIAN_ROLES, 'lab_tech')
  updateImaging(
    @Param('id') id: string,
    @Body() dto: ImagingUpdateDto,
    @Req() req: StrokeRequest,
  ) {
    return this.stroke.updateImagingLink(
      parseNumericId(id, 'imaging record id'),
      dto || {},
      actor(req),
    );
  }

  // ── Patient record, follow-up and care-team tasks ──────────────────────

  /** One patient's unified stroke record. */
  @Get('patients/:pid')
  @Roles(...READ_ROLES)
  getPatientRecord(@Param('pid') pid: string) {
    return this.stroke.getPatientRecord(parseNumericId(pid, 'patient id'));
  }

  @Get('patients/:pid/follow-ups')
  @Roles(...READ_ROLES)
  listFollowUps(@Param('pid') pid: string) {
    return this.stroke.listFollowUps(parseNumericId(pid, 'patient id'));
  }

  @Post('patients/:pid/follow-ups')
  @Roles(...CLINICIAN_ROLES)
  addFollowUp(
    @Param('pid') pid: string,
    @Body() dto: FollowUpDto,
    @Req() req: StrokeRequest,
  ) {
    return this.stroke.addFollowUp(
      parseNumericId(pid, 'patient id'),
      dto || {},
      actor(req),
    );
  }

  @Post('follow-ups/:id/complete')
  @Roles(...CLINICIAN_ROLES)
  completeFollowUp(@Param('id') id: string, @Req() req: StrokeRequest) {
    return this.stroke.completeFollowUp(
      parseNumericId(id, 'follow-up id'),
      actor(req),
    );
  }

  @Get('patients/:pid/tasks')
  @Roles(...READ_ROLES)
  listTasks(@Param('pid') pid: string) {
    return this.stroke.listTasks(parseNumericId(pid, 'patient id'));
  }

  @Post('patients/:pid/tasks')
  @Roles(...CLINICIAN_ROLES, 'front_desk')
  addTask(
    @Param('pid') pid: string,
    @Body() dto: TaskDto,
    @Req() req: StrokeRequest,
  ) {
    return this.stroke.addTask(
      parseNumericId(pid, 'patient id'),
      dto || {},
      actor(req),
    );
  }

  @Patch('tasks/:id')
  @Roles(...CLINICIAN_ROLES, 'front_desk')
  updateTaskStatus(
    @Param('id') id: string,
    @Body() dto: { status?: string },
    @Req() req: StrokeRequest,
  ) {
    return this.stroke.updateTaskStatus(
      parseNumericId(id, 'task id'),
      String(dto?.status ?? ''),
      actor(req),
    );
  }

  // ── Module D: imaging metadata and radiology reports ────────────────────

  /** Stored DICOM metadata + the existing authorized viewer path (audited). */
  @Get('imaging/:id/dicom-metadata')
  @Roles(...READ_ROLES)
  getDicomMetadata(@Param('id') id: string, @Req() req: StrokeRequest) {
    return this.stroke.getDicomMetadata(
      parseNumericId(id, 'imaging record id'),
      actor(req),
    );
  }

  @Get('activations/:id/radiology-reports')
  @Roles(...READ_ROLES)
  listRadiologyReports(@Param('id') id: string) {
    return this.stroke.listRadiologyReports(
      parseNumericId(id, 'activation id'),
    );
  }

  @Post('activations/:id/radiology-reports')
  @Roles(...CLINICIAN_ROLES)
  addRadiologyReport(
    @Param('id') id: string,
    @Body() dto: RadiologyReportDto,
    @Req() req: StrokeRequest,
  ) {
    return this.stroke.addRadiologyReport(
      parseNumericId(id, 'activation id'),
      dto || {},
      actor(req),
    );
  }

  // ── Module E: inpatient stroke unit ─────────────────────────────────────

  @Get('inpatient/stays')
  @Roles(...READ_ROLES)
  listInpatientStays(@Query('facilityId') facilityId?: string) {
    return this.stroke.listInpatientStays(facilityId);
  }

  @Get('inpatient/dashboard')
  @Roles(...READ_ROLES)
  inpatientDashboard(@Query('facilityId') facilityId?: string) {
    return this.stroke.getInpatientDashboard(facilityId);
  }

  @Post('activations/:id/inpatient-admission')
  @Roles(...CLINICIAN_ROLES)
  admitInpatient(
    @Param('id') id: string,
    @Body() dto: InpatientAdmitDto,
    @Req() req: StrokeRequest,
  ) {
    return this.stroke.admitInpatient(
      parseNumericId(id, 'activation id'),
      dto || {},
      actor(req),
    );
  }

  @Post('inpatient/stays/:id/discharge')
  @Roles(...CLINICIAN_ROLES)
  dischargeInpatient(
    @Param('id') id: string,
    @Body()
    dto: { dischargedAt?: string; disposition?: string; notes?: string },
    @Req() req: StrokeRequest,
  ) {
    return this.stroke.dischargeInpatient(
      parseNumericId(id, 'stay id'),
      dto || {},
      actor(req),
    );
  }

  @Get('inpatient/stays/:id/assessments')
  @Roles(...READ_ROLES)
  listInpatientAssessments(@Param('id') id: string) {
    return this.stroke.listInpatientAssessments(parseNumericId(id, 'stay id'));
  }

  @Post('inpatient/stays/:id/assessments')
  @Roles(...CLINICIAN_ROLES)
  addInpatientAssessment(
    @Param('id') id: string,
    @Body() dto: InpatientAssessmentDto,
    @Req() req: StrokeRequest,
  ) {
    return this.stroke.addInpatientAssessment(
      parseNumericId(id, 'stay id'),
      dto || {},
      actor(req),
    );
  }

  @Get('activations/:id/care-plans')
  @Roles(...READ_ROLES)
  listCarePlans(@Param('id') id: string) {
    return this.stroke.listCarePlans(parseNumericId(id, 'activation id'));
  }

  @Post('activations/:id/care-plans')
  @Roles(...CLINICIAN_ROLES)
  addCarePlan(
    @Param('id') id: string,
    @Body() dto: CarePlanDto,
    @Req() req: StrokeRequest,
  ) {
    return this.stroke.addCarePlan(
      parseNumericId(id, 'activation id'),
      dto || {},
      actor(req),
    );
  }

  @Get('activations/:id/complications')
  @Roles(...READ_ROLES)
  listComplications(@Param('id') id: string) {
    return this.stroke.listComplications(parseNumericId(id, 'activation id'));
  }

  @Post('activations/:id/complications')
  @Roles(...CLINICIAN_ROLES)
  addComplication(
    @Param('id') id: string,
    @Body() dto: ComplicationDto,
    @Req() req: StrokeRequest,
  ) {
    return this.stroke.addComplication(
      parseNumericId(id, 'activation id'),
      dto || {},
      actor(req),
    );
  }

  @Get('inpatient/stays/:id/discharge-plan')
  @Roles(...READ_ROLES)
  getDischargePlan(@Param('id') id: string) {
    return this.stroke.getDischargePlan(parseNumericId(id, 'stay id'));
  }

  @Put('inpatient/stays/:id/discharge-plan')
  @Roles(...CLINICIAN_ROLES)
  upsertDischargePlan(
    @Param('id') id: string,
    @Body() dto: DischargePlanDto,
    @Req() req: StrokeRequest,
  ) {
    return this.stroke.upsertDischargePlan(
      parseNumericId(id, 'stay id'),
      dto || {},
      actor(req),
    );
  }

  // ── Module F: rehabilitation ────────────────────────────────────────────

  @Get('patients/:pid/rehab-referrals')
  @Roles(...READ_ROLES)
  listRehabReferrals(@Param('pid') pid: string) {
    return this.stroke.listRehabReferrals(parseNumericId(pid, 'patient id'));
  }

  @Post('patients/:pid/rehab-referrals')
  @Roles(...CLINICIAN_ROLES)
  addRehabReferral(
    @Param('pid') pid: string,
    @Body() dto: RehabReferralDto,
    @Req() req: StrokeRequest,
  ) {
    return this.stroke.addRehabReferral(
      parseNumericId(pid, 'patient id'),
      dto || {},
      actor(req),
    );
  }

  @Patch('rehab-referrals/:id')
  @Roles(...CLINICIAN_ROLES)
  updateRehabReferral(
    @Param('id') id: string,
    @Body() dto: { status?: string },
    @Req() req: StrokeRequest,
  ) {
    return this.stroke.updateRehabReferral(
      parseNumericId(id, 'referral id'),
      dto || {},
      actor(req),
    );
  }

  @Get('rehab-referrals/:id/plans')
  @Roles(...READ_ROLES)
  listRehabPlans(@Param('id') id: string) {
    return this.stroke.listRehabPlans(parseNumericId(id, 'referral id'));
  }

  @Post('rehab-referrals/:id/plans')
  @Roles(...CLINICIAN_ROLES)
  addRehabPlan(
    @Param('id') id: string,
    @Body() dto: RehabPlanDto,
    @Req() req: StrokeRequest,
  ) {
    return this.stroke.addRehabPlan(
      parseNumericId(id, 'referral id'),
      dto || {},
      actor(req),
    );
  }

  @Get('rehab-referrals/:id/sessions')
  @Roles(...READ_ROLES)
  listRehabSessions(@Param('id') id: string) {
    return this.stroke.listRehabSessions(parseNumericId(id, 'referral id'));
  }

  @Post('rehab-referrals/:id/sessions')
  @Roles(...CLINICIAN_ROLES)
  addRehabSession(
    @Param('id') id: string,
    @Body() dto: RehabSessionDto,
    @Req() req: StrokeRequest,
  ) {
    return this.stroke.addRehabSession(
      parseNumericId(id, 'referral id'),
      dto || {},
      actor(req),
    );
  }

  @Get('patients/:pid/functional-assessments')
  @Roles(...READ_ROLES)
  listFunctionalAssessments(@Param('pid') pid: string) {
    return this.stroke.listFunctionalAssessments(
      parseNumericId(pid, 'patient id'),
    );
  }

  /** Clinician-entered mRS/Barthel score; never inferred from attendance. */
  @Post('patients/:pid/functional-assessments')
  @Roles(...CLINICIAN_ROLES)
  addFunctionalAssessment(
    @Param('pid') pid: string,
    @Body() dto: FunctionalAssessmentDto,
    @Req() req: StrokeRequest,
  ) {
    return this.stroke.addFunctionalAssessment(
      parseNumericId(pid, 'patient id'),
      dto || {},
      actor(req),
    );
  }

  @Get('patients/:pid/rehab-progress')
  @Roles(...READ_ROLES)
  getRehabProgress(@Param('pid') pid: string) {
    return this.stroke.getRehabProgress(parseNumericId(pid, 'patient id'));
  }

  // ── Module G: outpatient stroke clinic ──────────────────────────────────

  @Get('patients/:pid/clinic-visits')
  @Roles(...READ_ROLES)
  listClinicVisits(@Param('pid') pid: string) {
    return this.stroke.listClinicVisits(parseNumericId(pid, 'patient id'));
  }

  @Post('patients/:pid/clinic-visits')
  @Roles(...CLINICIAN_ROLES)
  addClinicVisit(
    @Param('pid') pid: string,
    @Body() dto: ClinicVisitDto,
    @Req() req: StrokeRequest,
  ) {
    return this.stroke.addClinicVisit(
      parseNumericId(pid, 'patient id'),
      dto || {},
      actor(req),
    );
  }

  @Get('clinic-visits')
  @Roles(...READ_ROLES)
  listClinicVisitsAcrossPatients(@Query('facilityId') facilityId?: string) {
    return this.stroke.listClinicVisits(undefined, facilityId);
  }

  @Patch('clinic-visits/:id')
  @Roles(...CLINICIAN_ROLES)
  updateClinicVisit(
    @Param('id') id: string,
    @Body() dto: ClinicVisitUpdateDto,
    @Req() req: StrokeRequest,
  ) {
    return this.stroke.updateClinicVisit(
      parseNumericId(id, 'clinic visit id'),
      dto || {},
      actor(req),
    );
  }

  @Get('clinic-visits/:id/medication-reconciliation')
  @Roles(...READ_ROLES)
  getMedicationReconciliation(@Param('id') id: string) {
    return this.stroke.getMedicationReconciliation(
      parseNumericId(id, 'clinic visit id'),
    );
  }

  @Put('clinic-visits/:id/medication-reconciliation')
  @Roles(...CLINICIAN_ROLES)
  reconcileClinicMedications(
    @Param('id') id: string,
    @Body() dto: MedicationReconciliationDto,
    @Req() req: StrokeRequest,
  ) {
    return this.stroke.reconcileClinicMedications(
      parseNumericId(id, 'clinic visit id'),
      dto || {},
      actor(req),
    );
  }

  @Get('patients/:pid/bp-readings')
  @Roles(...READ_ROLES)
  listBpReadings(@Param('pid') pid: string) {
    return this.stroke.listBpReadings(parseNumericId(pid, 'patient id'));
  }

  @Post('patients/:pid/bp-readings')
  @Roles(...CLINICIAN_ROLES, 'front_desk')
  addBpReading(
    @Param('pid') pid: string,
    @Body() dto: BpReadingDto,
    @Req() req: StrokeRequest,
  ) {
    return this.stroke.addBpReading(
      parseNumericId(pid, 'patient id'),
      dto || {},
      actor(req),
    );
  }

  @Get('patients/:pid/clinic-summary')
  @Roles(...READ_ROLES)
  getClinicSummary(@Param('pid') pid: string) {
    return this.stroke.getClinicSummary(parseNumericId(pid, 'patient id'));
  }

  // ── Module H: interoperable transfer summary ────────────────────────────

  @Get('transfers/:id/summary-fhir')
  @Roles(...READ_ROLES)
  getTransferSummaryFhir(@Param('id') id: string, @Req() req: StrokeRequest) {
    return this.stroke.getTransferSummaryFhir(
      parseNumericId(id, 'transfer id'),
      actor(req),
    );
  }
}
