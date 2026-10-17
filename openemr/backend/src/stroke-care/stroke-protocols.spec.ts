import {
  NIHSS_ITEMS,
  NIHSS_LOINC,
  STROKE_MODULES,
  STROKE_ORDER_SETS,
  STROKE_TIMING_TARGETS,
  defaultModulesForSetting,
  evaluateTreatmentCriteria,
  nihssSeverity,
  scoreNihss,
} from './stroke-protocols';
import type { TreatmentCriteriaInput } from './stroke-protocols';

/**
 * These tests pin the published rules the system documents against. If a
 * threshold or an item maximum changes, the protocol version must change too —
 * so a failing test here is a prompt to review the clinical configuration, not
 * to relax the assertion.
 */
describe('Stroke protocols', () => {
  const zeroItems = Object.fromEntries(
    NIHSS_ITEMS.map((item) => [item.key, 0]),
  );

  describe('NIHSS scoring', () => {
    it('scores an entirely normal examination as 0 (none)', () => {
      const result = scoreNihss(zeroItems);
      expect(result.total).toBe(0);
      expect(result.severity).toBe('none');
      expect(result.complete).toBe(true);
      expect(result.missing).toEqual([]);
      expect(result.invalid).toEqual([]);
    });

    it('scores the published maximum as 42 (severe)', () => {
      const worst = Object.fromEntries(
        NIHSS_ITEMS.map((item) => [item.key, item.max]),
      );
      const result = scoreNihss(worst);
      expect(result.total).toBe(42);
      expect(result.severity).toBe('severe');
      expect(result.complete).toBe(true);
    });

    it('reports missing items instead of treating them as normal', () => {
      const items: Record<string, number> = { ...zeroItems };
      delete items['5a'];
      const result = scoreNihss(items);
      expect(result.complete).toBe(false);
      expect(result.missing).toEqual(['5a']);
      // The remaining items still produce a best-known total.
      expect(result.total).toBe(0);
    });

    it('rejects out-of-range values rather than clamping them', () => {
      const result = scoreNihss({ ...zeroItems, '1a': 4, '3': -1 });
      expect(result.invalid).toEqual(['1a', '3']);
      expect(result.complete).toBe(false);
    });

    it('accepts numeric strings from form inputs', () => {
      const result = scoreNihss({ ...zeroItems, '5a': '3', '6a': '2' });
      expect(result.total).toBe(5);
      expect(result.severity).toBe('moderate');
    });

    it('records an allowed untestable item with a reason, never as zero', () => {
      const items: Record<string, number> = { ...zeroItems };
      delete items['5a'];
      const result = scoreNihss(items, { '5a': 'Left arm amputated' });
      expect(result.complete).toBe(true);
      expect(result.partial).toBe(true);
      expect(result.untestable).toEqual([
        { key: '5a', reason: 'Left arm amputated' },
      ]);
      expect(result.byItem['5a']).toBeUndefined();
      expect(result.total).toBe(0);
    });

    it('rejects an untestable declaration without a reason', () => {
      const items: Record<string, number> = { ...zeroItems };
      delete items['7'];
      const result = scoreNihss(items, { '7': true });
      expect(result.complete).toBe(false);
      expect(result.untestableWithoutReason).toEqual(['7']);
    });

    it('rejects untestable for items the scale does not allow', () => {
      const items: Record<string, number> = { ...zeroItems };
      delete items['1a'];
      const result = scoreNihss(items, { '1a': 'Not examinable' });
      expect(result.complete).toBe(false);
      expect(result.untestableNotAllowed).toEqual(['1a']);
    });

    it.each([
      [0, 'none'],
      [4, 'minor'],
      [5, 'moderate'],
      [15, 'moderate'],
      [16, 'moderate_severe'],
      [20, 'moderate_severe'],
      [21, 'severe'],
      [42, 'severe'],
    ])('maps a total of %i to %s', (total, severity) => {
      expect(nihssSeverity(total)).toBe(severity);
    });
  });

  describe('reperfusion criteria (advisory)', () => {
    const arrival = new Date('2026-05-01T10:00:00Z');
    const base: TreatmentCriteriaInput = {
      strokeType: 'ischemic',
      arrivalAt: arrival,
      now: arrival,
      ctExcludedHemorrhage: true,
      systolicBloodPressure: 150,
      diastolicBloodPressure: 90,
      glucose: 110,
      plateletCount: 220000,
      inr: 1.0,
      age: 67,
      anticoagulantUse: false,
      largeVesselOcclusion: true,
      imagingSelectionForLateWindow: true,
      preMorbidModifiedRankin: 0,
    };

    it('marks every documented criterion met inside the 4.5-hour window', () => {
      const result = evaluateTreatmentCriteria({
        ...base,
        lkwAt: new Date('2026-05-01T07:00:00Z'), // 180 minutes
      });
      expect(result.minutesFromLastKnownWell).toBe(180);
      expect(result.thrombolysis.withinWindow).toBe(true);
      expect(result.thrombolysis.unmetOrUnknown).toBe(0);
      expect(result.thrombectomy.withinWindow).toBe(true);
      expect(result.advisoryOnly).toBe(true);
      expect(result.clinicianReviewRequired).toBe(true);
    });

    it('closes the thrombolysis window beyond 270 minutes but not thrombectomy', () => {
      const result = evaluateTreatmentCriteria({
        ...base,
        lkwAt: new Date('2026-05-01T04:00:00Z'), // 360 minutes
      });
      expect(result.thrombolysis.withinWindow).toBe(false);
      expect(result.thrombectomy.withinWindow).toBe(true);
      const window = result.thrombolysis.criteria.find(
        (c) => c.key === 'time_window',
      );
      expect(window?.status).toBe('not_met');
    });

    it('returns unknown — never "normal" — when the CT result is missing', () => {
      const result = evaluateTreatmentCriteria({
        ...base,
        lkwAt: new Date('2026-05-01T09:00:00Z'),
        ctExcludedHemorrhage: null,
      });
      const ct = result.thrombolysis.criteria.find(
        (c) => c.key === 'ct_hemorrhage_excluded',
      );
      expect(ct?.status).toBe('unknown');
      expect(ct?.requiresClinicianReview).toBe(true);
      expect(result.thrombolysis.unmetOrUnknown).toBeGreaterThan(0);
    });

    it('does not invent a window when last known well is undocumented', () => {
      const result = evaluateTreatmentCriteria({ ...base, lkwAt: null });
      expect(result.minutesFromLastKnownWell).toBeNull();
      expect(result.thrombolysis.withinWindow).toBeNull();
      expect(result.thrombectomy.withinWindow).toBeNull();
    });

    it('flags a haemorrhage as not eligible for thrombolysis', () => {
      const result = evaluateTreatmentCriteria({
        ...base,
        strokeType: 'hemorrhagic',
        lkwAt: new Date('2026-05-01T09:00:00Z'),
      });
      const subtype = result.thrombolysis.criteria.find(
        (c) => c.key === 'ischemic_subtype',
      );
      expect(subtype?.status).toBe('not_met');
    });

    it('flags raised blood pressure for review', () => {
      const result = evaluateTreatmentCriteria({
        ...base,
        lkwAt: new Date('2026-05-01T09:00:00Z'),
        systolicBloodPressure: 190,
        diastolicBloodPressure: 115,
      });
      const bp = result.thrombolysis.criteria.find(
        (c) => c.key === 'blood_pressure',
      );
      expect(bp?.status).toBe('not_met');
    });
  });

  describe('LOINC mapping', () => {
    it('uses the verified panel and total codes', () => {
      expect(NIHSS_LOINC.panel.code).toBe('70182-1');
      expect(NIHSS_LOINC.panel.display).toBe('NIH Stroke Scale');
      expect(NIHSS_LOINC.total.code).toBe('72089-6');
    });

    it('maps all 15 scored fields to their verified item codes', () => {
      expect(Object.keys(NIHSS_LOINC.items)).toHaveLength(15);
      expect(NIHSS_LOINC.items['5a'].code).toBe('70190-4');
      expect(NIHSS_LOINC.items['5b'].code).toBe('70967-5');
      expect(NIHSS_LOINC.items['6a'].code).toBe('70191-2');
      expect(NIHSS_LOINC.items['6b'].code).toBe('70968-3');
      expect(NIHSS_LOINC.items['11'].code).toBe('70196-1');
    });
  });

  describe('catalogue integrity', () => {
    it('publishes timing targets that match the documented protocol', () => {
      expect(STROKE_TIMING_TARGETS.thrombolysisWindowMinutes).toBe(270);
      expect(STROKE_TIMING_TARGETS.thrombectomyWindowMinutes).toBe(1440);
      expect(STROKE_TIMING_TARGETS.doorToNeedleMinutes).toBe(60);
    });

    it('gives every order set a versioned protocol and explicit sign-off', () => {
      expect(STROKE_ORDER_SETS.length).toBeGreaterThan(0);
      for (const set of STROKE_ORDER_SETS) {
        expect(set.protocol.version).toMatch(/^\d+\.\d+\.\d+$/);
        expect(set.protocol.advisoryOnly).toBe(true);
        expect(set.items.length).toBeGreaterThan(0);
      }
      const acute = STROKE_ORDER_SETS.find(
        (s) => s.key === 'acute-ischemic-admission',
      );
      expect(
        acute?.items.some((i) => i.requiresExplicitDoseConfirmation === true),
      ).toBe(true);
    });

    it('enables the outpatient-only modules for an outpatient facility', () => {
      const enabled = defaultModulesForSetting('outpatient');
      expect(enabled).toContain('nihss');
      expect(enabled).toContain('follow-up');
      expect(enabled).not.toContain('activation');
      expect(enabled).not.toContain('reperfusion');
    });

    it('enables activation and reperfusion at a comprehensive centre', () => {
      const enabled = defaultModulesForSetting('comprehensive');
      expect(enabled).toEqual(
        expect.arrayContaining([
          'activation',
          'nihss',
          'reperfusion',
          'inpatient',
          'transfers',
        ]),
      );
      expect(STROKE_MODULES.length).toBeGreaterThanOrEqual(9);
    });
  });
});
