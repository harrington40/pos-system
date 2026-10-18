import {
  STROKE_FHIR_PROFILES,
  STROKE_FHIR_VERSION,
  applyFhirProfiles,
  fhirDateTime,
  fhirUrn,
  validateFhirBundle,
  type FhirBundle,
} from './stroke-fhir';
import { NIHSS_ITEMS, NIHSS_LOINC } from './stroke-protocols';

function validBundle(): FhirBundle {
  return applyFhirProfiles({
    resourceType: 'Bundle',
    type: 'collection',
    timestamp: '2026-05-01T10:00:00Z',
    entry: [
      {
        fullUrl: fhirUrn('patient:17'),
        resource: {
          resourceType: 'Patient',
          id: '17',
          identifier: [{ system: 'urn:openrx:patient-pid', value: '17' }],
          name: [{ family: 'Patient', given: ['Test'] }],
        },
      },
      {
        fullUrl: fhirUrn('encounter:5'),
        resource: {
          resourceType: 'Encounter',
          id: 'stroke-encounter-5',
          status: 'in-progress',
          class: {
            system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
            code: 'EMER',
          },
          subject: { reference: fhirUrn('patient:17') },
        },
      },
      {
        fullUrl: fhirUrn('nihss-total:1'),
        resource: {
          resourceType: 'Observation',
          id: 'stroke-nihss-total-1',
          status: 'final',
          code: {
            coding: [
              {
                system: NIHSS_LOINC.total.system,
                code: NIHSS_LOINC.total.code,
                display: NIHSS_LOINC.total.display,
              },
            ],
          },
          subject: { reference: fhirUrn('patient:17') },
          encounter: { reference: fhirUrn('encounter:5') },
          effectiveDateTime: '2026-05-01T10:00:00Z',
          valueQuantity: {
            value: 4,
            unit: 'score',
            system: 'http://unitsofmeasure.org',
            code: '{score}',
          },
        },
      },
      {
        fullUrl: fhirUrn('provenance:1'),
        resource: {
          resourceType: 'Provenance',
          id: 'provenance-1',
          recorded: '2026-05-01T10:01:00Z',
          target: [{ reference: fhirUrn('nihss-total:1') }],
          agent: [{ who: { display: 'OpenRx Stroke Care' } }],
        },
      },
    ],
  });
}

describe('Stroke FHIR R4 interoperability', () => {
  it('pins the published NIHSS LOINC panel, total and all 15 item codes', () => {
    expect(STROKE_FHIR_VERSION).toBe('4.0.1');
    expect(NIHSS_LOINC.panel.code).toBe('70182-1');
    expect(NIHSS_LOINC.total.code).toBe('72089-6');
    expect(NIHSS_ITEMS).toHaveLength(15);
    const mapped = NIHSS_ITEMS.map(
      (item) => NIHSS_LOINC.items[item.key as keyof typeof NIHSS_LOINC.items],
    );
    expect(mapped.every((item) => /^\d{4,5}-\d$/.test(item.code))).toBe(true);
    expect(NIHSS_LOINC.items['5b' as keyof typeof NIHSS_LOINC.items].code).toBe(
      '70967-5',
    );
    expect(NIHSS_LOINC.items['6b' as keyof typeof NIHSS_LOINC.items].code).toBe(
      '70968-3',
    );
  });

  it('accepts a correctly profiled bundle with resolvable references', () => {
    const result = validateFhirBundle(validBundle());
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.checkedResources).toBe(4);
    expect(result.profiles).toContain(STROKE_FHIR_PROFILES.Observation);
    expect(result.conformanceStatement).toContain('not an assertion');
  });

  it('rejects a dangling subject reference', () => {
    const bundle = validBundle();
    const observation = bundle.entry?.find(
      (entry) => entry.resource?.resourceType === 'Observation',
    )?.resource;
    const missing = fhirUrn('patient:999');
    observation!.subject = { reference: missing };
    const result = validateFhirBundle(bundle);
    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.message.includes(missing))).toBe(
      true,
    );
  });

  it('rejects an Observation without a value or data-absent reason', () => {
    const bundle = validBundle();
    delete bundle.entry?.[2].resource?.valueQuantity;
    const result = validateFhirBundle(bundle);
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((error) => error.message.includes('value[x]')),
    ).toBe(true);
  });

  it('rejects an unknown NIHSS LOINC code and wrong UCUM unit', () => {
    const bundle = validBundle();
    const observation = bundle.entry?.[2].resource;
    const coding = (observation?.code as { coding: Array<{ code: string }> })
      .coding[0];
    coding.code = '99999-9';
    (
      observation?.valueQuantity as {
        system: string;
        code: string;
      }
    ).code = 'mg';
    const result = validateFhirBundle(bundle);
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((error) =>
        error.message.includes('Unknown NIHSS LOINC'),
      ),
    ).toBe(true);
    expect(result.errors.some((error) => error.message.includes('UCUM'))).toBe(
      true,
    );
  });

  it('rejects a Provenance with an unresolved target', () => {
    const bundle = validBundle();
    const provenance = bundle.entry?.[3].resource;
    const missing = fhirUrn('provenance:missing');
    provenance!.target = [{ reference: missing }];
    const result = validateFhirBundle(bundle);
    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.message.includes(missing))).toBe(
      true,
    );
  });

  it('serialises timezone-less database timestamps as UTC instants', () => {
    const local = '2026-05-01T10:30:00';
    expect(fhirDateTime(local)).toBe(new Date(local).toISOString());
    expect(fhirDateTime('2026-05-01T10:30:00Z')).toBe(
      '2026-05-01T10:30:00.000Z',
    );
    expect(fhirDateTime('')).toBeUndefined();
    expect(fhirDateTime('not-a-date')).toBeUndefined();
  });

  it('uses stable, valid lowercase UUID fullUrls', () => {
    const first = validBundle();
    const second = validBundle();
    const urls = (first.entry ?? []).map((entry) => entry.fullUrl);
    expect(urls).toEqual((second.entry ?? []).map((entry) => entry.fullUrl));
    for (const url of urls) {
      expect(url).toMatch(
        /^urn:uuid:[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
    }
  });

  it('rejects malformed or duplicate urn:uuid fullUrls', () => {
    const malformed = validBundle();
    malformed.entry![0].fullUrl = 'urn:uuid:patient-17';
    expect(
      validateFhirBundle(malformed).errors.some((error) =>
        error.message.includes('valid lowercase UUID'),
      ),
    ).toBe(true);

    const duplicate = validBundle();
    duplicate.entry![1].fullUrl = duplicate.entry![0].fullUrl;
    expect(
      validateFhirBundle(duplicate).errors.some((error) =>
        error.message.includes('Duplicate Bundle.fullUrl'),
      ),
    ).toBe(true);
  });

  it('rejects a requested FHIR version other than the pinned R4 release', () => {
    const result = validateFhirBundle(validBundle(), '4.3.0');
    expect(result.valid).toBe(false);
    expect(result.errors[0].path).toBe('Bundle.meta.fhirVersion');
  });

  it('adds profiles without duplicating them', () => {
    const bundle = validBundle();
    applyFhirProfiles(bundle);
    const patient = bundle.entry?.[0].resource;
    expect(patient?.meta?.profile).toEqual([STROKE_FHIR_PROFILES.Patient]);
  });
});
