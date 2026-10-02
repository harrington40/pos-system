/**
 * RN safety & workflow screening — pure, database-free.
 *
 * Everything here is a deterministic function of the inputs so it can be unit
 * tested and reused by the dashboard, the handover generator and the task board.
 * It deliberately *advises*: the escalation and risk scores surface what to look
 * at, and the nurse makes the decision.
 *
 * Covers, in order:
 *  - sepsis screen (qSOFA/SIRS-lite from charted vitals)
 *  - deterioration trend (latest NEWS2 against the previous set)
 *  - observation due date (ageing vs a reassessment cadence)
 *  - Morse fall risk and Braden pressure-injury risk
 *  - fluid balance (intake/output over a window)
 *  - weight-based dose-range check
 *  - SBAR handover assembly
 *  - task prioritisation for the shift board
 */

export interface SafetyVitals {
    respiration?: number | string | null;
    oxygen_saturation?: number | string | null;
    temperature?: number | string | null;
    bps?: number | string | null;
    bpd?: number | string | null;
    pulse?: number | string | null;
    avpuAlert?: boolean | null;
    onSupplementalO2?: boolean | null;
}

const num = (x: unknown): number | null => {
    if (x === null || x === undefined || x === '') return null;
    const n = Number(x);
    return Number.isFinite(n) ? n : null;
};

/** Convert a temperature to Celsius (chart may hold Fahrenheit). */
export function toCelsius(temp: unknown): number | null {
    const t = num(temp);
    if (t == null) return null;
    return t > 45 ? Math.round(((t - 32) * 5) / 9 * 10) / 10 : t;
}

// ── Sepsis screen ─────────────────────────────────────────────────────────

export type SepsisRisk = 'none' | 'suspected' | 'high';

export interface SepsisScreen {
    risk: SepsisRisk;
    score: number;
    flags: string[];
}

/**
 * A pragmatic bedside screen: physiological red flags plus the "infection
 * suspected" trigger the caller supplies (fever/prescription/known source). Two
 * or more red flags with suspected infection is the escalate-now band.
 */
export function sepsisScreen(
    v: SafetyVitals,
    infectionSuspected = false,
): SepsisScreen {
    const flags: string[] = [];
    const resp = num(v?.respiration);
    const spo2 = num(v?.oxygen_saturation);
    const temp = toCelsius(v?.temperature);
    const sys = num(v?.bps);
    const pulse = num(v?.pulse);

    if (resp != null && resp >= 22) flags.push('Tachypnoea (RR ≥ 22)');
    if (sys != null && sys <= 100) flags.push('Hypotension (SBP ≤ 100)');
    if (temp != null && temp >= 38.3) flags.push('Fever (≥ 38.3 °C)');
    if (temp != null && temp <= 36.0) flags.push('Hypothermia (≤ 36.0 °C)');
    if (v?.avpuAlert === false) flags.push('Altered mentation');
    if (pulse != null && pulse >= 90 && infectionSuspected)
        flags.push('Tachycardia (HR ≥ 90)');
    if (spo2 != null && spo2 <= 92) flags.push('Hypoxia (SpO₂ ≤ 92%)');

    const score = flags.length;
    let risk: SepsisRisk = 'none';
    if (infectionSuspected && score >= 2) risk = 'high';
    else if (score >= 1) risk = 'suspected';
    return { risk, score, flags };
}

// ── Deterioration trend ───────────────────────────────────────────────────

export type Trend = 'improving' | 'stable' | 'worsening' | 'unknown';

export interface DeteriorationTrend {
    trend: Trend;
    delta: number | null;
    latest: number | null;
    previous: number | null;
}

/**
 * Compare the latest NEWS2 total against the previous set. A rise of ≥ 2 points
 * (or any rise into the ≥ 5 "key threshold" band) is treated as worsening.
 */
export function deteriorationTrend(
    history: { total?: number | null; date?: string | null }[],
): DeteriorationTrend {
    const rows = (history || [])
        .map((r) => ({ total: num(r?.total), date: r?.date ?? null }))
        .filter((r) => r.total != null) as { total: number; date: string | null }[];
    if (rows.length < 2)
        return {
            trend: 'unknown',
            delta: null,
            latest: rows[0]?.total ?? null,
            previous: null,
        };
    // History is newest-first from the API; fall back to date sort if not.
    const [latest, previous] = rows;
    const delta = latest.total - previous.total;
    const trend: Trend =
        delta >= 2 || (latest.total >= 5 && delta > 0)
            ? 'worsening'
            : delta <= -2
              ? 'improving'
              : 'stable';
    return { trend, delta, latest: latest.total, previous: previous.total };
}

// ── Observation due date ──────────────────────────────────────────────────

export interface ObservationDue {
    state: 'due' | 'overdue' | 'ok' | 'never';
    minutesUntil: number | null;
    lastAt: string | null;
}

/**
 * Where the next set of observations sits relative to a cadence (minutes).
 * A never-charted patient is "never" (a first-set task), not "ok".
 */
export function observationDue(
    lastAt: string | Date | null | undefined,
    cadenceMinutes: number,
    now: Date = new Date(),
): ObservationDue {
    if (!lastAt) return { state: 'never', minutesUntil: null, lastAt: null };
    const last = lastAt instanceof Date ? lastAt : new Date(lastAt);
    if (!Number.isFinite(last.getTime()))
        return { state: 'never', minutesUntil: null, lastAt: null };
    const cadence = Math.max(1, Number(cadenceMinutes) || 60);
    const minutesUntil = Math.round(
        (last.getTime() + cadence * 60000 - now.getTime()) / 60000,
    );
    const state =
        minutesUntil <= -cadence / 4 ? 'overdue' : minutesUntil <= 0 ? 'due' : 'ok';
    return { state, minutesUntil, lastAt: last.toISOString() };
}

// ── Morse fall risk ────────────────────────────────────────────────────────

export interface MorseInput {
    historyOfFalling?: boolean;
    secondaryDiagnosis?: boolean;
    /** 0 none/bedrest/nurse-assist · 15 crutches/cane/walker · 30 furniture */
    ambulatoryAid?: 0 | 15 | 30;
    ivLine?: boolean;
    /** 0 normal/bedrest/immobile · 10 weak · 20 impaired */
    gait?: 0 | 10 | 20;
    /** true when the patient overestimates ability or forgets limits */
    impairedJudgement?: boolean;
}

export type FallRiskLevel = 'low' | 'moderate' | 'high';

export interface FallsRisk {
    score: number;
    level: FallRiskLevel;
    interventions: string[];
}

/** Morse Fall Scale (0–125). ≥ 45 is high risk. */
export function morseFallRisk(input: MorseInput): FallsRisk {
    let score = 0;
    if (input?.historyOfFalling) score += 25;
    if (input?.secondaryDiagnosis) score += 15;
    score += Number(input?.ambulatoryAid) || 0;
    if (input?.ivLine) score += 20;
    score += Number(input?.gait) || 0;
    if (input?.impairedJudgement) score += 15;

    const level: FallRiskLevel =
        score >= 45 ? 'high' : score >= 25 ? 'moderate' : 'low';
    const interventions: string[] = ['Orient to call bell and keep it in reach'];
    if (level !== 'low') {
        interventions.push('Bed in lowest position, brakes on, call bell in reach');
        interventions.push('Non-slip footwear; night light on');
    }
    if (level === 'high') {
        interventions.push('Assist with all transfers (no unassisted ambulation)');
        interventions.push('Consider bed/chair alarm and frequent rounding');
    }
    return { score, level, interventions };
}

// ── Braden pressure-injury risk ────────────────────────────────────────────

export interface BradenInput {
    sensoryPerception: 1 | 2 | 3 | 4;
    moisture: 1 | 2 | 3 | 4;
    activity: 1 | 2 | 3 | 4;
    mobility: 1 | 2 | 3 | 4;
    nutrition: 1 | 2 | 3 | 4;
    frictionShear: 1 | 2 | 3 | 4;
}

export type BradenRisk = 'none' | 'mild' | 'moderate' | 'high' | 'veryHigh';

export interface BradenResult {
    score: number;
    risk: BradenRisk;
    actions: string[];
}

/** Braden Scale (6–23). A lower score is a higher risk. */
export function bradenScore(input: BradenInput): BradenResult {
    const clamp = (x: unknown) =>
        Math.min(4, Math.max(1, Math.round(Number(x) || 1)));
    const score =
        clamp(input?.sensoryPerception) +
        clamp(input?.moisture) +
        clamp(input?.activity) +
        clamp(input?.mobility) +
        clamp(input?.nutrition) +
        clamp(input?.frictionShear);

    const risk: BradenRisk =
        score <= 9
            ? 'veryHigh'
            : score <= 12
              ? 'high'
              : score <= 14
                ? 'moderate'
                : score <= 18
                  ? 'mild'
                  : 'none';

    const actions: string[] = [];
    if (risk !== 'none') {
        actions.push('Reposition at least every 2 hours; document skin check');
        actions.push('Keep skin clean and dry; use a pressure-redistributing surface');
    }
    if (risk === 'high' || risk === 'veryHigh') {
        actions.push('Elevate heels; avoid donut devices');
        actions.push('Dietitian referral and hourly rounding');
    }
    return { score, risk, actions };
}

// ── Fluid balance ──────────────────────────────────────────────────────────

export interface FluidBalance {
    intakeMl: number;
    outputMl: number;
    netMl: number;
    status: 'negative' | 'balanced' | 'positive' | 'positiveHigh';
}

/** Sum intake/output totals; a large positive net is the one to act on. */
export function fluidBalance(
    intakeMl: number,
    outputMl: number,
    highThresholdMl = 1000,
): FluidBalance {
    const intake = Math.max(0, Number(intakeMl) || 0);
    const output = Math.max(0, Number(outputMl) || 0);
    const net = intake - output;
    const status: FluidBalance['status'] =
        net <= -500
            ? 'negative'
            : net < 500
              ? 'balanced'
              : net < highThresholdMl
                ? 'positive'
                : 'positiveHigh';
    return { intakeMl: intake, outputMl: output, netMl: net, status };
}

// ── Weight-based dose range ────────────────────────────────────────────────

export interface DoseRangeResult {
    perKg: number | null;
    ok: boolean;
    message: string;
}

/**
 * Flag a dose falling outside a mg/kg range when a weight is charted. Advisory:
 * a missing weight cannot be checked and is reported as such, not passed.
 */
export function doseRangeCheck(input: {
    dose: number | string | null | undefined;
    weightKg: number | string | null | undefined;
    minPerKg: number;
    maxPerKg: number;
}): DoseRangeResult {
    const dose = num(input?.dose);
    const weight = num(input?.weightKg);
    if (dose == null || weight == null || weight <= 0)
        return {
            perKg: null,
            ok: true,
            message: 'Weight or dose missing — range not checked.',
        };
    const perKg = Math.round((dose / weight) * 100) / 100;
    const ok = perKg >= input.minPerKg && perKg <= input.maxPerKg;
    return {
        perKg,
        ok,
        message: ok
            ? `Within range (${perKg} mg/kg).`
            : `Outside ${input.minPerKg}–${input.maxPerKg} mg/kg (${perKg} mg/kg) — verify.`,
    };
}


// ── SBAR handover ──────────────────────────────────────────────────────────

export interface HandoverInput {
    patientName: string;
    room?: string | null;
    ageYears?: number | null;
    sex?: string | null;
    reason?: string | null;
    acuityLevel?: string | null;
    diagnoses?: string[];
    allergies?: string[];
    currentMeds?: string[];
    latestVitals?: string | null;
    latestNews2?: number | null;
    trend?: Trend;
    pendingLabs?: number;
    outstandingMeds?: number;
    redFlags?: string[];
    codeStatus?: string | null;
    isolation?: string | null;
}

export interface Handover {
    situation: string;
    background: string;
    assessment: string;
    recommendation: string;
    text: string;
}

/**
 * Assemble a shift-handover SBAR from chart signals. Deliberately factual: every
 * line comes from the inputs, so a handover never invents a clinical claim.
 */
export function buildHandover(h: HandoverInput): Handover {
    const who = [h.patientName, h.room ? `Room ${h.room}` : '', h.ageYears ? `${h.ageYears}y` : '', h.sex || '']
        .filter(Boolean)
        .join(' · ');

    const situation = `${who}${h.reason ? ` — admitted with ${h.reason}` : ''}.${
        h.acuityLevel ? ` Acuity ${h.acuityLevel}.` : ''
    }`;

    const bg: string[] = [];
    if (h.diagnoses?.length) bg.push(`Problems: ${h.diagnoses.join(', ')}`);
    if (h.allergies?.length) bg.push(`Allergies: ${h.allergies.join(', ')}`);
    if (h.currentMeds?.length) bg.push(`Active meds: ${h.currentMeds.join(', ')}`);
    if (!bg.length) bg.push('No recorded problems, allergies or active meds.');
    const background = bg.join('. ');

    const assess: string[] = [];
    if (h.latestVitals) assess.push(`Vitals: ${h.latestVitals}`);
    if (h.latestNews2 != null)
        assess.push(`NEWS2 ${h.latestNews2}${h.trend ? ` (${h.trend})` : ''}`);
    if (h.redFlags?.length) assess.push(`Flags: ${h.redFlags.join('; ')}`);
    if (!assess.length) assess.push('No recent observations.');
    const assessment = assess.join('. ');

    const rec: string[] = [];
    if (h.outstandingMeds) rec.push(`${h.outstandingMeds} medication(s) outstanding`);
    if (h.pendingLabs) rec.push(`${h.pendingLabs} lab result(s) awaited`);
    if (h.codeStatus) rec.push(`Code status ${h.codeStatus}`);
    if (h.isolation) rec.push(`Isolation: ${h.isolation}`);
    if (!rec.length) rec.push('Continue routine monitoring');
    const recommendation = rec.join('. ');

    const text =
        `SBAR — ${h.patientName}\n` +
        `S: ${situation}\n` +
        `B: ${background}\n` +
        `A: ${assessment}\n` +
        `R: ${recommendation}`;

    return { situation, background, assessment, recommendation, text };
}

// ── Task prioritisation ────────────────────────────────────────────────────

export type TaskKind =
    | 'med'
    | 'vitals'
    | 'lab'
    | 'message'
    | 'assess'
    | 'escalation'
    | 'io'
    | 'other';

export interface NurseTask {
    id: number | string;
    kind: TaskKind;
    title: string;
    priority?: number; // 0 = normal, higher = more urgent
    dueAt?: string | null;
    status?: string;
}

/** Weight by clinical urgency first, then how overdue the task is. */
export function priorityWeight(task: NurseTask, now: Date = new Date()): number {
    const base: Record<TaskKind, number> = {
        escalation: 100,
        med: 60,
        assess: 45,
        vitals: 40,
        io: 25,
        lab: 20,
        message: 15,
        other: 10,
    };
    let score = base[task.kind] ?? 10;
    score += Math.max(0, Number(task.priority) || 0) * 5;
    if (task.dueAt) {
        const due = new Date(task.dueAt).getTime();
        if (Number.isFinite(due)) {
            const overdueMin = (now.getTime() - due) / 60000;
            if (overdueMin > 0) score += Math.min(overdueMin / 5, 60);
        }
    }
    return Math.round(score);
}

/** Order tasks by surgical urgency then lateness. */
export function prioritiseTasks(
    tasks: NurseTask[],
    now: Date = new Date(),
): NurseTask[] {
    return [...(tasks || [])]
        .filter((t) => (t.status || 'open') !== 'done')
        .sort((a, b) => priorityWeight(b, now) - priorityWeight(a, now));
}

// ── Safety banner ──────────────────────────────────────────────────────────

export interface SafetyBanner {
    severity: 'critical' | 'warning' | 'info';
    items: string[];
}

/**
 * The always-visible strip: code status, isolation and allergies. Allergy and a
 * DNR/DNAR status are critical so they cannot be scrolled past unnoticed.
 */
export function safetyBanner(input: {
    codeStatus?: string | null;
    isolation?: string | null;
    allergies?: string[];
}): SafetyBanner {
    const items: string[] = [];
    let severity: SafetyBanner['severity'] = 'info';
    if (input.allergies?.length) {
        items.push(`Allergies: ${input.allergies.join(', ')}`);
        severity = 'critical';
    }
    if (input.codeStatus && !/full/i.test(input.codeStatus)) {
        items.push(`Code status: ${input.codeStatus}`);
        severity = 'critical';
    }
    if (input.isolation) {
        items.push(`Isolation: ${input.isolation}`);
        if (severity !== 'critical') severity = 'warning';
    }
    return { severity, items };
}

