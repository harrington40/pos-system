/**
 * Stroke Care performance smoke test.
 *
 * This is not a load test of MySQL or the HTTP layer. It measures the two
 * CPU-heavy safety paths (NIHSS scoring and FHIR validation) so a release can
 * detect a gross regression before deployment.
 */
import { performance } from 'node:perf_hooks';
import {
  NIHSS_ITEMS,
  NIHSS_LOINC,
  scoreNihss,
} from '../src/stroke-care/stroke-protocols';
import {
  applyFhirProfiles,
  validateFhirBundle,
  type FhirBundle,
} from '../src/stroke-care/stroke-fhir';

const SCORE_ITERATIONS = Number(process.env.STROKE_SCORE_ITERATIONS ?? 10000);
const FHIR_ITERATIONS = Number(process.env.STROKE_FHIR_ITERATIONS ?? 1000);
const MAX_MS = Number(process.env.STROKE_PERF_MAX_MS ?? 15000);

const items = Object.fromEntries(NIHSS_ITEMS.map((item) => [item.key, 0]));

const started = performance.now();
for (let i = 0; i < SCORE_ITERATIONS; i += 1) {
  scoreNihss(items, {});
}
const scoreMs = Math.round(performance.now() - started);

const bundle = applyFhirProfiles<FhirBundle>({
  resourceType: 'Bundle',
  type: 'collection',
  entry: [
    {
      fullUrl: 'urn:uuid:patient-1',
      resource: {
        resourceType: 'Patient',
        id: '1',
        name: [{ family: 'Smoke', given: ['Test'] }],
      },
    },
    {
      fullUrl: 'urn:uuid:nihss-total-1',
      resource: {
        resourceType: 'Observation',
        id: 'nihss-total-1',
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
        subject: { reference: 'Patient/1' },
        effectiveDateTime: '2026-01-01T00:00:00Z',
        valueQuantity: {
          value: 0,
          unit: 'score',
          system: 'http://unitsofmeasure.org',
          code: '{score}',
        },
      },
    },
  ],
});

const fhirStarted = performance.now();
let validationFailures = 0;
for (let i = 0; i < FHIR_ITERATIONS; i += 1) {
  if (!validateFhirBundle(bundle).valid) validationFailures += 1;
}
const fhirMs = Math.round(performance.now() - fhirStarted);

const result = {
  scoreIterations: SCORE_ITERATIONS,
  scoreMs,
  fhirIterations: FHIR_ITERATIONS,
  fhirMs,
  validationFailures,
  maxMs: MAX_MS,
  passed:
    scoreMs <= MAX_MS && fhirMs <= MAX_MS && validationFailures === 0,
};
console.log(JSON.stringify(result, null, 2));
process.exit(result.passed ? 0 : 1);
