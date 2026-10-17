import { NIHSS_ITEMS, NIHSS_LOINC } from './stroke-protocols';

/**
 * FHIR interoperability for OpenRx Stroke Care.
 *
 * The existing OpenRx export layer is FHIR R4. This module pins 4.0.1 and
 * validates the resources it emits against the base R4 profiles plus the
 * stroke terminology constraints below. It is deliberately *not* a claim of
 * HL7 conformance: the official HL7 validator/terminology server must still be
 * run against a deployed endpoint before conformance is asserted.
 */
export const STROKE_FHIR_VERSION = '4.0.1' as const;

export const STROKE_FHIR_PROFILES: Record<string, string> = {
  Patient: 'http://hl7.org/fhir/StructureDefinition/Patient',
  Encounter: 'http://hl7.org/fhir/StructureDefinition/Encounter',
  Observation: 'http://hl7.org/fhir/StructureDefinition/Observation',
  Condition: 'http://hl7.org/fhir/StructureDefinition/Condition',
  DiagnosticReport: 'http://hl7.org/fhir/StructureDefinition/DiagnosticReport',
  ImagingStudy: 'http://hl7.org/fhir/StructureDefinition/ImagingStudy',
  ServiceRequest: 'http://hl7.org/fhir/StructureDefinition/ServiceRequest',
  MedicationRequest:
    'http://hl7.org/fhir/StructureDefinition/MedicationRequest',
  CarePlan: 'http://hl7.org/fhir/StructureDefinition/CarePlan',
  Procedure: 'http://hl7.org/fhir/StructureDefinition/Procedure',
  DocumentReference:
    'http://hl7.org/fhir/StructureDefinition/DocumentReference',
  Provenance: 'http://hl7.org/fhir/StructureDefinition/Provenance',
};

export const STROKE_FHIR_RESOURCE_TYPES = Object.keys(STROKE_FHIR_PROFILES);

const LOINC_SYSTEM = 'http://loinc.org';
const UCUM_SYSTEM = 'http://unitsofmeasure.org';

const NIHSS_ITEM_CODES = new Set(
  NIHSS_ITEMS.map(
    (item) =>
      NIHSS_LOINC.items[item.key as keyof typeof NIHSS_LOINC.items].code,
  ),
);
const NIHSS_OBSERVATION_CODES = new Set<string>([
  NIHSS_LOINC.panel.code,
  NIHSS_LOINC.total.code,
  ...NIHSS_ITEM_CODES,
]);

export interface FhirResource {
  resourceType: string;
  id?: string;
  meta?: {
    profile?: string[];
    tag?: Array<{ system?: string; code?: string; display?: string }>;
    versionId?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface FhirBundle {
  resourceType: 'Bundle';
  type: string;
  timestamp?: string;
  entry?: Array<{ fullUrl?: string; resource?: FhirResource }>;
  [key: string]: unknown;
}

export interface FhirValidationIssue {
  severity: 'error' | 'warning';
  path: string;
  message: string;
}

export interface FhirValidationResult {
  valid: boolean;
  fhirVersion: typeof STROKE_FHIR_VERSION;
  profiles: string[];
  checkedResources: number;
  checkedReferences: number;
  errors: FhirValidationIssue[];
  warnings: FhirValidationIssue[];
  /** Explicitly records what this validation does and does not prove. */
  conformanceStatement: string;
}

/** Attach the pinned R4 base profile to every emitted resource. */
export function applyFhirProfiles<T extends FhirBundle>(bundle: T): T {
  for (const entry of bundle.entry ?? []) {
    const resource = entry.resource;
    if (!resource) continue;
    const profile = STROKE_FHIR_PROFILES[resource.resourceType];
    if (!profile) continue;
    resource.meta = {
      ...(resource.meta ?? {}),
      profile: Array.from(
        new Set([...(resource.meta?.profile ?? []), profile]),
      ),
    };
  }
  return bundle;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function arrayOf(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function referenceOf(value: unknown): string | null {
  const record = asRecord(value);
  return typeof record?.reference === 'string' ? record.reference : null;
}

function codeSystemOf(code: unknown): string | null {
  const record = asRecord(code);
  return typeof record?.system === 'string' ? record.system : null;
}

function codeValueOf(code: unknown): string | null {
  const record = asRecord(code);
  return typeof record?.code === 'string' ? record.code : null;
}

function hasValueX(resource: Record<string, unknown>): boolean {
  return Object.keys(resource).some((key) => /^value[A-Z]/.test(key));
}

function collectReferences(
  value: unknown,
  path: string,
): Array<{ reference: string; path: string }> {
  const found: Array<{ reference: string; path: string }> = [];
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      found.push(...collectReferences(item, `${path}[${index}]`)),
    );
    return found;
  }
  const record = asRecord(value);
  if (!record) return found;
  if (typeof record.reference === 'string') {
    found.push({ reference: record.reference, path });
  }
  for (const [key, child] of Object.entries(record)) {
    if (key === 'reference') continue;
    found.push(...collectReferences(child, `${path}.${key}`));
  }
  return found;
}

/**
 * Structural + profile-aware validation for the generated bundles.
 *
 * This checks required R4 elements, internal reference resolution, allowed
 * status values, NIHSS LOINC terminology and score units. It does not replace
 * the official HL7 validator or a terminology-server conformance run.
 */
export function validateFhirBundle(
  bundle: FhirBundle,
  expectedVersion: string = STROKE_FHIR_VERSION,
): FhirValidationResult {
  const errors: FhirValidationIssue[] = [];
  const warnings: FhirValidationIssue[] = [];
  const entries = bundle.entry ?? [];
  const resolvable = new Set<string>();

  for (const entry of entries) {
    if (entry.fullUrl) resolvable.add(entry.fullUrl);
    const resource = entry.resource;
    if (resource?.resourceType && resource.id) {
      resolvable.add(`${resource.resourceType}/${resource.id}`);
    }
  }

  if (bundle.resourceType !== 'Bundle') {
    errors.push({
      severity: 'error',
      path: 'Bundle',
      message: 'Root resource must be a Bundle.',
    });
  }
  if (
    !['collection', 'transaction', 'batch', 'document', 'message'].includes(
      bundle.type,
    )
  ) {
    errors.push({
      severity: 'error',
      path: 'Bundle.type',
      message: `Unsupported Bundle.type "${bundle.type}".`,
    });
  }
  if (!entries.length) {
    errors.push({
      severity: 'error',
      path: 'Bundle.entry',
      message: 'Bundle must contain at least one resource.',
    });
  }
  if (expectedVersion !== STROKE_FHIR_VERSION) {
    errors.push({
      severity: 'error',
      path: 'Bundle.meta.fhirVersion',
      message: `This exporter is pinned to FHIR ${STROKE_FHIR_VERSION}; requested ${expectedVersion}.`,
    });
  }

  for (const [index, entry] of entries.entries()) {
    const resource = entry.resource;
    const path = `Bundle.entry[${index}]`;
    if (!resource || typeof resource.resourceType !== 'string') {
      errors.push({
        severity: 'error',
        path,
        message: 'Entry is missing a resource with resourceType.',
      });
      continue;
    }
    if (!STROKE_FHIR_PROFILES[resource.resourceType]) {
      errors.push({
        severity: 'error',
        path: `${path}.resource`,
        message: `Unsupported FHIR resource type "${resource.resourceType}".`,
      });
      continue;
    }
    if (!resource.id) {
      errors.push({
        severity: 'error',
        path: `${path}.resource.id`,
        message: 'Resource.id is required for stable references.',
      });
    }
    if (
      !resource.meta?.profile?.includes(
        STROKE_FHIR_PROFILES[resource.resourceType],
      )
    ) {
      warnings.push({
        severity: 'warning',
        path: `${path}.resource.meta.profile`,
        message: `Resource does not declare the R4 ${resource.resourceType} profile.`,
      });
    }
    validateResource(resource, `${path}.resource`, errors, warnings);
  }

  let checkedReferences = 0;
  for (const [index, entry] of entries.entries()) {
    for (const { reference, path } of collectReferences(
      entry.resource,
      `Bundle.entry[${index}].resource`,
    )) {
      checkedReferences += 1;
      if (
        reference.startsWith('http://') ||
        reference.startsWith('https://') ||
        reference.startsWith('urn:oid:')
      ) {
        continue;
      }
      if (reference.startsWith('urn:uuid:')) {
        if (!resolvable.has(reference)) {
          errors.push({
            severity: 'error',
            path,
            message: `Reference "${reference}" does not resolve inside the bundle.`,
          });
        }
        continue;
      }
      if (reference.startsWith('urn:')) continue;
      if (!resolvable.has(reference)) {
        errors.push({
          severity: 'error',
          path,
          message: `Reference "${reference}" does not resolve inside the bundle.`,
        });
      }
    }
  }

  return {
    valid: errors.length === 0,
    fhirVersion: STROKE_FHIR_VERSION,
    profiles: Object.values(STROKE_FHIR_PROFILES),
    checkedResources: entries.length,
    checkedReferences,
    errors,
    warnings,
    conformanceStatement:
      `Structural validation against FHIR R4 (${STROKE_FHIR_VERSION}) base profiles and ` +
      'OpenRx stroke terminology constraints. This is not an assertion of HL7 ' +
      'conformance; run the official HL7 validator and terminology server against ' +
      'the deployed endpoint before claiming conformance.',
  };
}

function validateResource(
  resource: FhirResource,
  path: string,
  errors: FhirValidationIssue[],
  warnings: FhirValidationIssue[],
): void {
  const requiredReference = (field: string) => {
    if (!referenceOf(resource[field])) {
      errors.push({
        severity: 'error',
        path: `${path}.${field}`,
        message: `${resource.resourceType}.${field} must contain a reference.`,
      });
    }
  };
  const requiredCode = (field: string) => {
    const codeable = asRecord(resource[field]);
    if (!codeable || (!arrayOf(codeable.coding).length && !codeable.text)) {
      errors.push({
        severity: 'error',
        path: `${path}.${field}`,
        message: `${resource.resourceType}.${field} must contain a code or text.`,
      });
    }
  };
  const requiredString = (field: string) => {
    if (typeof resource[field] !== 'string' || !resource[field]) {
      errors.push({
        severity: 'error',
        path: `${path}.${field}`,
        message: `${resource.resourceType}.${field} is required.`,
      });
    }
  };

  switch (resource.resourceType) {
    case 'Patient':
      if (
        !arrayOf(resource.name).length &&
        !arrayOf(resource.identifier).length
      ) {
        errors.push({
          severity: 'error',
          path,
          message: 'Patient requires a name or identifier.',
        });
      }
      break;
    case 'Encounter':
      requiredString('status');
      requiredReference('subject');
      if (!asRecord(resource.class)) {
        errors.push({
          severity: 'error',
          path: `${path}.class`,
          message: 'Encounter.class is required.',
        });
      }
      break;
    case 'Observation':
      requiredString('status');
      requiredCode('code');
      requiredReference('subject');
      if (!hasValueX(resource) && !asRecord(resource.dataAbsentReason)) {
        errors.push({
          severity: 'error',
          path,
          message: 'Observation requires value[x] or dataAbsentReason.',
        });
      }
      validateNihssObservation(resource, path, errors, warnings);
      break;
    case 'Condition':
      requiredCode('code');
      requiredReference('subject');
      break;
    case 'DiagnosticReport':
      requiredString('status');
      requiredCode('code');
      requiredReference('subject');
      break;
    case 'ImagingStudy':
      requiredString('status');
      requiredReference('subject');
      if (
        !arrayOf(resource.modality).length &&
        !arrayOf(resource.series).length
      ) {
        warnings.push({
          severity: 'warning',
          path,
          message: 'ImagingStudy has no modality or series metadata.',
        });
      }
      break;
    case 'ServiceRequest':
      requiredString('status');
      requiredString('intent');
      requiredReference('subject');
      requiredCode('code');
      break;
    case 'MedicationRequest':
      requiredString('status');
      requiredString('intent');
      requiredReference('subject');
      if (
        !asRecord(resource.medicationCodeableConcept) &&
        !referenceOf(resource.medicationReference)
      ) {
        errors.push({
          severity: 'error',
          path,
          message: 'MedicationRequest requires medication[x].',
        });
      }
      break;
    case 'CarePlan':
      requiredString('status');
      requiredString('intent');
      requiredReference('subject');
      break;
    case 'Procedure':
      requiredString('status');
      requiredReference('subject');
      requiredCode('code');
      break;
    case 'DocumentReference':
      requiredString('status');
      requiredCode('type');
      requiredReference('subject');
      if (!arrayOf(resource.content).length) {
        errors.push({
          severity: 'error',
          path: `${path}.content`,
          message: 'DocumentReference.content is required.',
        });
      }
      break;
    case 'Provenance':
      requiredString('recorded');
      if (!arrayOf(resource.agent).length) {
        errors.push({
          severity: 'error',
          path: `${path}.agent`,
          message: 'Provenance.agent is required.',
        });
      }
      if (!arrayOf(resource.target).length) {
        errors.push({
          severity: 'error',
          path: `${path}.target`,
          message: 'Provenance.target is required.',
        });
      }
      break;
    default:
      break;
  }
}

function validateNihssObservation(
  resource: FhirResource,
  path: string,
  errors: FhirValidationIssue[],
  warnings: FhirValidationIssue[],
): void {
  const code = asRecord(resource.code);
  const codings = arrayOf(code?.coding)
    .map(asRecord)
    .filter((coding): coding is Record<string, unknown> => Boolean(coding));
  const loincCoding = codings.find(
    (coding) => codeSystemOf(coding) === LOINC_SYSTEM,
  );
  const looksLikeNihss = codings.some((coding) => {
    const display =
      typeof coding.display === 'string' ? coding.display.toLowerCase() : '';
    return display.includes('nihss') || display.includes('stroke scale');
  });
  if (looksLikeNihss && !loincCoding) {
    errors.push({
      severity: 'error',
      path,
      message: 'NIHSS Observations must carry a LOINC coding.',
    });
    return;
  }
  if (loincCoding) {
    const codeValue = codeValueOf(loincCoding);
    if (!codeValue || !NIHSS_OBSERVATION_CODES.has(codeValue)) {
      errors.push({
        severity: 'error',
        path,
        message: `Unknown NIHSS LOINC code "${codeValue ?? ''}".`,
      });
    }
  }
  const value = asRecord(resource.valueQuantity);
  if (value) {
    if (typeof value.value !== 'number') {
      errors.push({
        severity: 'error',
        path: `${path}.valueQuantity.value`,
        message: 'NIHSS valueQuantity.value must be numeric.',
      });
    }
    if (
      codeSystemOf(value) !== UCUM_SYSTEM ||
      codeValueOf(value) !== '{score}'
    ) {
      errors.push({
        severity: 'error',
        path: `${path}.valueQuantity`,
        message: 'NIHSS scores must use UCUM {score}.',
      });
    }
  }
  const members = arrayOf(resource.hasMember);
  if (members.length) {
    for (const member of members) {
      if (!referenceOf(member)) {
        errors.push({
          severity: 'error',
          path: `${path}.hasMember`,
          message: 'Observation.hasMember requires a reference.',
        });
      }
    }
  }
  if (
    codeValueOf(loincCoding) === NIHSS_LOINC.panel.code &&
    members.length !== NIHSS_ITEMS.length
  ) {
    warnings.push({
      severity: 'warning',
      path: `${path}.hasMember`,
      message: `NIHSS panel should reference ${NIHSS_ITEMS.length} item Observations.`,
    });
  }
}

export { NIHSS_LOINC };
