/**
 * Midwifery clinical scoring used by the midwife dashboard.
 *
 * Extracted from the page so the numbers can be unit tested — a risk score that
 * is quietly wrong changes whether a pregnancy is escalated.
 */

export interface RiskResult {
  score: number;
  level: 'low' | 'moderate' | 'high';
  color: string;
  label: string;
}

/** Standard pregnancy risk scoring algorithm (modified Bishop/PARs) */
export function computeRiskScore(
  age: number,
  parity: number,
  gestationWeeks: number,
  bpSystolic: number,
  bpDiastolic: number,
  hemoglobin: number,
  hasDiabetes: boolean,
  hasPreeclampsia: boolean,
): RiskResult {
  let score = 0;

  // Age risk — the higher band must be tested first. Written the other way round
  // the >40 case was unreachable (anything over 40 is also over 35), so the
  // highest-risk age group scored as if it were the moderate one.
  if (age < 18) score += 2;
  else if (age > 40) score += 5;
  else if (age > 35) score += 3;

  // Parity risk
  if (parity === 0) score += 1;
  else if (parity > 4) score += 2;

  // Gestation risk
  if (gestationWeeks < 28) score += 3;
  else if (gestationWeeks > 40) score += 2;

  // Blood pressure (standard ACOG thresholds)
  if (bpSystolic >= 160 || bpDiastolic >= 110) score += 5;
  else if (bpSystolic >= 140 || bpDiastolic >= 90) score += 3;
  else if (bpSystolic >= 130 || bpDiastolic >= 85) score += 1;

  // Anemia
  if (hemoglobin < 7) score += 4;
  else if (hemoglobin < 10) score += 2;
  else if (hemoglobin < 11) score += 1;

  // Comorbidities
  if (hasDiabetes) score += 3;
  if (hasPreeclampsia) score += 5;

  if (score <= 3) return { score, level: 'low', color: '#198754', label: 'Low Risk' };
  if (score <= 7) return { score, level: 'moderate', color: '#fd7e14', label: 'Moderate Risk' };
  return { score, level: 'high', color: '#dc3545', label: 'High Risk' };
}

export interface EddResult {
  edd: string;
  gestationWeeks: number;
  gestationDays: number;
}

/** EDD calculator using Naegele's Rule (LMP + 280 days) */
export function calculateEDD(lmpDate: string, now: Date = new Date()): EddResult {
  const lmp = new Date(lmpDate);
  if (isNaN(lmp.getTime())) {
    return { edd: '', gestationWeeks: 0, gestationDays: 0 };
  }

  const edd = new Date(lmp);
  edd.setUTCDate(edd.getUTCDate() + 280);

  // An LMP in the future would otherwise report negative gestation.
  const diffMs = Math.max(0, now.getTime() - lmp.getTime());
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  return {
    edd: edd.toISOString().split('T')[0],
    gestationWeeks: Math.floor(diffDays / 7),
    gestationDays: diffDays % 7,
  };
}

/** APGAR score interpretation */
export function interpretApgar(total: number): { color: string; interpretation: string } {
  if (total >= 7) return { color: '#198754', interpretation: 'Normal' };
  if (total >= 4) return { color: '#fd7e14', interpretation: 'Moderately Depressed' };
  return { color: '#dc3545', interpretation: 'Severely Depressed — Needs Resuscitation' };
}
