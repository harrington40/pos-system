import { Test } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { StrokeCareService } from './stroke-care.service';
import { validateFhirBundle } from './stroke-fhir';

/**
 * The service is where clinical safety lives: totals are recomputed, signatures
 * are mandatory, and a refusal must never reach the database. These tests use
 * a recording DataSource in the same style as the other OpenRx service tests.
 */
describe('StrokeCareService', () => {
  interface RecordedQuery {
    sql: string;
    params: unknown[];
  }

  function build(responder: (sql: string, params: unknown[]) => unknown) {
    const queries: RecordedQuery[] = [];
    const dataSource = {
      query<T = unknown>(sql: string, params: unknown[] = []): Promise<T> {
        queries.push({ sql, params });
        return Promise.resolve(responder(sql, params) as T);
      },
    };
    return { dataSource, queries };
  }

  async function service(dataSource: unknown): Promise<StrokeCareService> {
    const module = await Test.createTestingModule({
      providers: [
        StrokeCareService,
        { provide: getDataSourceToken(), useValue: dataSource },
      ],
    }).compile();
    return module.get(StrokeCareService);
  }

  const ACTIVATION = {
    id: 5,
    pid: 17,
    facility_id: 1,
    activation_code: 'SC-TEST',
    care_setting: 'acute',
    status: 'active',
    arrival_at: '2026-05-01T10:00:00',
    lkw_at: '2026-05-01T08:00:00',
    stroke_type: 'ischemic',
    nihss_total: 5,
    nihss_severity: 'moderate',
    fname: 'Test',
    lname: 'Patient',
    created_at: '2026-05-01T10:00:00',
  };

  /** Default responder for a fully-populated activation record. */
  function activationResponder(sql: string): unknown {
    if (sql.includes('FROM patient_data WHERE pid')) return [{ pid: 17 }];
    if (sql.includes('FROM stroke_activations a')) return [ACTIVATION];
    if (sql.includes('FROM stroke_assessments'))
      return [{ id: 7, total_score: 5, protocol_version: '1.0.0' }];
    if (sql.includes('FROM stroke_orders'))
      return [{ id: 9, order_set_key: 'acute-ischemic-admission' }];
    if (sql.includes('FROM stroke_treatment_decisions'))
      return [{ id: 3, decision_type: 'thrombolysis' }];
    if (sql.includes('FROM stroke_imaging_studies')) return [];
    if (sql.includes('FROM stroke_transfers')) return [];
    if (sql.includes('FROM stroke_care_tasks')) return [];
    if (sql.startsWith('INSERT')) return { affectedRows: 1, insertId: 1 };
    return { affectedRows: 1 };
  }

  it('creates every stroke table idempotently on startup', async () => {
    const { dataSource, queries } = build((sql) =>
      sql.includes('information_schema.COLUMNS')
        ? [{ COLUMN_NAME: 'present' }]
        : { affectedRows: 0 },
    );
    const svc = await service(dataSource);
    await svc.ensureSchema();
    const creates = queries.filter((q) =>
      q.sql.includes('CREATE TABLE IF NOT EXISTS stroke_'),
    );
    expect(creates).toHaveLength(29);
    expect(queries.some((q) => q.sql.includes('ALTER TABLE'))).toBe(false);
  });

  describe('createActivation', () => {
    it('rejects an unknown patient', async () => {
      const { dataSource } = build((sql) => {
        if (sql.includes('FROM patient_data')) return [];
        return { affectedRows: 1, insertId: 1 };
      });
      await expect(
        (await service(dataSource)).createActivation({ patientId: 999 }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('refuses an arrival time in the future', async () => {
      const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      const { dataSource } = build((sql) => {
        if (sql.includes('FROM patient_data')) return [{ pid: 17 }];
        return { affectedRows: 1, insertId: 1 };
      });
      await expect(
        (await service(dataSource)).createActivation({
          patientId: 17,
          arrivalAt: future,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('refuses a last-known-well later than arrival', async () => {
      const arrival = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const lkw = new Date(Date.now() - 60 * 1000).toISOString();
      const { dataSource } = build((sql) => {
        if (sql.includes('FROM patient_data')) return [{ pid: 17 }];
        return { affectedRows: 1, insertId: 1 };
      });
      await expect(
        (await service(dataSource)).createActivation({
          patientId: 17,
          arrivalAt: arrival,
          lkwAt: lkw,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('records the activation and starts the clock', async () => {
      const { dataSource, queries } = build(activationResponder);
      const svc = await service(dataSource);
      const result = await svc.createActivation(
        {
          patientId: 17,
          careSetting: 'acute',
          arrivalAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          strokeType: 'ischemic',
          initialNihssTotal: 5,
        },
        { id: 42, displayName: 'Dr Test' },
      );
      const insert = queries.find((q) =>
        q.sql.includes('INSERT INTO stroke_activations'),
      );
      expect(insert).toBeDefined();
      expect(insert?.params[0]).toBe(17);
      expect(insert?.params[3]).toMatch(/^SC-/);
      expect(result.activation.id).toBe(5);
      expect(
        queries.some((q) => q.sql.includes('INSERT INTO stroke_audit_events')),
      ).toBe(true);
    });
  });

  describe('addAssessment', () => {
    const completeItems = {
      '1a': 0,
      '1b': 0,
      '1c': 0,
      '2': 0,
      '3': 0,
      '4': 0,
      '5a': 3,
      '5b': 0,
      '6a': 2,
      '6b': 0,
      '7': 0,
      '8': 0,
      '9': 0,
      '10': 0,
      '11': 0,
    };

    it('refuses an unsigned assessment', async () => {
      const { dataSource } = build(activationResponder);
      await expect(
        (await service(dataSource)).addAssessment(5, {
          items: completeItems,
          signatureConfirmed: false,
          signedByName: 'Dr Test',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('refuses an incomplete assessment', async () => {
      const items = { ...completeItems } as Record<string, number>;
      delete items['9'];
      const { dataSource } = build(activationResponder);
      await expect(
        (await service(dataSource)).addAssessment(5, {
          items,
          signatureConfirmed: true,
          signedByName: 'Dr Test',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('recomputes the total and stores the signer', async () => {
      const { dataSource, queries } = build(activationResponder);
      const svc = await service(dataSource);
      await svc.addAssessment(
        5,
        {
          items: completeItems,
          signatureConfirmed: true,
          signedByName: 'Dr Test',
          notes: 'Baseline',
        },
        { id: 42, displayName: 'Dr Test' },
      );
      const insert = queries.find((q) =>
        q.sql.includes('INSERT INTO stroke_assessments'),
      );
      expect(insert).toBeDefined();
      expect(insert?.params[3]).toBe(17);
      expect(insert?.params[6]).toBe(5);
      expect(insert?.params[7]).toBe('moderate');
      expect(insert?.params[12]).toBe('Dr Test');
      const update = queries.find(
        (q) =>
          q.sql.includes('UPDATE stroke_activations') &&
          q.sql.includes('nihss_total'),
      );
      expect(update?.params).toEqual([5, 'moderate', 5]);
    });
  });

  describe('addOrder', () => {
    it('requires explicit clinician and contraindication sign-off', async () => {
      const { dataSource } = build(activationResponder);
      await expect(
        (await service(dataSource)).addOrder(5, {
          orderSetKey: 'acute-ischemic-admission',
          clinicianAcknowledged: true,
          contraindicationsReviewed: false,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects an order set that is not in the catalogue', async () => {
      const { dataSource } = build(activationResponder);
      await expect(
        (await service(dataSource)).addOrder(5, {
          orderSetKey: 'made-up-set',
          clinicianAcknowledged: true,
          contraindicationsReviewed: true,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('stores the versioned order set with its reviewer', async () => {
      const { dataSource, queries } = build(activationResponder);
      await (
        await service(dataSource)
      ).addOrder(
        5,
        {
          orderSetKey: 'acute-ischemic-admission',
          clinicianAcknowledged: true,
          contraindicationsReviewed: true,
        },
        { id: 42, displayName: 'Dr Test' },
      );
      const insert = queries.find((q) =>
        q.sql.includes('INSERT INTO stroke_orders'),
      );
      expect(insert).toBeDefined();
      expect(insert?.params[2]).toBe('acute-ischemic-admission');
      expect(String(insert?.params[6])).toContain('ct-head-stat');
      expect(insert?.params[8]).toBe('Dr Test');
    });
  });

  describe('recordDecision', () => {
    it('requires a reason when treatment is withheld', async () => {
      const { dataSource } = build(activationResponder);
      await expect(
        (await service(dataSource)).recordDecision(5, {
          decisionType: 'thrombolysis',
          decision: 'withheld',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('stores the clinician decision with the advisory checklist', async () => {
      const { dataSource, queries } = build(activationResponder);
      await (
        await service(dataSource)
      ).recordDecision(
        5,
        {
          decisionType: 'thrombolysis',
          decision: 'given',
          systolicBloodPressure: 150,
          diastolicBloodPressure: 90,
          glucose: 110,
          plateletCount: 200000,
          inr: 1.0,
          age: 70,
          ctExcludedHemorrhage: true,
          anticoagulantUse: false,
        },
        { id: 42, displayName: 'Dr Test' },
      );
      const insert = queries.find((q) =>
        q.sql.includes('INSERT INTO stroke_treatment_decisions'),
      );
      expect(insert).toBeDefined();
      expect(insert?.params[2]).toBe('thrombolysis');
      expect(insert?.params[3]).toBe('given');
      const criteria = JSON.parse(String(insert?.params[5])) as {
        advisoryOnly: boolean;
        clinicianReviewRequired: boolean;
      };
      expect(criteria.advisoryOnly).toBe(true);
      expect(criteria.clinicianReviewRequired).toBe(true);
      const statusUpdate = queries.find(
        (q) =>
          q.sql.includes('UPDATE stroke_activations') &&
          q.sql.includes('tpa_status'),
      );
      expect(statusUpdate?.params).toEqual(['given', 5]);
    });
  });

  describe('facility modules', () => {
    it('rejects an unknown module key', async () => {
      const { dataSource } = build(activationResponder);
      await expect(
        (await service(dataSource)).setFacilityModules(1, {
          modules: [{ key: 'not-a-module', enabled: true }],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('upserts each known module and audits the change', async () => {
      const stored = new Map<string, number>();
      const { dataSource, queries } = build((sql, params) => {
        if (sql.includes('INSERT INTO stroke_facility_modules')) {
          stored.set(String(params[1]), Number(params[2]));
          return { affectedRows: 1 };
        }
        if (sql.includes('FROM stroke_facility_modules')) {
          return [...stored.entries()].map(([module_key, enabled]) => ({
            module_key,
            enabled,
          }));
        }
        return { affectedRows: 1 };
      });
      const result = await (
        await service(dataSource)
      ).setFacilityModules(
        1,
        {
          modules: [
            { key: 'activation', enabled: true },
            { key: 'reperfusion', enabled: false },
          ],
        },
        { id: 42 },
      );
      expect(
        queries.filter((q) =>
          q.sql.includes('INSERT INTO stroke_facility_modules'),
        ),
      ).toHaveLength(2);
      expect(
        queries.some((q) => q.sql.includes('INSERT INTO stroke_audit_events')),
      ).toBe(true);
      const reperfusion = result.modules.find((m) => m.key === 'reperfusion');
      expect(reperfusion?.enabled).toBe(false);
    });
  });

  describe('getQuality', () => {
    it('reports null percentages when no patient was treated', async () => {
      const { dataSource } = build(() => [
        {
          activations: 0,
          completed: 0,
          thrombolysis_given: 0,
          thrombectomy_given: 0,
          avg_door_to_ct_minutes: null,
          avg_door_to_needle_minutes: null,
          ct_within_target: 0,
          needle_within_target: 0,
        },
      ]);
      const result = await (await service(dataSource)).getQuality(30);
      expect(result.ctWithinTargetPercent).toBeNull();
      expect(result.needleWithinTargetPercent).toBeNull();
      expect(result.averageDoorToNeedleMinutes).toBeNull();
    });

    it('computes door-to-needle performance against the 60-minute target', async () => {
      const { dataSource } = build(() => [
        {
          activations: 4,
          completed: 2,
          thrombolysis_given: 2,
          thrombectomy_given: 1,
          avg_door_to_ct_minutes: '18.5',
          avg_door_to_needle_minutes: '52.0',
          ct_within_target: 3,
          needle_within_target: 1,
        },
      ]);
      const result = await (await service(dataSource)).getQuality(30);
      expect(result.ctWithinTargetPercent).toBe(75);
      expect(result.needleWithinTargetPercent).toBe(50);
      expect(result.averageDoorToNeedleMinutes).toBe(52);
    });
  });

  describe('NIHSS draft / finalize / amend', () => {
    const ITEMS = {
      '1a': 1,
      '1b': 0,
      '1c': 0,
      '2': 0,
      '3': 0,
      '4': 0,
      '5a': 2,
      '5b': 0,
      '6a': 0,
      '6b': 0,
      '7': 0,
      '8': 0,
      '9': 0,
      '10': 0,
      '11': 0,
    };

    function assessmentRow(overrides: Record<string, unknown> = {}) {
      return {
        id: 7,
        activation_id: 5,
        pid: 17,
        status: 'finalized',
        version: 2,
        items_json: JSON.stringify(ITEMS),
        untestable_json: JSON.stringify({}),
        total_score: 3,
        severity: 'minor',
        assessed_at: '2026-05-01T10:00:00',
        protocol_key: 'openrx.nihss',
        protocol_version: '1.0.0',
        signed_by_name: 'Dr Test',
        finalized_by_name: 'Dr Test',
        ...overrides,
      };
    }

    it('saves a draft without a signature and without updating the activation score', async () => {
      const { dataSource, queries } = build((sql) => {
        if (sql.includes('FROM patient_data WHERE pid')) return [{ pid: 17 }];
        if (sql.includes('FROM stroke_activations a')) return [ACTIVATION];
        if (sql.includes('FROM stroke_assessments')) return [assessmentRow()];
        if (sql.startsWith('INSERT')) return { affectedRows: 1, insertId: 7 };
        return { affectedRows: 1 };
      });
      await (
        await service(dataSource)
      ).addAssessment(
        5,
        { items: ITEMS, finalize: false },
        { id: 42, displayName: 'Dr Test' },
      );
      const insert = queries.find((q) =>
        q.sql.includes('INSERT INTO stroke_assessments'),
      );
      expect(insert?.params[8]).toBe('draft');
      expect(
        queries.some(
          (q) =>
            q.sql.includes('UPDATE stroke_activations') &&
            q.sql.includes('nihss_total'),
        ),
      ).toBe(false);
    });

    it('records an untestable item with its reason and excludes it from the total', async () => {
      const items = { ...ITEMS } as Record<string, number>;
      delete items['5a'];
      const { dataSource, queries } = build((sql) => {
        if (sql.includes('FROM patient_data WHERE pid')) return [{ pid: 17 }];
        if (sql.includes('FROM stroke_activations a')) return [ACTIVATION];
        if (sql.includes('FROM stroke_assessments')) return [assessmentRow()];
        if (sql.startsWith('INSERT')) return { affectedRows: 1, insertId: 7 };
        return { affectedRows: 1 };
      });
      await (
        await service(dataSource)
      ).addAssessment(5, {
        items,
        untestable: { '5a': 'Left arm amputated' },
        signedByName: 'Dr Test',
        signatureConfirmed: true,
      });
      const insert = queries.find((q) =>
        q.sql.includes('INSERT INTO stroke_assessments'),
      );
      expect(String(insert?.params[5])).toContain('Left arm amputated');
      expect(insert?.params[6]).toBe(1);
    });

    it('refuses to edit a finalized assessment', async () => {
      const { dataSource } = build((sql) => {
        if (sql.includes('FROM stroke_assessments')) return [assessmentRow()];
        return { affectedRows: 1 };
      });
      await expect(
        (await service(dataSource)).updateDraftAssessment(7, { items: ITEMS }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('creates a signed amendment as a new version and leaves the original intact', async () => {
      const { dataSource, queries } = build((sql) => {
        if (sql.includes('FROM patient_data WHERE pid')) return [{ pid: 17 }];
        if (sql.includes('FROM stroke_activations a')) return [ACTIVATION];
        if (sql.includes('FROM stroke_assessments'))
          return [assessmentRow({ status: 'finalized', version: 2 })];
        if (sql.startsWith('INSERT')) return { affectedRows: 1, insertId: 8 };
        return { affectedRows: 1 };
      });
      await (
        await service(dataSource)
      ).amendAssessment(7, {
        items: { ...ITEMS, '1a': 2 },
        untestable: {},
        amendmentReason: 'Corrected LOC score after review',
        signedByName: 'Dr Test',
        signatureConfirmed: true,
      });
      const insert = queries.find(
        (q) =>
          q.sql.includes('INSERT INTO stroke_assessments') &&
          q.sql.includes('amends_id'),
      );
      expect(insert?.params[6]).toBe(3);
      expect(insert?.params[7]).toBe(7);
      expect(insert?.params[8]).toBe('Corrected LOC score after review');
      expect(
        queries.filter((q) => q.sql.includes('UPDATE stroke_assessments')),
      ).toHaveLength(0);
    });

    it('normalizes every item into a LOINC-coded assessment item row', async () => {
      const items = { ...ITEMS } as Record<string, number>;
      delete items['5a'];
      const { dataSource, queries } = build((sql) => {
        if (sql.includes('FROM patient_data WHERE pid')) return [{ pid: 17 }];
        if (sql.includes('FROM stroke_activations a')) return [ACTIVATION];
        if (sql.includes('FROM stroke_assessments')) return [assessmentRow()];
        if (sql.startsWith('INSERT')) return { affectedRows: 1, insertId: 7 };
        return { affectedRows: 1 };
      });
      await (
        await service(dataSource)
      ).addAssessment(5, {
        items,
        untestable: { '5a': 'Left arm amputated' },
        signedByName: 'Dr Test',
        signatureConfirmed: true,
      });
      const insert = queries.find((query) =>
        query.sql.includes('INSERT INTO stroke_assessment_items'),
      );
      expect(insert).toBeDefined();
      expect(insert?.params).toHaveLength(15 * 10);
      expect(insert?.params).toContain('70967-5');
      expect(insert?.params).toContain('Left arm amputated');
      expect(insert?.params).toContain('not-performed');
    });

    it('only lets the draft author or an administrator edit a draft', async () => {
      const draft = assessmentRow({ status: 'draft', assessed_by: 42 });
      const { dataSource, queries } = build((sql) => {
        if (sql.includes('FROM stroke_assessments')) return [draft];
        return { affectedRows: 1 };
      });
      await expect(
        (await service(dataSource)).updateDraftAssessment(
          7,
          { items: ITEMS },
          { id: 99, role: 'physician' },
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(
        queries.some((query) =>
          query.sql.includes('UPDATE stroke_assessments'),
        ),
      ).toBe(false);
    });

    it('returns paginated patient-level NIHSS history', async () => {
      const { dataSource, queries } = build((sql) => {
        if (sql.includes('FROM patient_data WHERE pid')) return [{ pid: 17 }];
        if (sql.includes('COUNT(*) AS total FROM stroke_assessments'))
          return [{ total: 12 }];
        if (sql.includes('FROM stroke_assessments a'))
          return [
            {
              id: 7,
              activation_id: 5,
              total_score: 3,
              severity: 'minor',
              status: 'finalized',
              version: 1,
              assessed_at: '2026-05-01T10:00:00',
            },
          ];
        return [];
      });
      const history = await (
        await service(dataSource)
      ).listPatientAssessments(17, 2, 10);
      expect(history.total).toBe(12);
      expect(history.page).toBe(2);
      expect(history.pageSize).toBe(10);
      expect(history.data).toHaveLength(1);
      const sql = queries.map((query) => query.sql).join('\n');
      expect(sql).toContain('LIMIT 10 OFFSET 10');
    });
  });

  describe('FHIR export', () => {
    it('exports the verified panel, all item codes and total, with untestable absent', async () => {
      const items = {
        '1a': 0,
        '1b': 0,
        '1c': 0,
        '2': 0,
        '3': 0,
        '4': 0,
        '5b': 0,
        '6a': 0,
        '6b': 0,
        '7': 0,
        '8': 0,
        '9': 0,
        '10': 0,
        '11': 0,
      };
      const { dataSource } = build((sql) => {
        if (sql.includes('FROM stroke_assessments'))
          return [
            {
              id: 7,
              activation_id: 5,
              pid: 17,
              status: 'finalized',
              version: 1,
              items_json: JSON.stringify(items),
              untestable_json: JSON.stringify({
                '5a': 'Left arm amputated',
              }),
              total_score: 0,
              severity: 'none',
              assessed_at: '2026-05-01T10:00:00',
              protocol_key: 'openrx.nihss',
              protocol_version: '1.0.0',
            },
          ];
        return { affectedRows: 1 };
      });
      const bundle = await (
        await service(dataSource)
      ).toAssessmentFhirBundle(7);
      expect(bundle.entry).toHaveLength(18); // panel + 15 items + total + provenance
      interface FhirObservation {
        code?: { coding?: Array<{ code?: string }> };
        hasMember?: unknown[];
        valueQuantity?: { value?: number };
        note?: Array<{ text?: string }>;
        dataAbsentReason?: { coding?: Array<{ code?: string }> };
      }
      const resources = (
        bundle.entry as Array<{ resource: FhirObservation }>
      ).map((entry) => entry.resource);
      const panel = resources.find(
        (resource) => resource.code?.coding?.[0]?.code === '70182-1',
      );
      const total = resources.find(
        (resource) => resource.code?.coding?.[0]?.code === '72089-6',
      );
      const leftArm = resources.find(
        (resource) => resource.code?.coding?.[0]?.code === '70190-4',
      );
      expect(panel?.hasMember).toHaveLength(15);
      expect(total?.valueQuantity?.value).toBe(0);
      expect(total?.note?.[0]?.text).toContain('Partial total');
      expect(leftArm?.dataAbsentReason?.coding?.[0]?.code).toBe(
        'not-performed',
      );
      expect(leftArm?.valueQuantity).toBeUndefined();
    });
  });

  describe('comprehensive FHIR R4 export', () => {
    it('emits all supported clinical resource types with valid references', async () => {
      const { dataSource } = build((sql) => {
        if (sql.includes('FROM stroke_activations a')) return [ACTIVATION];
        if (sql.includes('FROM patient_data WHERE pid')) return [{ pid: 17 }];
        if (sql.includes('FROM stroke_assessments'))
          return [
            {
              id: 7,
              activation_id: 5,
              pid: 17,
              status: 'finalized',
              version: 1,
              items_json: JSON.stringify({}),
              untestable_json: JSON.stringify({}),
              total_score: 5,
              severity: 'moderate',
              assessed_at: '2026-05-01T10:00:00',
              finalized_at: '2026-05-01T10:01:00',
              finalized_by_name: 'Dr Test',
              protocol_key: 'openrx.nihss',
              protocol_version: '1.0.0',
            },
          ];
        if (sql.includes('FROM stroke_orders'))
          return [
            {
              id: 9,
              order_set_label: 'Acute ischemic stroke',
              status: 'acknowledged',
              acknowledged_at: '2026-05-01T10:00:00',
              ordered_by_name: 'Dr Test',
              notes: null,
            },
          ];
        if (sql.includes('FROM stroke_treatment_decisions')) return [];
        if (sql.includes('FROM stroke_imaging_studies'))
          return [
            {
              id: 3,
              imaging_id: 12,
              modality: 'ct',
              dicom_study_uid: '1.2.3.4',
              orthanc_study_id: null,
              performed_at: '2026-05-01T10:05:00',
              findings: 'No haemorrhage',
              interpretation_status: 'reviewed',
              study_description: 'Noncontrast head CT',
              accession_number: 'ACC-1',
              series_count: 1,
              instance_count: 20,
              study_date: '2026-05-01T10:05:00',
            },
          ];
        if (sql.includes('FROM stroke_transfers'))
          return [
            {
              id: 4,
              reason: 'Thrombectomy centre',
              status: 'requested',
              priority: 'emergent',
              clinical_summary: 'NIHSS 5',
              created_at: '2026-05-01T10:10:00',
            },
          ];
        if (sql.includes('FROM stroke_care_tasks')) return [];
        if (sql.includes('FROM stroke_encounter_profiles')) return [];
        if (sql.includes('FROM stroke_treatment_events'))
          return [
            {
              id: 6,
              activation_id: 5,
              pid: 17,
              event_type: 'thrombolysis',
              status: 'given',
              medication: 'Alteplase',
              dose: '0.9 mg/kg',
              route: 'IV',
              occurred_at: '2026-05-01T10:20:00',
              time_quality: 'exact',
              recorded_by_name: 'Dr Test',
              created_at: '2026-05-01T10:21:00',
            },
          ];
        if (sql.includes('FROM stroke_care_plans'))
          return [
            {
              id: 2,
              plan_type: 'multidisciplinary',
              summary: 'Stroke unit plan',
              goals_json: '["Mobilise with assistance"]',
              status: 'active',
              created_at: '2026-05-01T10:00:00',
            },
          ];
        if (sql.includes('FROM stroke_radiology_reports'))
          return [
            {
              id: 8,
              stroke_imaging_id: 3,
              report_text: 'No acute haemorrhage.',
              impression: 'No haemorrhage',
              status: 'final',
              reported_by_name: 'Dr Radiologist',
              reported_at: '2026-05-01T10:30:00',
            },
          ];
        if (sql.includes('INSERT INTO stroke_audit_events'))
          return { affectedRows: 1 };
        return [];
      });
      const bundle = await (await service(dataSource)).toFhirBundle(5);
      const types = new Set(
        (bundle.entry ?? []).map((entry) => entry.resource?.resourceType),
      );
      for (const expected of [
        'Patient',
        'Encounter',
        'Observation',
        'Condition',
        'DiagnosticReport',
        'ImagingStudy',
        'ServiceRequest',
        'MedicationRequest',
        'CarePlan',
        'Procedure',
        'DocumentReference',
        'Provenance',
      ]) {
        expect(types.has(expected)).toBe(true);
      }
      const validation = validateFhirBundle(bundle);
      expect(validation.valid).toBe(true);
      expect(validation.checkedReferences).toBeGreaterThan(5);
    });
  });

  describe('Module C: milestones, pathways, closure and notifications', () => {
    it('never invents a time for an unknown milestone', async () => {
      const { dataSource, queries } = build((sql) => {
        if (sql.includes('FROM patient_data WHERE pid')) return [{ pid: 17 }];
        if (sql.includes('FROM stroke_activations a')) return [ACTIVATION];
        if (sql.includes('FROM stroke_milestones')) return [];
        if (sql.includes('FROM stroke_encounter_profiles')) return [];
        if (sql.includes('FROM stroke_assessments')) return [];
        if (sql.includes('FROM stroke_imaging_studies')) return [];
        if (sql.includes('FROM stroke_treatment_decisions')) return [];
        if (sql.includes('FROM stroke_treatment_events')) return [];
        if (sql.includes('FROM stroke_transfers')) return [];
        return { affectedRows: 1 };
      });
      await (
        await service(dataSource)
      ).recordMilestone(5, {
        milestoneKey: 'imaging_interpretation',
        timeQuality: 'unknown',
      });
      const insert = queries.find((q) =>
        q.sql.includes('INSERT INTO stroke_milestones'),
      );
      expect(insert?.params[2]).toBeNull();
      expect(insert?.params[3]).toBe('unknown');
    });

    it('rejects a timestamp attached to an unknown milestone', async () => {
      const { dataSource } = build((sql) => {
        if (sql.includes('FROM patient_data WHERE pid')) return [{ pid: 17 }];
        if (sql.includes('FROM stroke_activations a')) return [ACTIVATION];
        return { affectedRows: 1 };
      });
      await expect(
        (await service(dataSource)).recordMilestone(5, {
          milestoneKey: 'imaging_interpretation',
          timeQuality: 'unknown',
          occurredAt: '2026-05-01T10:00:00Z',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('blocks reperfusion documentation on a haemorrhagic pathway', async () => {
      const haemorrhage = { ...ACTIVATION, stroke_type: 'hemorrhagic' };
      const { dataSource } = build((sql) => {
        if (sql.includes('FROM patient_data WHERE pid')) return [{ pid: 17 }];
        if (sql.includes('FROM stroke_activations a')) return [haemorrhage];
        return { affectedRows: 1 };
      });
      await expect(
        (await service(dataSource)).recordTreatmentEvent(5, {
          eventType: 'thrombolytic_administration',
          status: 'given',
          occurredAt: '2026-05-01T10:30:00Z',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('requires an administration time when a treatment is recorded as given', async () => {
      const { dataSource } = build((sql) => {
        if (sql.includes('FROM patient_data WHERE pid')) return [{ pid: 17 }];
        if (sql.includes('FROM stroke_activations a')) return [ACTIVATION];
        return { affectedRows: 1 };
      });
      await expect(
        (await service(dataSource)).recordTreatmentEvent(5, {
          eventType: 'thrombolytic_administration',
          status: 'given',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('offers only non-reperfusion events on a haemorrhagic pathway', async () => {
      const haemorrhage = { ...ACTIVATION, stroke_type: 'hemorrhagic' };
      const { dataSource } = build((sql) => {
        if (sql.includes('FROM patient_data WHERE pid')) return [{ pid: 17 }];
        if (sql.includes('FROM stroke_activations a')) return [haemorrhage];
        return { affectedRows: 1 };
      });
      const result = await (await service(dataSource)).getPathway(5);
      expect(result.pathway).toBe('hemorrhagic');
      expect(result.allowedEventTypes).toContain('bp_management');
      expect(result.allowedEventTypes).not.toContain(
        'thrombolytic_administration',
      );
    });

    it('refuses to close an alert without an outcome', async () => {
      const { dataSource } = build((sql) => {
        if (sql.includes('FROM patient_data WHERE pid')) return [{ pid: 17 }];
        if (sql.includes('FROM stroke_activations a')) return [ACTIVATION];
        return { affectedRows: 1 };
      });
      await expect(
        (await service(dataSource)).closeActivation(5, {}),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('returns an empty emergency dashboard when no alert is active', async () => {
      const { dataSource } = build(() => []);
      const result = await (await service(dataSource)).getEmergencyDashboard();
      expect(result.alerts).toEqual([]);
      expect(result.summary.activeAlerts).toBe(0);
    });
  });

  describe('encounter profile', () => {
    it('combines the stroke profile with existing allergies, medications and history', async () => {
      const { dataSource } = build((sql) => {
        if (sql.includes('FROM patient_data WHERE pid')) return [{ pid: 17 }];
        if (sql.includes('FROM stroke_activations a')) return [ACTIVATION];
        if (sql.includes('FROM stroke_encounter_profiles')) return [];
        if (sql.includes('FROM lists')) return [{ id: 1, title: 'Penicillin' }];
        if (sql.includes('FROM prescriptions'))
          return [{ id: 2, drug: 'Aspirin' }];
        if (sql.includes('FROM stroke_activations')) return [];
        return { affectedRows: 1 };
      });
      const result = await (await service(dataSource)).getEncounterProfile(5);
      expect(result.allergies[0].title).toBe('Penicillin');
      expect(result.activeMedications[0].drug).toBe('Aspirin');
      expect(result.profile).toBeNull();
      expect(result.priorStrokeEncounters).toEqual([]);
    });

    it('rejects an attending provider that does not exist', async () => {
      const { dataSource } = build((sql) => {
        if (sql.includes('FROM patient_data WHERE pid')) return [{ pid: 17 }];
        if (sql.includes('FROM stroke_activations a')) return [ACTIVATION];
        if (sql.includes('FROM users')) return [];
        return { affectedRows: 1 };
      });
      await expect(
        (await service(dataSource)).upsertEncounterProfile(5, {
          attendingProviderId: 999,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('modules D–H safety and interoperability', () => {
    function patientResponder(sql: string): unknown {
      if (sql.includes('FROM stroke_activations a')) return [ACTIVATION];
      if (sql.includes('FROM patient_data')) return [{ pid: 17 }];
      if (sql.startsWith('INSERT')) return { affectedRows: 1, insertId: 44 };
      return [];
    }

    it('rejects an mRS score outside 0–6 and does not write it', async () => {
      const { dataSource, queries } = build(patientResponder);
      await expect(
        (await service(dataSource)).addFunctionalAssessment(17, {
          instrument: 'mrs',
          score: 7,
          assessedAt: '2026-05-01T10:00:00Z',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(
        queries.some((q) => q.sql.includes('stroke_functional_assessments')),
      ).toBe(false);
    });

    it('rejects a Barthel score that is not a multiple of five', async () => {
      const { dataSource } = build(patientResponder);
      await expect(
        (await service(dataSource)).addFunctionalAssessment(17, {
          instrument: 'barthel',
          score: 42,
          assessedAt: '2026-05-01T10:00:00Z',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('stores a clinician-entered functional score without deriving it', async () => {
      const { dataSource, queries } = build((sql) => {
        if (sql.includes('FROM stroke_functional_assessments'))
          return [
            {
              id: 44,
              pid: 17,
              instrument: 'mrs',
              score: 3,
              assessed_at: '2026-05-01T10:00:00',
            },
          ];
        return patientResponder(sql);
      });
      const result = await (
        await service(dataSource)
      ).addFunctionalAssessment(17, {
        instrument: 'mrs',
        score: 3,
        assessedAt: '2026-05-01T10:00:00Z',
        assessedByName: 'Dr Test',
      });
      expect(result.score).toBe(3);
      const insert = queries.find((q) =>
        q.sql.includes('INSERT INTO stroke_functional_assessments'),
      );
      expect(insert?.params).toContain(3);
    });

    it('rejects a blood pressure where systolic is not above diastolic', async () => {
      const { dataSource } = build(patientResponder);
      await expect(
        (await service(dataSource)).addBpReading(17, {
          systolic: 80,
          diastolic: 120,
          measuredAt: '2026-05-01T10:00:00Z',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('requires clinician confirmation when the DICOM PatientID differs', async () => {
      const { dataSource } = build((sql) => {
        if (sql.includes('FROM stroke_activations a')) return [ACTIVATION];
        if (sql.includes('FROM patient_data'))
          return [{ pid: 17, pubpid: 'MRN-17' }];
        return { affectedRows: 1, insertId: 90 };
      });
      await expect(
        (await service(dataSource)).linkImaging(5, {
          modality: 'ct',
          dicomStudyUid: '1.2.3',
          dicomPatientId: 'OTHER-PATIENT',
          interpretationStatus: 'performed',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('builds a FHIR transfer bundle with priority and transport context', async () => {
      const { dataSource, queries } = build((sql) => {
        if (sql.includes('FROM stroke_transfers'))
          return [
            {
              id: 8,
              activation_id: 5,
              pid: 17,
              reason: 'Thrombectomy capable centre',
              status: 'accepted',
              transfer_type: 'inpatient_stroke_unit',
              priority: 'emergent',
              clinical_summary: 'LKW 08:00, NIHSS 12',
              referring_clinician_name: 'Dr Sender',
              accepting_clinician_name: 'Dr Receiver',
              transport_status: 'en_route',
              to_facility_id: 2,
              created_at: '2026-05-01T10:00:00',
            },
          ];
        if (sql.includes('FROM stroke_activations a')) return [ACTIVATION];
        if (sql.includes('FROM patient_data'))
          return [
            {
              pid: 17,
              fname: 'Test',
              lname: 'Patient',
              DOB: '1950-01-01',
              sex: 'F',
            },
          ];
        return { affectedRows: 1 };
      });
      const bundle = await (
        await service(dataSource)
      ).getTransferSummaryFhir(8);
      const serviceRequest = bundle.entry.find(
        (entry) => entry.resource.resourceType === 'ServiceRequest',
      )?.resource as {
        priority: string;
        extension: Array<{ url: string }>;
      };
      expect(serviceRequest.priority).toBe('stat');
      expect(
        serviceRequest.extension.some((item) =>
          item.url.endsWith('transport-status'),
        ),
      ).toBe(true);
      expect(
        queries.some(
          (q) =>
            q.sql.includes('stroke_audit_events') &&
            q.params.includes('fhir_exported'),
        ),
      ).toBe(true);
    });
  });

  describe('facility access, alerting and transfer regression', () => {
    it('denies a facility outside the clinician assignment', async () => {
      const { dataSource } = build((sql) => {
        if (sql.includes('FROM stroke_facility_users'))
          return [{ facility_id: 1 }];
        return { affectedRows: 1 };
      });
      await expect(
        (await service(dataSource)).assertFacilityAccess(
          { id: 42, role: 'physician' },
          2,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('allows an assigned facility and preserves unassigned legacy access', async () => {
      const assigned = build((sql) => {
        if (sql.includes('FROM stroke_facility_users'))
          return [{ facility_id: 1 }];
        return { affectedRows: 1 };
      });
      await expect(
        (await service(assigned.dataSource)).assertFacilityAccess(
          { id: 42, role: 'physician' },
          1,
        ),
      ).resolves.toBeUndefined();

      const unassigned = build(() => []);
      await expect(
        (await service(unassigned.dataSource)).assertFacilityAccess(
          { id: 43, role: 'nurse' },
          9,
        ),
      ).resolves.toBeUndefined();
    });

    it('lets an administrator bypass facility assignments', async () => {
      const { dataSource, queries } = build(() => []);
      await (
        await service(dataSource)
      ).assertFacilityAccess({ id: 1, role: 'admin' }, 999);
      expect(
        queries.some((query) =>
          query.sql.includes('FROM stroke_facility_users'),
        ),
      ).toBe(false);
    });

    it('acknowledges a stroke-team alert and its notifications', async () => {
      const { dataSource, queries } = build((sql) => {
        if (sql.includes('FROM stroke_alert_team t'))
          return [{ id: 3, user_id: 42, pid: 17 }];
        if (sql.includes('FROM stroke_alert_team')) return [];
        return { affectedRows: 1 };
      });
      await (
        await service(dataSource)
      ).acknowledgeTeamMember(5, { id: 42, role: 'physician' });
      expect(
        queries.some(
          (query) =>
            query.sql.includes('UPDATE stroke_alert_team') &&
            query.params.includes(42),
        ),
      ).toBe(true);
      expect(
        queries.some(
          (query) =>
            query.sql.includes('UPDATE stroke_notifications') &&
            query.params.includes(5),
        ),
      ).toBe(true);
      expect(
        queries.some(
          (query) =>
            query.sql.includes('stroke_audit_events') &&
            query.params.includes('stroke_team'),
        ),
      ).toBe(true);
    });

    it('records requested transfers with priority and structured summary', async () => {
      const { dataSource, queries } = build((sql) => {
        if (sql.includes('FROM stroke_activations a')) return [ACTIVATION];
        if (sql.includes('FROM stroke_transfers'))
          return [
            {
              id: 12,
              activation_id: 5,
              pid: 17,
              from_facility_id: 1,
              to_facility_id: 2,
              reason: 'Thrombectomy',
              status: 'requested',
              accepted_by_name: null,
              transferred_at: null,
              priority: 'emergent',
              clinical_summary: 'NIHSS 12',
              created_at: '2026-05-01T10:00:00',
            },
          ];
        return { affectedRows: 1, insertId: 12 };
      });
      const transfer = await (
        await service(dataSource)
      ).addTransfer(
        5,
        {
          toFacilityId: 2,
          reason: 'Thrombectomy',
          transferType: 'inpatient_stroke_unit',
          priority: 'emergent',
          clinicalSummary: 'NIHSS 12',
          transportStatus: 'arranged',
        },
        { id: 42, role: 'physician' },
      );
      expect(transfer.id).toBe(12);
      const insert = queries.find((query) =>
        query.sql.includes('INSERT INTO stroke_transfers'),
      );
      expect(insert?.params).toContain('emergent');
      expect(insert?.params).toContain('NIHSS 12');
      expect(insert?.params).toContain('inpatient_stroke_unit');
    });

    it('refuses a transfer to the current facility', async () => {
      const { dataSource, queries } = build((sql) => {
        if (sql.includes('FROM stroke_activations a')) return [ACTIVATION];
        return { affectedRows: 1 };
      });
      await expect(
        (await service(dataSource)).addTransfer(5, { toFacilityId: 1 }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(
        queries.some((query) =>
          query.sql.includes('INSERT INTO stroke_transfers'),
        ),
      ).toBe(false);
    });

    it('tracks transfer acceptance and arrival without rewriting history', async () => {
      const { dataSource, queries } = build((sql) => {
        if (sql.includes('FROM stroke_transfers'))
          return [
            {
              id: 12,
              activation_id: 5,
              pid: 17,
              status: 'accepted',
              accepted_at: '2026-05-01T10:05:00',
              created_at: '2026-05-01T10:00:00',
            },
          ];
        return { affectedRows: 1 };
      });
      await (
        await service(dataSource)
      ).updateTransfer(
        12,
        {
          status: 'accepted',
          acceptedByName: 'Dr Receiving',
          transportStatus: 'en_route',
          arrivalConfirmedAt: '2026-05-01T11:00:00',
        },
        { id: 42, role: 'physician' },
      );
      const update = queries.find((query) =>
        query.sql.includes('UPDATE stroke_transfers'),
      );
      expect(update?.sql).toContain('accepted_at = COALESCE');
      expect(update?.sql).toContain('arrival_confirmed_at');
      expect(update?.params).toContain('accepted');
    });

    it('requires a timestamp when a milestone is not unknown', async () => {
      const { dataSource } = build((sql) => {
        if (sql.includes('FROM stroke_activations a')) return [ACTIVATION];
        return { affectedRows: 1 };
      });
      await expect(
        (await service(dataSource)).recordMilestone(5, {
          milestoneKey: 'imaging_interpretation',
          timeQuality: 'estimated',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('outpatient medication reconciliation and follow-up', () => {
    const VISIT = {
      id: 21,
      activation_id: 5,
      pid: 17,
      facility_id: 1,
      status: 'completed',
      appointment_id: 77,
      medication_reconciliation_json: null,
      medication_reconciliation_status: 'not_reviewed',
      medication_reconciled_by_name: null,
      medication_reconciled_at: null,
    };
    const rx = [
      { id: 101, drug: 'Aspirin', dosage: '81 mg', route: 'PO', active: 1 },
      {
        id: 102,
        drug: 'Atorvastatin',
        dosage: '40 mg',
        route: 'PO',
        active: 1,
      },
    ];

    it('requires every active prescription to be addressed', async () => {
      const { dataSource } = build((sql) => {
        if (sql.includes('FROM stroke_clinic_visits')) return [VISIT];
        if (sql.includes('FROM prescriptions')) return rx;
        return { affectedRows: 1 };
      });
      await expect(
        (await service(dataSource)).reconcileClinicMedications(21, {
          items: [{ prescriptionId: 101, status: 'continued' }],
          signedByName: 'Dr Test',
          signatureConfirmed: true,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('stores a signed medication snapshot and audits it', async () => {
      const { dataSource, queries } = build((sql) => {
        if (sql.includes('FROM stroke_clinic_visits')) return [VISIT];
        if (sql.includes('FROM prescriptions')) return rx;
        return { affectedRows: 1 };
      });
      await (
        await service(dataSource)
      ).reconcileClinicMedications(
        21,
        {
          items: [
            { prescriptionId: 101, status: 'continued' },
            { prescriptionId: 102, status: 'stopped', notes: 'Statin changed' },
          ],
          signedByName: 'Dr Test',
          signatureConfirmed: true,
        },
        { id: 42, displayName: 'Dr Test' },
      );
      const update = queries.find((query) =>
        query.sql.includes('UPDATE stroke_clinic_visits'),
      );
      expect(update?.params[0]).toContain('Atorvastatin');
      expect(update?.params[0]).toContain('"status":"stopped"');
      expect(update?.params[2]).toBe('Dr Test');
      expect(
        queries.some(
          (query) =>
            query.sql.includes('stroke_audit_events') &&
            query.params.includes('medication_reconciled'),
        ),
      ).toBe(true);
    });

    it('rejects an appointment linked to a different patient', async () => {
      const { dataSource, queries } = build((sql) => {
        if (sql.includes('FROM patient_data WHERE pid')) return [{ pid: 17 }];
        if (sql.includes('FROM openemr_postcalendar_events'))
          return [{ pc_eid: 77, pc_pid: '99' }];
        return { affectedRows: 1, insertId: 21 };
      });
      await expect(
        (await service(dataSource)).addClinicVisit(17, {
          visitAt: '2026-05-01T10:00:00Z',
          appointmentId: 77,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(
        queries.some((query) =>
          query.sql.includes('INSERT INTO stroke_clinic_visits'),
        ),
      ).toBe(false);
    });

    it('updates follow-up details and the linked appointment', async () => {
      const { dataSource, queries } = build((sql) => {
        if (sql.includes('FROM stroke_clinic_visits')) return [VISIT];
        if (sql.includes('FROM openemr_postcalendar_events'))
          return [{ pc_eid: 78, pc_pid: '17' }];
        if (sql.includes('FROM patient_data')) return [{ pid: 17 }];
        if (sql.includes('FROM stroke_clinic_visits v')) return [];
        return { affectedRows: 1 };
      });
      await (
        await service(dataSource)
      ).updateClinicVisit(
        21,
        {
          status: 'completed',
          nextFollowupDate: '2026-06-01',
          appointmentId: 78,
          carePlan: 'Continue secondary prevention',
        },
        { id: 42, displayName: 'Dr Test' },
      );
      const update = queries.find((query) =>
        query.sql.includes('UPDATE stroke_clinic_visits'),
      );
      expect(update?.sql).toContain('next_followup_date');
      expect(update?.sql).toContain('appointment_id');
      expect(update?.params).toContain('Continue secondary prevention');
    });
  });
});
