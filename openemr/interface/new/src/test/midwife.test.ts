import { describe, it, expect } from 'vitest';
import { computeRiskScore, calculateEDD, interpretApgar } from '../utils/midwife';

/** Baseline: a low-risk 28-year-old at 30 weeks, normal BP and haemoglobin. */
const base = {
  age: 28, parity: 1, gestationWeeks: 30,
  bpSystolic: 120, bpDiastolic: 80, hemoglobin: 12,
  hasDiabetes: false, hasPreeclampsia: false,
};

const score = (over: Partial<typeof base> = {}) => {
  const v = { ...base, ...over };
  return computeRiskScore(
    v.age, v.parity, v.gestationWeeks,
    v.bpSystolic, v.bpDiastolic, v.hemoglobin,
    v.hasDiabetes, v.hasPreeclampsia,
  );
};

describe('computeRiskScore — age bands', () => {
  it('scores a teenager at 2', () => {
    expect(score({ age: 17 }).score).toBe(2);
  });

  it('scores 18–35 with no age points', () => {
    expect(score({ age: 18 }).score).toBe(0);
    expect(score({ age: 35 }).score).toBe(0);
  });

  it('scores over 35 at 3', () => {
    expect(score({ age: 36 }).score).toBe(3);
    expect(score({ age: 40 }).score).toBe(3);
  });

  it('scores over 40 at 5, not 3', () => {
    // Regression: the >40 branch sat after the >35 branch, so it was unreachable
    // and the highest-risk age group scored as the moderate one.
    expect(score({ age: 41 }).score).toBe(5);
    expect(score({ age: 45 }).score).toBe(5);
  });

  it('is strictly worse for over 40 than for over 35', () => {
    expect(score({ age: 42 }).score).toBeGreaterThan(score({ age: 38 }).score);
  });
});

describe('computeRiskScore — other contributions', () => {
  it('adds 1 for a first pregnancy and 2 for high parity', () => {
    expect(score({ parity: 0 }).score).toBe(1);
    expect(score({ parity: 5 }).score).toBe(2);
  });

  it('adds for early and post-term gestation', () => {
    expect(score({ gestationWeeks: 27 }).score).toBe(3);
    expect(score({ gestationWeeks: 41 }).score).toBe(2);
  });

  it('grades blood pressure on the ACOG thresholds', () => {
    expect(score({ bpSystolic: 130, bpDiastolic: 85 }).score).toBe(1);
    expect(score({ bpSystolic: 140, bpDiastolic: 90 }).score).toBe(3);
    expect(score({ bpSystolic: 160, bpDiastolic: 110 }).score).toBe(5);
  });

  it('grades anaemia', () => {
    expect(score({ hemoglobin: 10.5 }).score).toBe(1);
    expect(score({ hemoglobin: 9 }).score).toBe(2);
    expect(score({ hemoglobin: 6 }).score).toBe(4);
  });

  it('adds for diabetes and preeclampsia', () => {
    expect(score({ hasDiabetes: true }).score).toBe(3);
    expect(score({ hasPreeclampsia: true }).score).toBe(5);
  });
});

describe('computeRiskScore — bands', () => {
  it('reports low, moderate and high with a matching label', () => {
    expect(score()).toMatchObject({ score: 0, level: 'low', label: 'Low Risk' });
    expect(score({ age: 38 })).toMatchObject({ score: 3, level: 'low' });
    expect(score({ age: 38, hasDiabetes: true })).toMatchObject({ score: 6, level: 'moderate', label: 'Moderate Risk' });
    expect(score({ hasPreeclampsia: true, hasDiabetes: true })).toMatchObject({ score: 8, level: 'high', label: 'High Risk' });
  });
});

describe('calculateEDD', () => {
  it("applies Naegele's rule: LMP + 280 days", () => {
    // 1 Jan + 280 days = 8 Oct.
    expect(calculateEDD('2026-01-01').edd).toBe('2026-10-08');
  });

  it('reports gestational age from the LMP', () => {
    const now = new Date('2026-03-12T00:00:00Z');
    const r = calculateEDD('2026-01-01', now);
    // 70 days = 10 weeks exactly.
    expect(r.gestationWeeks).toBe(10);
    expect(r.gestationDays).toBe(0);
  });

  it('reports the leftover days within the current week', () => {
    const now = new Date('2026-03-15T00:00:00Z'); // 73 days after 1 Jan
    const r = calculateEDD('2026-01-01', now);
    expect(r.gestationWeeks).toBe(10);
    expect(r.gestationDays).toBe(3);
  });

  it('does not report negative gestation for a future LMP', () => {
    const r = calculateEDD('2026-06-01', new Date('2026-03-12T00:00:00Z'));
    expect(r.gestationWeeks).toBe(0);
    expect(r.gestationDays).toBe(0);
  });

  it('returns a blank EDD for an unusable date instead of NaN', () => {
    expect(calculateEDD('')).toMatchObject({ edd: '', gestationWeeks: 0 });
    expect(calculateEDD('not-a-date')).toMatchObject({ edd: '' });
  });
});

describe('interpretApgar', () => {
  it('is Normal at 7 and above', () => {
    expect(interpretApgar(10).interpretation).toBe('Normal');
    expect(interpretApgar(7).interpretation).toBe('Normal');
  });

  it('is Moderately Depressed from 4 to 6', () => {
    expect(interpretApgar(6).interpretation).toBe('Moderately Depressed');
    expect(interpretApgar(4).interpretation).toBe('Moderately Depressed');
  });

  it('calls for resuscitation below 4', () => {
    expect(interpretApgar(3).interpretation).toContain('Resuscitation');
    expect(interpretApgar(0).color).toBe('#dc3545');
  });
});
