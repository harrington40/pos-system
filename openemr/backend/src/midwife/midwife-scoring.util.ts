/**
 * Pregnancy risk scoring, computed server-side.
 *
 * The dashboard also scores locally so the midwife sees the band immediately,
 * but the row that lands in the chart is recomputed here from the raw inputs —
 * a stored clinical score should not be whatever the browser happened to send.
 *
 * Keep in step with interface/new/src/utils/midwife.ts.
 */

export interface RiskInputs {
  age: number;
  parity: number;
  gestationWeeks: number;
  bpSystolic: number;
  bpDiastolic: number;
  hemoglobin: number;
  hasDiabetes: boolean;
  hasPreeclampsia: boolean;
}

export interface RiskResult {
  score: number;
  level: 'low' | 'moderate' | 'high';
  label: string;
}

export const EDD_GESTATION_DAYS = 280; // Naegele's rule

/** LMP + 280 days, in UTC so the date cannot drift with the server timezone. */
export function eddFromLmp(lmp: string): string {
  const d = new Date(lmp);
  if (isNaN(d.getTime())) return '';
  d.setUTCDate(d.getUTCDate() + EDD_GESTATION_DAYS);
  return d.toISOString().split('T')[0];
}

export function computeRisk(inputs: RiskInputs): RiskResult {
  let score = 0;

  // Highest age band first: testing >35 before >40 makes >40 unreachable.
  if (inputs.age < 18) score += 2;
  else if (inputs.age > 40) score += 5;
  else if (inputs.age > 35) score += 3;

  if (inputs.parity === 0) score += 1;
  else if (inputs.parity > 4) score += 2;

  if (inputs.gestationWeeks < 28) score += 3;
  else if (inputs.gestationWeeks > 40) score += 2;

  if (inputs.bpSystolic >= 160 || inputs.bpDiastolic >= 110) score += 5;
  else if (inputs.bpSystolic >= 140 || inputs.bpDiastolic >= 90) score += 3;
  else if (inputs.bpSystolic >= 130 || inputs.bpDiastolic >= 85) score += 1;

  if (inputs.hemoglobin < 7) score += 4;
  else if (inputs.hemoglobin < 10) score += 2;
  else if (inputs.hemoglobin < 11) score += 1;

  if (inputs.hasDiabetes) score += 3;
  if (inputs.hasPreeclampsia) score += 5;

  if (score <= 3) return { score, level: 'low', label: 'Low Risk' };
  if (score <= 7) return { score, level: 'moderate', label: 'Moderate Risk' };
  return { score, level: 'high', label: 'High Risk' };
}

export interface ApgarSet {
  appearance: number;
  pulse: number;
  grimace: number;
  activity: number;
  respiration: number;
}

/** APGAR total, 0–10. */
export function apgarTotal(set: ApgarSet): number {
  return set.appearance + set.pulse + set.grimace + set.activity + set.respiration;
}

export function interpretApgar(total: number): 'Normal' | 'Moderately Depressed' | 'Severely Depressed' {
  if (total >= 7) return 'Normal';
  if (total >= 4) return 'Moderately Depressed';
  return 'Severely Depressed';
}

/** Gestational age at a point in time, for the EDD record. */
export function gestationFromLmp(lmp: string, now: Date = new Date()): { weeks: number; days: number } {
  const d = new Date(lmp);
  if (isNaN(d.getTime())) return { weeks: 0, days: 0 };
  const diffDays = Math.max(0, Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)));
  return { weeks: Math.floor(diffDays / 7), days: diffDays % 7 };
}
