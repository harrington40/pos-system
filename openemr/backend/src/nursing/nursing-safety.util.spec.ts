import {
    bradenScore,
    buildHandover,
    deteriorationTrend,
    doseRangeCheck,
    fluidBalance,
    morseFallRisk,
    observationDue,
    prioritiseTasks,
    safetyBanner,
    sepsisScreen,
    toCelsius,
} from './nursing-safety.util';

describe('toCelsius', () => {
    it('converts Fahrenheit and passes Celsius through', () => {
        expect(toCelsius(98.6)).toBeCloseTo(37, 0);
        expect(toCelsius(38)).toBe(38);
        expect(toCelsius(null)).toBeNull();
    });
});

describe('sepsisScreen', () => {
    it('is high risk with suspected infection and two red flags', () => {
        const s = sepsisScreen(
            { respiration: 24, bps: 95, temperature: 38.6, pulse: 110 },
            true,
        );
        expect(s.risk).toBe('high');
        expect(s.score).toBeGreaterThanOrEqual(2);
        expect(s.flags.join(' ')).toMatch(/Tachypnoea/);
    });

    it('is suspected with a single flag and no infection trigger', () => {
        expect(sepsisScreen({ respiration: 23 }).risk).toBe('suspected');
    });

    it('is none for normal vitals', () => {
        const s = sepsisScreen({
            respiration: 16,
            bps: 120,
            temperature: 36.8,
            pulse: 76,
        });
        expect(s.risk).toBe('none');
        expect(s.score).toBe(0);
    });
});

describe('deteriorationTrend', () => {
    it('detects a worsening score (newest first)', () => {
        const t = deteriorationTrend([{ total: 7 }, { total: 3 }]);
        expect(t.trend).toBe('worsening');
        expect(t.delta).toBe(4);
    });

    it('detects improvement and stability', () => {
        expect(deteriorationTrend([{ total: 2 }, { total: 6 }]).trend).toBe(
            'improving',
        );
        expect(deteriorationTrend([{ total: 4 }, { total: 4 }]).trend).toBe(
            'stable',
        );
    });

    it('is unknown with fewer than two readings', () => {
        expect(deteriorationTrend([{ total: 5 }]).trend).toBe('unknown');
    });
});

describe('observationDue', () => {
    const now = new Date('2026-01-01T10:00:00Z');
    it('flags a never-charted patient as a first-set task', () => {
        expect(observationDue(null, 60, now).state).toBe('never');
    });
    it('is ok before, due at, and overdue after the cadence', () => {
        expect(observationDue('2026-01-01T09:30:00Z', 60, now).state).toBe('ok');
        const overdue = observationDue('2026-01-01T08:00:00Z', 60, now);
        expect(overdue.state).toBe('overdue');
        expect(overdue.minutesUntil).toBeLessThan(0);
    });
});

describe('morseFallRisk', () => {
    it('scores low for a well patient', () => {
        const f = morseFallRisk({});
        expect(f.score).toBe(0);
        expect(f.level).toBe('low');
    });
    it('scores high with history, aid, IV and impaired gait', () => {
        const f = morseFallRisk({
            historyOfFalling: true,
            ambulatoryAid: 15,
            ivLine: true,
            gait: 10,
        });
        expect(f.level).toBe('high');
        expect(f.interventions.length).toBeGreaterThan(2);
    });
});

describe('bradenScore', () => {
    const base = {
        sensoryPerception: 4 as const,
        moisture: 4 as const,
        activity: 4 as const,
        mobility: 4 as const,
        nutrition: 4 as const,
        frictionShear: 4 as const,
    };
    it('is none at the ceiling', () => {
        const b = bradenScore(base);
        expect(b.score).toBe(24);
        expect(b.risk).toBe('none');
    });
    it('is very high risk at the floor with actions', () => {
        const b = bradenScore({
            sensoryPerception: 1,
            moisture: 1,
            activity: 1,
            mobility: 1,
            nutrition: 1,
            frictionShear: 1,
        });
        expect(b.score).toBe(6);
        expect(b.risk).toBe('veryHigh');
        expect(b.actions.length).toBeGreaterThan(0);
    });
    it('bands moderate in the middle', () => {
        expect(
            bradenScore({
                sensoryPerception: 3,
                moisture: 2,
                activity: 2,
                mobility: 3,
                nutrition: 3,
                frictionShear: 1,
            }).risk,
        ).toBe('moderate');
    });
});

describe('fluidBalance', () => {
    it('computes the net and bands it', () => {
        expect(fluidBalance(2000, 1600).status).toBe('balanced');
        expect(fluidBalance(1500, 2200).status).toBe('negative');
        expect(fluidBalance(3000, 1000).status).toBe('positiveHigh');
    });
});

describe('doseRangeCheck', () => {
    it('passes a within-range dose', () => {
        const r = doseRangeCheck({
            dose: 500,
            weightKg: 70,
            minPerKg: 5,
            maxPerKg: 10,
        });
        expect(r.ok).toBe(true);
        expect(r.perKg).toBeCloseTo(7.14, 1);
    });
    it('flags an out-of-range dose and a missing weight', () => {
        expect(
            doseRangeCheck({ dose: 2000, weightKg: 70, minPerKg: 5, maxPerKg: 10 })
                .ok,
        ).toBe(false);
        expect(
            doseRangeCheck({ dose: 500, weightKg: null, minPerKg: 5, maxPerKg: 10 })
                .perKg,
        ).toBeNull();
    });
});

describe('buildHandover', () => {
    it('assembles all four SBAR sections from the inputs', () => {
        const h = buildHandover({
            patientName: 'Test Patient',
            room: '101A',
            reason: 'pneumonia',
            diagnoses: ['Community-acquired pneumonia'],
            allergies: ['Penicillin'],
            currentMeds: ['Ceftriaxone'],
            latestVitals: 'BP 110/70, HR 96',
            latestNews2: 4,
            trend: 'worsening',
            outstandingMeds: 2,
            pendingLabs: 1,
            codeStatus: 'DNAR',
        });
        expect(h.text).toMatch(/^SBAR — Test Patient/);
        expect(h.text).toContain('S:');
        expect(h.background).toContain('Penicillin');
        expect(h.assessment).toContain('worsening');
        expect(h.recommendation).toContain('DNAR');
    });
});

describe('prioritiseTasks', () => {
    const now = new Date('2026-01-01T10:00:00Z');
    it('puts escalation ahead of a routine message', () => {
        const sorted = prioritiseTasks(
            [
                { id: 1, kind: 'message', title: 'note' },
                { id: 2, kind: 'escalation', title: 'NEWS2 rising' },
            ],
            now,
        );
        expect(sorted[0].id).toBe(2);
    });
    it('lifts an overdue dose above a fresh vitals task', () => {
        const sorted = prioritiseTasks(
            [
                { id: 'v', kind: 'vitals', title: 'obs', dueAt: '2026-01-01T10:00:00Z' },
                { id: 'm', kind: 'med', title: 'dose', dueAt: '2026-01-01T09:00:00Z' },
            ],
            now,
        );
        expect(sorted[0].id).toBe('m');
    });
    it('drops completed tasks', () => {
        expect(
            prioritiseTasks([{ id: 1, kind: 'med', title: 'x', status: 'done' }], now),
        ).toHaveLength(0);
    });
});

describe('safetyBanner', () => {
    it('is critical when an allergy is present', () => {
        const b = safetyBanner({ allergies: ['Penicillin'], codeStatus: 'Full' });
        expect(b.severity).toBe('critical');
        expect(b.items.join(' ')).toMatch(/Penicillin/);
    });
    it('flags a non-full code status', () => {
        expect(safetyBanner({ codeStatus: 'DNAR' }).severity).toBe('critical');
    });
    it('is info for a clear patient', () => {
        expect(safetyBanner({ codeStatus: 'Full' }).items).toHaveLength(0);
    });
});

