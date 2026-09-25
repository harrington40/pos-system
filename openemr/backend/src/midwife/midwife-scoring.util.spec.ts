import {
  computeRisk,
  eddFromLmp,
  gestationFromLmp,
  apgarTotal,
  interpretApgar,
  type RiskInputs,
} from './midwife-scoring.util';

const base: RiskInputs = {
  age: 28, parity: 1, gestationWeeks: 30,
  bpSystolic: 120, bpDiastolic: 80, hemoglobin: 12,
  hasDiabetes: false, hasPreeclampsia: false,
};

describe('computeRisk', () => {
  it('scores the over-40 band at 5, not 3', () => {
    // Regression: >40 was tested after >35 and could never be reached, so the
    // highest-risk age group scored as the moderate one.
    expect(computeRisk({ ...base, age: 41 }).score).toBe(5);
    expect(computeRisk({ ...base, age: 36 }).score).toBe(3);
    expect(computeRisk({ ...base, age: 42 }).score)
      .toBeGreaterThan(computeRisk({ ...base, age: 38 }).score);
  });

  it('scores a teenager and an average age', () => {
    expect(computeRisk({ ...base, age: 17 }).score).toBe(2);
    expect(computeRisk({ ...base, age: 25 }).score).toBe(0);
  });

  it('adds for parity, gestation, BP, anaemia and comorbidity', () => {
    expect(computeRisk({ ...base, parity: 0 }).score).toBe(1);
    expect(computeRisk({ ...base, gestationWeeks: 27 }).score).toBe(3);
    expect(computeRisk({ ...base, bpSystolic: 160 }).score).toBe(5);
    expect(computeRisk({ ...base, hemoglobin: 6 }).score).toBe(4);
    expect(computeRisk({ ...base, hasPreeclampsia: true }).score).toBe(5);
  });

  it('maps the score to a risk band', () => {
    expect(computeRisk(base).level).toBe('low');
    expect(computeRisk({ ...base, age: 38, hasDiabetes: true }).level).toBe('moderate');
    expect(computeRisk({ ...base, hasDiabetes: true, hasPreeclampsia: true }).level).toBe('high');
  });
});

describe('eddFromLmp', () => {
  it("applies Naegele's rule in UTC", () => {
    expect(eddFromLmp('2026-01-01')).toBe('2026-10-08');
  });

  it('returns blank for an unusable date', () => {
    expect(eddFromLmp('')).toBe('');
    expect(eddFromLmp('not-a-date')).toBe('');
  });
});

describe('gestationFromLmp', () => {
  it('reports whole weeks and leftover days', () => {
    expect(gestationFromLmp('2026-01-01', new Date('2026-03-15T00:00:00Z')))
      .toEqual({ weeks: 10, days: 3 });
  });

  it('clamps a future LMP to zero rather than going negative', () => {
    expect(gestationFromLmp('2026-06-01', new Date('2026-03-12T00:00:00Z')))
      .toEqual({ weeks: 0, days: 0 });
  });
});

describe('apgar', () => {
  it('totals the five components', () => {
    expect(apgarTotal({ appearance: 2, pulse: 2, grimace: 2, activity: 2, respiration: 2 })).toBe(10);
    expect(apgarTotal({ appearance: 0, pulse: 1, grimace: 2, activity: 1, respiration: 0 })).toBe(4);
  });

  it('interprets the total', () => {
    expect(interpretApgar(10)).toBe('Normal');
    expect(interpretApgar(7)).toBe('Normal');
    expect(interpretApgar(6)).toBe('Moderately Depressed');
    expect(interpretApgar(3)).toBe('Severely Depressed');
  });
});
