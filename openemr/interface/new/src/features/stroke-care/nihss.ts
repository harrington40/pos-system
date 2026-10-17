import type { NihssItemDef } from '../../api/endpoints/strokeCare';

/**
 * Browser-side preview of the NIHSS total.
 *
 * This exists so the clinician sees the score change while documenting. It is
 * never authoritative: the server recomputes the total from the submitted items
 * and stores only its own value. The item definitions come from
 * `/stroke-care/protocols`, so this file contains no duplicated clinical rules.
 */

export interface NihssPreview {
  total: number;
  maxTotal: number;
  severity: 'none' | 'minor' | 'moderate' | 'moderate_severe' | 'severe';
  missing: string[];
  invalid: string[];
  untestable: string[];
  untestableWithoutReason: string[];
  untestableNotAllowed: string[];
  complete: boolean;
  partial: boolean;
}

export function severityForTotal(total: number): NihssPreview['severity'] {
  if (total <= 0) return 'none';
  if (total <= 4) return 'minor';
  if (total <= 15) return 'moderate';
  if (total <= 20) return 'moderate_severe';
  return 'severe';
}

export function scoreNihssPreview(
  items: Record<string, number | string | null | undefined>,
  definitions: NihssItemDef[],
  untestable: Record<string, string | boolean> = {},
  allowedUntestable: string[] = [],
): NihssPreview {
  const missing: string[] = [];
  const invalid: string[] = [];
  const untestableKeys: string[] = [];
  const untestableWithoutReason: string[] = [];
  const untestableNotAllowed: string[] = [];
  const allowed = new Set(allowedUntestable);
  let total = 0;

  for (const def of definitions) {
    const raw = items[def.key];
    const declaration = untestable[def.key];
    if (raw === undefined || raw === null || raw === '') {
      if (declaration !== undefined && declaration !== false) {
        if (!allowed.has(def.key)) {
          untestableNotAllowed.push(def.key);
          continue;
        }
        const reason = untestable[def.key];
        if (typeof reason !== 'string' || !reason.trim()) {
          untestableWithoutReason.push(def.key);
          continue;
        }
        untestableKeys.push(def.key);
        continue;
      }
      missing.push(def.key);
      continue;
    }
    const value = Number(raw);
    if (!Number.isInteger(value) || value < 0 || value > def.max) {
      invalid.push(def.key);
      continue;
    }
    total += value;
  }

  return {
    total,
    maxTotal: definitions.reduce((sum, def) => sum + def.max, 0),
    severity: severityForTotal(total),
    missing,
    invalid,
    untestable: untestableKeys,
    untestableWithoutReason,
    untestableNotAllowed,
    complete:
      missing.length === 0 &&
      invalid.length === 0 &&
      untestableWithoutReason.length === 0 &&
      untestableNotAllowed.length === 0,
    partial: untestableKeys.length > 0,
  };
}

export function severityLabel(severity: string): string {
  switch (severity) {
    case 'none':
      return 'No deficit';
    case 'minor':
      return 'Minor';
    case 'moderate':
      return 'Moderate';
    case 'moderate_severe':
      return 'Moderate–severe';
    case 'severe':
      return 'Severe';
    default:
      return severity;
  }
}

export function severityBadge(severity: string): string {
  switch (severity) {
    case 'none':
    case 'minor':
      return 'bg-success';
    case 'moderate':
      return 'bg-warning text-dark';
    case 'moderate_severe':
      return 'bg-danger-subtle text-danger';
    case 'severe':
      return 'bg-danger';
    default:
      return 'bg-secondary';
  }
}

/** Render minutes from a timing field without inventing a value. */
export function formatMinutes(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '—';
  }
  const n = Math.round(Number(value));
  if (n < 60) return `${n} min`;
  const hours = Math.floor(n / 60);
  const minutes = n % 60;
  return minutes ? `${hours} h ${minutes} min` : `${hours} h`;
}

/** Format a DATETIME from the API for display, tolerating a missing value. */
export function formatWhen(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value.includes('T') ? value : value.replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}
