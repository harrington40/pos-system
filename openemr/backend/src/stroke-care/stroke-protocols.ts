/**
 * OpenRx Stroke Care — versioned clinical protocols and scoring rules.
 *
 * These constants are deliberately data, not behaviour: nothing in this file
 * decides that a treatment should be given. Every derived flag is advisory and
 * must be reviewed, acknowledged and signed by a clinician through the
 * stroke-care API. The values are the published adult stroke targets that the
 * stroke programme is configured against; a facility that follows a different
 * protocol must change the version and the values together so that every
 * assessment and order records which protocol it was documented under.
 *
 * References (programme configuration, not patient-specific advice):
 *  - AHA/ASA 2019 guideline for the early management of acute ischemic stroke
 *    (IV alteplase window 4.5 h; door-to-needle ≤ 60 min; door-to-imaging ≤ 25 min)
 *  - DAWN (2018) and DEFUSE 3 (2018) late-window thrombectomy selection
 *    (up to 24 h with imaging selection)
 *  - NIHSS (Brott et al., 1989) — 11 items, total 0–42
 *  - AHA/ASA 2021 secondary prevention guideline (follow-up and risk factors)
 */

export type CareSetting = 'outpatient' | 'acute' | 'comprehensive';

export type StrokeType =
  | 'ischemic'
  | 'hemorrhagic'
  | 'undetermined'
  | 'tia'
  | 'not_documented';

export type NihssSeverity =
  | 'none'
  | 'minor'
  | 'moderate'
  | 'moderate_severe'
  | 'severe';

export interface ProtocolDescriptor {
  /** Stable identifier recorded on every row this protocol produced. */
  key: string;
  /** Semantic version. Changing a threshold requires a new version. */
  version: string;
  /** Date the version became effective (ISO 8601, date only). */
  effectiveDate: string;
  /** Human-readable name for the UI. */
  label: string;
  /** Why the values are what they are. */
  source: string;
  /** True when the protocol may only inform, never order, treatment. */
  advisoryOnly: true;
}

export const NIHSS_PROTOCOL: ProtocolDescriptor = {
  key: 'openrx.nihss',
  version: '1.0.0',
  effectiveDate: '2026-01-01',
  label: 'NIH Stroke Scale (NIHSS), 11 items',
  source:
    'Brott T, et al. Measurements of acute cerebral infarction: a clinical examination scale. Stroke. 1989.',
  advisoryOnly: true,
};

export const ACUTE_ISCHEMIC_STROKE_PROTOCOL: ProtocolDescriptor = {
  key: 'openrx.acute-ischemic-stroke',
  version: '1.0.0',
  effectiveDate: '2026-01-01',
  label: 'Acute ischemic stroke pathway (adult)',
  source:
    'AHA/ASA 2019 acute ischemic stroke guideline; DAWN 2018; DEFUSE 3 2018. Facility-configurable programme targets.',
  advisoryOnly: true,
};

export const STROKE_FOLLOW_UP_PROTOCOL: ProtocolDescriptor = {
  key: 'openrx.stroke-secondary-prevention',
  version: '1.0.0',
  effectiveDate: '2026-01-01',
  label: 'Post-stroke follow-up and secondary prevention',
  source:
    'AHA/ASA 2021 secondary prevention of stroke guideline; programme follow-up intervals.',
  advisoryOnly: true,
};

/** Clinical timing targets, in minutes, used for quality reporting only. */
export const STROKE_TIMING_TARGETS = {
  /** Door-to-imaging programme target for suspected acute stroke. */
  doorToImagingMinutes: 25,
  /** Door-to-needle programme target when IV thrombolysis is given. */
  doorToNeedleMinutes: 60,
  /** Maximum interval from last known well for IV thrombolysis. */
  thrombolysisWindowMinutes: 270,
  /** Maximum interval for late-window thrombectomy with imaging selection. */
  thrombectomyWindowMinutes: 1440,
} as const;

/** Physiological limits that must be reviewed before IV thrombolysis. */
export const THROMBOLYSIS_SAFETY_LIMITS = {
  systolicBloodPressureMax: 185,
  diastolicBloodPressureMax: 110,
  glucoseMin: 50,
  glucoseMax: 400,
  plateletMin: 100000,
  inrMax: 1.7,
  ageMin: 18,
} as const;

// ── NIHSS ────────────────────────────────────────────────────────────────────

export interface NihssOption {
  value: number;
  label: string;
}

export interface NihssItem {
  key: string;
  label: string;
  /** Maximum points for the item; the total scale maximum is 42. */
  max: number;
  /** Short guidance shown next to the select in the UI. */
  guidance: string;
  options: NihssOption[];
}

/**
 * The 11 NIHSS item groups (1a–1c count separately). Values and maxima are
 * fixed by the scale; only the total is computed here.
 */
export const NIHSS_ITEMS: NihssItem[] = [
  {
    key: '1a',
    label: '1a. Level of consciousness',
    max: 3,
    guidance: 'Assess alertness; score the best response.',
    options: [
      { value: 0, label: '0 — Alert, keenly responsive' },
      { value: 1, label: '1 — Not alert; arousable by minor stimulation' },
      { value: 2, label: '2 — Not alert; requires repeated stimulation' },
      { value: 3, label: '3 — Unresponsive or responds only with reflex' },
    ],
  },
  {
    key: '1b',
    label: '1b. LOC questions (month, age)',
    max: 2,
    guidance: 'Ask the month and the patient’s age.',
    options: [
      { value: 0, label: '0 — Answers both correctly' },
      { value: 1, label: '1 — Answers one correctly' },
      { value: 2, label: '2 — Answers neither correctly' },
    ],
  },
  {
    key: '1c',
    label: '1c. LOC commands (open/close eyes, grip)',
    max: 2,
    guidance: 'Ask the patient to open/close eyes and grip/release.',
    options: [
      { value: 0, label: '0 — Performs both tasks correctly' },
      { value: 1, label: '1 — Performs one task correctly' },
      { value: 2, label: '2 — Performs neither task correctly' },
    ],
  },
  {
    key: '2',
    label: '2. Best gaze',
    max: 2,
    guidance: 'Horizontal eye movements only.',
    options: [
      { value: 0, label: '0 — Normal' },
      { value: 1, label: '1 — Partial gaze palsy' },
      { value: 2, label: '2 — Forced deviation or total gaze paresis' },
    ],
  },
  {
    key: '3',
    label: '3. Visual fields',
    max: 3,
    guidance: 'Confrontation testing in all four quadrants.',
    options: [
      { value: 0, label: '0 — No visual loss' },
      { value: 1, label: '1 — Partial hemianopia' },
      { value: 2, label: '2 — Complete hemianopia' },
      { value: 3, label: '3 — Bilateral hemianopia / blind' },
    ],
  },
  {
    key: '4',
    label: '4. Facial palsy',
    max: 3,
    guidance: 'Ask the patient to show teeth, raise eyebrows, close eyes.',
    options: [
      { value: 0, label: '0 — Normal symmetrical movement' },
      { value: 1, label: '1 — Minor paralysis' },
      { value: 2, label: '2 — Partial paralysis' },
      { value: 3, label: '3 — Complete paralysis of one or both sides' },
    ],
  },
  {
    key: '5a',
    label: '5a. Motor — left arm',
    max: 4,
    guidance: 'Hold 90° (sitting) or 45° (supine) for 10 s.',
    options: [
      { value: 0, label: '0 — No drift for 10 s' },
      { value: 1, label: '1 — Drift, does not hit bed' },
      { value: 2, label: '2 — Some effort against gravity' },
      { value: 3, label: '3 — No effort against gravity' },
      { value: 4, label: '4 — No movement' },
    ],
  },
  {
    key: '5b',
    label: '5b. Motor — right arm',
    max: 4,
    guidance: 'Hold 90° (sitting) or 45° (supine) for 10 s.',
    options: [
      { value: 0, label: '0 — No drift for 10 s' },
      { value: 1, label: '1 — Drift, does not hit bed' },
      { value: 2, label: '2 — Some effort against gravity' },
      { value: 3, label: '3 — No effort against gravity' },
      { value: 4, label: '4 — No movement' },
    ],
  },
  {
    key: '6a',
    label: '6a. Motor — left leg',
    max: 4,
    guidance: 'Hold 30° supine for 5 s.',
    options: [
      { value: 0, label: '0 — No drift for 5 s' },
      { value: 1, label: '1 — Drift, does not hit bed' },
      { value: 2, label: '2 — Some effort against gravity' },
      { value: 3, label: '3 — No effort against gravity' },
      { value: 4, label: '4 — No movement' },
    ],
  },
  {
    key: '6b',
    label: '6b. Motor — right leg',
    max: 4,
    guidance: 'Hold 30° supine for 5 s.',
    options: [
      { value: 0, label: '0 — No drift for 5 s' },
      { value: 1, label: '1 — Drift, does not hit bed' },
      { value: 2, label: '2 — Some effort against gravity' },
      { value: 3, label: '3 — No effort against gravity' },
      { value: 4, label: '4 — No movement' },
    ],
  },
  {
    key: '7',
    label: '7. Limb ataxia',
    max: 2,
    guidance: 'Finger-nose and heel-shin on both sides.',
    options: [
      { value: 0, label: '0 — Absent' },
      { value: 1, label: '1 — Present in one limb' },
      { value: 2, label: '2 — Present in two or more limbs' },
    ],
  },
  {
    key: '8',
    label: '8. Sensory',
    max: 2,
    guidance: 'Pinprick; score the side with the deficit.',
    options: [
      { value: 0, label: '0 — Normal' },
      { value: 1, label: '1 — Mild-to-moderate sensory loss' },
      { value: 2, label: '2 — Severe or total sensory loss' },
    ],
  },
  {
    key: '9',
    label: '9. Best language',
    max: 3,
    guidance: 'Ask the patient to name objects and read sentences.',
    options: [
      { value: 0, label: '0 — No aphasia' },
      { value: 1, label: '1 — Mild-to-moderate aphasia' },
      { value: 2, label: '2 — Severe aphasia' },
      { value: 3, label: '3 — Mute or global aphasia' },
    ],
  },
  {
    key: '10',
    label: '10. Dysarthria',
    max: 2,
    guidance: 'Ask the patient to read or repeat words.',
    options: [
      { value: 0, label: '0 — Normal' },
      { value: 1, label: '1 — Mild-to-moderate dysarthria' },
      { value: 2, label: '2 — Severe dysarthria / unintelligible' },
    ],
  },
  {
    key: '11',
    label: '11. Extinction and inattention',
    max: 2,
    guidance:
      'Double simultaneous stimulation and description of the affected side.',
    options: [
      { value: 0, label: '0 — No abnormality' },
      { value: 1, label: '1 — One modality affected' },
      { value: 2, label: '2 — Profound hemi-inattention' },
    ],
  },
];

/**
 * Authoritative LOINC mapping, verified against the LOINC panel hierarchy for
 * 70182-1 (LOINC 2.83) on 2026-10-17. Do not add or change a code without the
 * same verification step.
 *
 * Source: https://loinc.org/70182-1/ (panel hierarchy), https://loinc.org/72089-6/
 */
export const NIHSS_LOINC = {
  panel: {
    code: '70182-1',
    display: 'NIH Stroke Scale',
    system: 'http://loinc.org',
  },
  total: {
    code: '72089-6',
    display: 'Total score [NIH Stroke Scale]',
    system: 'http://loinc.org',
  },
  /** One entry per scored field, in panel order. */
  items: {
    '1a': {
      code: '70184-7',
      display: 'Level of consciousness [NIH Stroke Scale]',
    },
    '1b': { code: '70185-4', display: 'LOC questions [NIH Stroke Scale]' },
    '1c': { code: '70186-2', display: 'LOC commands [NIH Stroke Scale]' },
    '2': { code: '70187-0', display: 'Best gaze [NIH Stroke Scale]' },
    '3': { code: '70188-8', display: 'Visual [NIH Stroke Scale]' },
    '4': { code: '70189-6', display: 'Facial palsy [NIH Stroke Scale]' },
    '5a': { code: '70190-4', display: 'Motor arm Left arm [NIH Stroke Scale]' },
    '5b': {
      code: '70967-5',
      display: 'Motor arm Right arm [NIH Stroke Scale]',
    },
    '6a': {
      code: '70191-2',
      display: 'Motor leg Leg - left [NIH Stroke Scale]',
    },
    '6b': {
      code: '70968-3',
      display: 'Motor leg Leg - right [NIH Stroke Scale]',
    },
    '7': { code: '70192-0', display: 'Limb ataxia [NIH Stroke Scale]' },
    '8': { code: '70193-8', display: 'Sensory [NIH Stroke Scale]' },
    '9': { code: '70194-6', display: 'Best language [NIH Stroke Scale]' },
    '10': { code: '70195-3', display: 'Dysarthria [NIH Stroke Scale]' },
    '11': {
      code: '70196-1',
      display: 'Extinction and inattention [NIH Stroke Scale]',
    },
  },
} as const;

/**
 * Items that the published scale permits documenting as untestable:
 * motor items when a limb is missing/fused, and ataxia in the same situation.
 * An untestable item must carry a reason and is never scored as zero.
 */
export const NIHSS_UNTESTABLE_KEYS = ['5a', '5b', '6a', '6b', '7'] as const;

export type NihssUntestableMap = Record<
  string,
  string | boolean | null | undefined
>;

export interface NihssUntestableEntry {
  key: string;
  reason: string;
}

export interface NihssResult {
  total: number;
  maxTotal: number;
  severity: NihssSeverity;
  /** Items that were not supplied — the total is then explicitly incomplete. */
  missing: string[];
  /** Items whose value is outside the allowed range. */
  invalid: string[];
  /** Items documented as untestable with a reason (never counted as zero). */
  untestable: NihssUntestableEntry[];
  /** Untestable declarations without a reason (or for a non-allowed item). */
  untestableWithoutReason: string[];
  untestableNotAllowed: string[];
  byItem: Record<string, number>;
  /** Every item is scored or validly untestable. */
  complete: boolean;
  /** True when at least one item is untestable, so the total is partial. */
  partial: boolean;
}

/** Severity band published with the NIHSS programme configuration. */
export function nihssSeverity(total: number): NihssSeverity {
  if (total <= 0) return 'none';
  if (total <= 4) return 'minor';
  if (total <= 15) return 'moderate';
  if (total <= 20) return 'moderate_severe';
  return 'severe';
}

/**
 * Score the NIHSS from the submitted item values.
 *
 * The server always scores; the browser's live preview is convenience only.
 * Missing or out-of-range items are reported instead of being treated as zero,
 * because silently scoring an unassessed item as normal is how a severe deficit
 * becomes a "minor" stroke.
 */
export function scoreNihss(
  items: Record<string, number | string | null | undefined>,
  untestable: NihssUntestableMap = {},
): NihssResult {
  const byItem: Record<string, number> = {};
  const missing: string[] = [];
  const invalid: string[] = [];
  const untestableEntries: NihssUntestableEntry[] = [];
  const untestableWithoutReason: string[] = [];
  const untestableNotAllowed: string[] = [];
  const allowed = new Set<string>(NIHSS_UNTESTABLE_KEYS);
  let total = 0;

  for (const item of NIHSS_ITEMS) {
    const raw = items?.[item.key];
    const declaration = untestable?.[item.key];
    const declared =
      declaration !== undefined &&
      declaration !== null &&
      declaration !== false;

    if (raw === undefined || raw === null || raw === '') {
      if (declared) {
        if (!allowed.has(item.key)) {
          untestableNotAllowed.push(item.key);
          continue;
        }
        const reason =
          typeof declaration === 'string' ? declaration.trim() : '';
        if (!reason) {
          untestableWithoutReason.push(item.key);
          continue;
        }
        untestableEntries.push({ key: item.key, reason });
        continue;
      }
      missing.push(item.key);
      continue;
    }

    const value = Number(raw);
    if (!Number.isInteger(value) || value < 0 || value > item.max) {
      invalid.push(item.key);
      continue;
    }
    byItem[item.key] = value;
    total += value;
  }

  return {
    total,
    maxTotal: 42,
    severity: nihssSeverity(total),
    missing,
    invalid,
    untestable: untestableEntries,
    untestableWithoutReason,
    untestableNotAllowed,
    byItem,
    complete:
      missing.length === 0 &&
      invalid.length === 0 &&
      untestableWithoutReason.length === 0 &&
      untestableNotAllowed.length === 0,
    partial: untestableEntries.length > 0,
  };
}

// ── Acute alert timeline, team and pathways (Module C) ──────────────────────

/** How a clinical timestamp was obtained. */
export type TimeQuality = 'unknown' | 'estimated' | 'reported' | 'verified';

export const TIME_QUALITIES: TimeQuality[] = [
  'unknown',
  'estimated',
  'reported',
  'verified',
];

export interface StrokeMilestoneDefinition {
  key: string;
  label: string;
  /** Where the time normally comes from when not explicitly recorded. */
  source: string;
}

/**
 * The acute clinical timeline. An unknown milestone stays unknown: the system
 * must never substitute the current time for an event that did not happen yet
 * or was not observed.
 */
export const STROKE_MILESTONES: StrokeMilestoneDefinition[] = [
  {
    key: 'symptom_discovered',
    label: 'Symptom discovery',
    source: 'Encounter profile',
  },
  { key: 'last_known_well', label: 'Last known well', source: 'Activation' },
  {
    key: 'emergency_arrival',
    label: 'Emergency arrival',
    source: 'Activation',
  },
  {
    key: 'alert_activation',
    label: 'Stroke alert activation',
    source: 'Activation',
  },
  {
    key: 'first_clinical_assessment',
    label: 'First clinical assessment',
    source: 'NIHSS / clinical record',
  },
  {
    key: 'nihss_assessment',
    label: 'NIHSS assessment',
    source: 'Finalized NIHSS',
  },
  { key: 'imaging_order', label: 'Imaging ordered', source: 'Imaging link' },
  {
    key: 'imaging_acquisition',
    label: 'Imaging acquired',
    source: 'Imaging link',
  },
  {
    key: 'imaging_interpretation',
    label: 'Imaging interpreted',
    source: 'Imaging link',
  },
  {
    key: 'treatment_decision',
    label: 'Treatment decision',
    source: 'Reperfusion decision',
  },
  {
    key: 'treatment_administration',
    label: 'Treatment administered',
    source: 'Treatment record',
  },
  {
    key: 'transfer_request',
    label: 'Transfer requested',
    source: 'Transfer record',
  },
  {
    key: 'transfer_departure',
    label: 'Transfer departure',
    source: 'Transfer record',
  },
  { key: 'admission', label: 'Admission', source: 'Disposition' },
  { key: 'discharge', label: 'Discharge', source: 'Disposition' },
];

export const STROKE_TEAM_ROLES = [
  'physician',
  'neurologist',
  'nurse',
  'radiologist',
  'pharmacist',
  'therapist',
  'other',
] as const;

export type StrokePathway = 'ischemic' | 'hemorrhagic' | 'undetermined';

export type TreatmentEventType =
  | 'thrombolytic_decision'
  | 'thrombolytic_administration'
  | 'thrombectomy_referral'
  | 'thrombectomy_administration'
  | 'bp_management'
  | 'antithrombotic_decision'
  | 'contraindication'
  | 'adverse_event'
  | 'specialist_consult'
  | 'other';

export const TREATMENT_EVENT_TYPES: TreatmentEventType[] = [
  'thrombolytic_decision',
  'thrombolytic_administration',
  'thrombectomy_referral',
  'thrombectomy_administration',
  'bp_management',
  'antithrombotic_decision',
  'contraindication',
  'adverse_event',
  'specialist_consult',
  'other',
];

/** Reperfusion documentation is only offered once an ischemic pathway is documented. */
export const ISCHEMIC_ONLY_EVENTS: TreatmentEventType[] = [
  'thrombolytic_decision',
  'thrombolytic_administration',
  'thrombectomy_referral',
  'thrombectomy_administration',
];

export const TREATMENT_EVENT_STATUSES = [
  'planned',
  'given',
  'withheld',
  'not_indicated',
  'completed',
  'cancelled',
] as const;

export const ADVERSE_SEVERITIES = [
  'mild',
  'moderate',
  'severe',
  'life_threatening',
] as const;

export function pathwayForStrokeType(strokeType: string): StrokePathway {
  if (strokeType === 'ischemic') return 'ischemic';
  if (strokeType === 'hemorrhagic') return 'hemorrhagic';
  return 'undetermined';
}

// ── Treatment criteria (advisory) ────────────────────────────────────────────

export type CriterionStatus = 'met' | 'not_met' | 'unknown';

export interface CriterionResult {
  key: string;
  label: string;
  status: CriterionStatus;
  detail: string;
  /** True when the clinician must verify this outside the record. */
  requiresClinicianReview: boolean;
}

export interface TreatmentCriteriaInput {
  strokeType?: StrokeType | null;
  lkwAt?: string | Date | null;
  arrivalAt?: string | Date | null;
  now?: Date;
  nihssTotal?: number | string | null;
  systolicBloodPressure?: number | string | null;
  diastolicBloodPressure?: number | string | null;
  glucose?: number | string | null;
  plateletCount?: number | string | null;
  inr?: number | string | null;
  age?: number | string | null;
  preMorbidModifiedRankin?: number | string | null;
  ctExcludedHemorrhage?: boolean | null;
  largeVesselOcclusion?: boolean | null;
  imagingSelectionForLateWindow?: boolean | null;
  anticoagulantUse?: boolean | null;
}

export interface TreatmentCriteriaResult {
  protocol: ProtocolDescriptor;
  minutesFromLastKnownWell: number | null;
  thrombolysis: {
    windowMinutes: number;
    withinWindow: boolean | null;
    criteria: CriterionResult[];
    unmetOrUnknown: number;
  };
  thrombectomy: {
    windowMinutes: number;
    withinWindow: boolean | null;
    criteria: CriterionResult[];
    unmetOrUnknown: number;
  };
  /** Always true: the API never returns an order, only review material. */
  clinicianReviewRequired: true;
  advisoryOnly: true;
}

function asNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function asDate(value: unknown): Date | null {
  if (!value) return null;
  const d =
    value instanceof Date
      ? value
      : typeof value === 'string'
        ? new Date(value)
        : null;
  return d && !Number.isNaN(d.getTime()) ? d : null;
}

function criterion(
  key: string,
  label: string,
  status: CriterionStatus,
  detail: string,
): CriterionResult {
  return {
    key,
    label,
    status,
    detail,
    requiresClinicianReview: status !== 'met',
  };
}

function minutesBetween(from: Date | null, to: Date | null): number | null {
  if (!from || !to) return null;
  return Math.round((to.getTime() - from.getTime()) / 60000);
}

/**
 * Evaluate the documented criteria for IV thrombolysis and thrombectomy.
 *
 * The result is a checklist for a clinician, never a decision. `unknown` is a
 * first-class outcome: an undocumented platelet count is not a normal one.
 */
export function evaluateTreatmentCriteria(
  input: TreatmentCriteriaInput,
): TreatmentCriteriaResult {
  const now = input.now ?? new Date();
  const arrival = asDate(input.arrivalAt) ?? now;
  const lkw = asDate(input.lkwAt);
  const minutes = minutesBetween(lkw, arrival);

  const isIschemic =
    input.strokeType === undefined || input.strokeType === null
      ? null
      : input.strokeType === 'ischemic';

  const thrombolysisCriteria: CriterionResult[] = [
    criterion(
      'ischemic_subtype',
      'Ischemic stroke (hemorrhage excluded)',
      isIschemic === null ? 'unknown' : isIschemic ? 'met' : 'not_met',
      isIschemic === null
        ? 'Stroke subtype is not documented.'
        : isIschemic
          ? 'Subtype recorded as ischemic.'
          : `Subtype recorded as ${input.strokeType}.`,
    ),
    criterion(
      'ct_hemorrhage_excluded',
      'CT excludes intracranial hemorrhage',
      input.ctExcludedHemorrhage === true
        ? 'met'
        : input.ctExcludedHemorrhage === false
          ? 'not_met'
          : 'unknown',
      input.ctExcludedHemorrhage === true
        ? 'Documented as excluded on CT.'
        : input.ctExcludedHemorrhage === false
          ? 'Hemorrhage is present on CT.'
          : 'CT result not documented.',
    ),
    criterion(
      'time_window',
      `Last known well within ${STROKE_TIMING_TARGETS.thrombolysisWindowMinutes} minutes`,
      minutes === null
        ? 'unknown'
        : minutes >= 0 &&
            minutes <= STROKE_TIMING_TARGETS.thrombolysisWindowMinutes
          ? 'met'
          : 'not_met',
      minutes === null
        ? 'Last known well is not documented.'
        : `${minutes} minutes from last known well to arrival.`,
    ),
    criterion(
      'blood_pressure',
      'Blood pressure below 185/110 mmHg before treatment',
      input.systolicBloodPressure === undefined &&
        input.diastolicBloodPressure === undefined
        ? 'unknown'
        : (asNumber(input.systolicBloodPressure) ?? 0) <
              THROMBOLYSIS_SAFETY_LIMITS.systolicBloodPressureMax &&
            (asNumber(input.diastolicBloodPressure) ?? 0) <
              THROMBOLYSIS_SAFETY_LIMITS.diastolicBloodPressureMax
          ? 'met'
          : 'not_met',
      'Blood pressure must be recorded and, if raised, managed per protocol before treatment.',
    ),
    criterion(
      'glucose',
      `Glucose ${THROMBOLYSIS_SAFETY_LIMITS.glucoseMin}–${THROMBOLYSIS_SAFETY_LIMITS.glucoseMax} mg/dL`,
      asNumber(input.glucose) === null
        ? 'unknown'
        : (asNumber(input.glucose) as number) >=
              THROMBOLYSIS_SAFETY_LIMITS.glucoseMin &&
            (asNumber(input.glucose) as number) <=
              THROMBOLYSIS_SAFETY_LIMITS.glucoseMax
          ? 'met'
          : 'not_met',
      'Hypoglycaemia mimics stroke and must be corrected; severe hyperglycaemia needs review.',
    ),
    criterion(
      'platelets',
      `Platelets ≥ ${THROMBOLYSIS_SAFETY_LIMITS.plateletMin.toLocaleString('en-US')}/µL`,
      asNumber(input.plateletCount) === null
        ? 'unknown'
        : (asNumber(input.plateletCount) as number) >=
            THROMBOLYSIS_SAFETY_LIMITS.plateletMin
          ? 'met'
          : 'not_met',
      'Coagulation results must be reviewed before treatment.',
    ),
    criterion(
      'inr',
      `INR ≤ ${THROMBOLYSIS_SAFETY_LIMITS.inrMax}`,
      asNumber(input.inr) === null
        ? 'unknown'
        : (asNumber(input.inr) as number) <= THROMBOLYSIS_SAFETY_LIMITS.inrMax
          ? 'met'
          : 'not_met',
      'Only relevant when the patient is anticoagulated; verify the result and agent.',
    ),
    criterion(
      'age',
      `Age ≥ ${THROMBOLYSIS_SAFETY_LIMITS.ageMin}`,
      asNumber(input.age) === null
        ? 'unknown'
        : (asNumber(input.age) as number) >= THROMBOLYSIS_SAFETY_LIMITS.ageMin
          ? 'met'
          : 'not_met',
      'Paediatric stroke follows a separate pathway.',
    ),
    criterion(
      'anticoagulation',
      'No contraindication from anticoagulant use or recent bleeding',
      input.anticoagulantUse === undefined || input.anticoagulantUse === null
        ? 'unknown'
        : input.anticoagulantUse
          ? 'not_met'
          : 'met',
      'Always confirm the agent, last dose and surgical/bleeding history directly.',
    ),
  ];

  const thrombectomyCriteria: CriterionResult[] = [
    criterion(
      'lvo',
      'Large vessel occlusion on vascular imaging',
      input.largeVesselOcclusion === undefined ||
        input.largeVesselOcclusion === null
        ? 'unknown'
        : input.largeVesselOcclusion
          ? 'met'
          : 'not_met',
      'Requires CTA/MRA or catheter angiography.',
    ),
    criterion(
      'late_window_selection',
      'Late-window imaging selection documented',
      input.imagingSelectionForLateWindow === undefined ||
        input.imagingSelectionForLateWindow === null
        ? 'unknown'
        : input.imagingSelectionForLateWindow
          ? 'met'
          : 'not_met',
      'Beyond 6 hours, selection requires perfusion/core imaging and specialist review.',
    ),
    criterion(
      'time_window',
      `Within ${STROKE_TIMING_TARGETS.thrombectomyWindowMinutes} minutes of last known well`,
      minutes === null
        ? 'unknown'
        : minutes >= 0 &&
            minutes <= STROKE_TIMING_TARGETS.thrombectomyWindowMinutes
          ? 'met'
          : 'not_met',
      minutes === null
        ? 'Last known well is not documented.'
        : `${minutes} minutes from last known well to arrival.`,
    ),
    criterion(
      'premorbid_function',
      'Pre-morbid modified Rankin ≤ 1',
      asNumber(input.preMorbidModifiedRankin) === null
        ? 'unknown'
        : (asNumber(input.preMorbidModifiedRankin) as number) <= 1
          ? 'met'
          : 'not_met',
      'Baseline function must be recorded before late-window treatment is considered.',
    ),
  ];

  const thrombolysisWindow =
    minutes !== null &&
    minutes >= 0 &&
    minutes <= STROKE_TIMING_TARGETS.thrombolysisWindowMinutes;
  const thrombectomyWindow =
    minutes !== null &&
    minutes >= 0 &&
    minutes <= STROKE_TIMING_TARGETS.thrombectomyWindowMinutes;

  return {
    protocol: ACUTE_ISCHEMIC_STROKE_PROTOCOL,
    minutesFromLastKnownWell: minutes,
    thrombolysis: {
      windowMinutes: STROKE_TIMING_TARGETS.thrombolysisWindowMinutes,
      withinWindow: minutes === null ? null : thrombolysisWindow,
      criteria: thrombolysisCriteria,
      unmetOrUnknown: thrombolysisCriteria.filter((c) => c.status !== 'met')
        .length,
    },
    thrombectomy: {
      windowMinutes: STROKE_TIMING_TARGETS.thrombectomyWindowMinutes,
      withinWindow: minutes === null ? null : thrombectomyWindow,
      criteria: thrombectomyCriteria,
      unmetOrUnknown: thrombectomyCriteria.filter((c) => c.status !== 'met')
        .length,
    },
    clinicianReviewRequired: true,
    advisoryOnly: true,
  };
}

// ── Order sets ───────────────────────────────────────────────────────────────

export interface OrderSetItem {
  key: string;
  label: string;
  category:
    | 'assessment'
    | 'imaging'
    | 'laboratory'
    | 'medication'
    | 'nursing'
    | 'consultation'
    | 'disposition';
  /** Free-text instructions only; a clinician must place the actual order. */
  detail: string;
  /** Marks orders that carry a dosing decision the clinician must make. */
  requiresExplicitDoseConfirmation?: boolean;
}

export interface StrokeOrderSet {
  key: string;
  label: string;
  protocol: ProtocolDescriptor;
  description: string;
  items: OrderSetItem[];
}

export const STROKE_ORDER_SETS: StrokeOrderSet[] = [
  {
    key: 'acute-ischemic-admission',
    label: 'Acute ischemic stroke admission orders',
    protocol: ACUTE_ISCHEMIC_STROKE_PROTOCOL,
    description:
      'Checklist for the first hours after an ischemic stroke. A clinician reviews every item and signs the set before it becomes active.',
    items: [
      {
        key: 'nihss-baseline',
        label: 'Document baseline NIHSS',
        category: 'assessment',
        detail: 'Complete the 11-item NIHSS and sign the assessment.',
      },
      {
        key: 'ct-head-stat',
        label: 'Non-contrast CT head without delay',
        category: 'imaging',
        detail:
          'Target door-to-imaging within 25 minutes for suspected acute stroke.',
      },
      {
        key: 'cta',
        label: 'CT angiography (or MR angiography) of head and neck',
        category: 'imaging',
        detail:
          'Assess for large vessel occlusion when thrombectomy is considered.',
      },
      {
        key: 'labs',
        label: 'Glucose, CBC, PT/INR, electrolytes, renal function',
        category: 'laboratory',
        detail: 'Review results before any reperfusion decision.',
      },
      {
        key: 'npo',
        label: 'Nil by mouth until swallow screen',
        category: 'nursing',
        detail: 'Formal dysphagia screen before oral intake.',
      },
      {
        key: 'neuro-observations',
        label: 'Neurological observations and NIHSS reassessment schedule',
        category: 'nursing',
        detail:
          'Frequency is set by the treating team; deterioration triggers urgent review.',
      },
      {
        key: 'bp-monitoring',
        label: 'Blood pressure monitoring per protocol',
        category: 'nursing',
        detail:
          'Thresholds depend on whether reperfusion therapy is given; the treating clinician sets the target.',
      },
      {
        key: 'reperfusion-review',
        label: 'Reperfusion therapy eligibility review',
        category: 'medication',
        detail:
          'Clinician confirms contraindications and documents the decision to give or withhold treatment.',
        requiresExplicitDoseConfirmation: true,
      },
      {
        key: 'dvt-prophylaxis',
        label: 'Venous thromboembolism prophylaxis assessment',
        category: 'medication',
        detail:
          'Timing and agent are decided by the treating clinician, balancing bleeding risk.',
        requiresExplicitDoseConfirmation: true,
      },
      {
        key: 'swallow-screen',
        label: 'Dysphagia screening before oral intake',
        category: 'assessment',
        detail: 'Document the screen and the result.',
      },
      {
        key: 'rehab-consult',
        label: 'Physiotherapy, occupational therapy and speech referral',
        category: 'consultation',
        detail: 'Refer early; document each discipline’s assessment.',
      },
      {
        key: 'secondary-prevention',
        label: 'Secondary prevention plan',
        category: 'medication',
        detail:
          'Antithrombotic, lipid and blood-pressure plan for the individual patient.',
        requiresExplicitDoseConfirmation: true,
      },
    ],
  },
  {
    key: 'post-thrombolysis-monitoring',
    label: 'Post-thrombolysis monitoring',
    protocol: ACUTE_ISCHEMIC_STROKE_PROTOCOL,
    description:
      'Monitoring checklist after IV thrombolysis. Every item requires clinician review and signature.',
    items: [
      {
        key: 'neuro-checks',
        label: 'Neurological checks including NIHSS',
        category: 'nursing',
        detail:
          'Protocol-defined frequency; any deterioration triggers immediate clinician review.',
      },
      {
        key: 'bp-monitoring',
        label: 'Blood pressure monitoring',
        category: 'nursing',
        detail: 'Targets are set by the treating clinician for this patient.',
      },
      {
        key: 'bleeding-surveillance',
        label: 'Bleeding surveillance (puncture sites, mucosa, neuro status)',
        category: 'nursing',
        detail: 'Escalate new bleeding or headache immediately.',
      },
      {
        key: 'no-antithrombotic-24h',
        label: 'No antithrombotic for the protocol-defined interval',
        category: 'medication',
        detail:
          'The treating clinician confirms the interval and the follow-up imaging plan.',
      },
      {
        key: 'followup-imaging',
        label: 'Follow-up imaging plan',
        category: 'imaging',
        detail:
          'Ordered by the treating clinician based on the clinical course.',
      },
    ],
  },
];

export function getOrderSet(key: string): StrokeOrderSet | undefined {
  return STROKE_ORDER_SETS.find((s) => s.key === key);
}

// ── Facility modules ─────────────────────────────────────────────────────────

export interface StrokeModuleDefinition {
  key: string;
  label: string;
  description: string;
  settings: CareSetting[];
}

export const STROKE_MODULES: StrokeModuleDefinition[] = [
  {
    key: 'activation',
    label: 'Stroke activation',
    description: 'Code stroke activation and timing capture.',
    settings: ['acute', 'comprehensive'],
  },
  {
    key: 'nihss',
    label: 'NIHSS assessment',
    description: 'Signed NIHSS assessments with server-side scoring.',
    settings: ['outpatient', 'acute', 'comprehensive'],
  },
  {
    key: 'reperfusion',
    label: 'Reperfusion review',
    description: 'Advisory thrombolysis/thrombectomy criteria and decisions.',
    settings: ['acute', 'comprehensive'],
  },
  {
    key: 'order-sets',
    label: 'Stroke order sets',
    description: 'Versioned order sets requiring clinician acknowledgment.',
    settings: ['acute', 'comprehensive'],
  },
  {
    key: 'imaging',
    label: 'Stroke imaging link',
    description:
      'Link CT/CTA/CTP/MRI studies from the existing imaging/DICOM store.',
    settings: ['acute', 'comprehensive'],
  },
  {
    key: 'inpatient',
    label: 'Inpatient stroke care',
    description:
      'Inpatient monitoring, care-team tasks and discharge planning.',
    settings: ['comprehensive'],
  },
  {
    key: 'rehabilitation',
    label: 'Rehabilitation coordination',
    description: 'Multidisciplinary therapy tasks and referrals.',
    settings: ['outpatient', 'comprehensive'],
  },
  {
    key: 'follow-up',
    label: 'Post-stroke follow-up',
    description: 'Secondary-prevention follow-up scheduling.',
    settings: ['outpatient', 'comprehensive'],
  },
  {
    key: 'transfers',
    label: 'Inter-facility transfer',
    description: 'Transfer requests between acute and comprehensive centres.',
    settings: ['acute', 'comprehensive'],
  },
];

export function strokeModuleKeys(): string[] {
  return STROKE_MODULES.map((m) => m.key);
}

/** Modules enabled for a facility before any explicit configuration exists. */
export function defaultModulesForSetting(setting: CareSetting): string[] {
  return STROKE_MODULES.filter((m) => m.settings.includes(setting)).map(
    (m) => m.key,
  );
}
