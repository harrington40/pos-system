import { describe, it, expect } from 'vitest';
import {
  formatMinutes,
  scoreNihssPreview,
  severityForTotal,
  severityLabel,
} from '../features/stroke-care/nihss';
import type { NihssItemDef } from '../api/endpoints/strokeCare';

/** Item definitions are normally fetched from the server; this is a fixture. */
const DEFS: NihssItemDef[] = [
  {
    key: '1a',
    label: '1a. Level of consciousness',
    max: 3,
    guidance: '',
    options: [
      { value: 0, label: '0' },
      { value: 1, label: '1' },
      { value: 2, label: '2' },
      { value: 3, label: '3' },
    ],
  },
  {
    key: '5a',
    label: '5a. Motor — left arm',
    max: 4,
    guidance: '',
    options: [
      { value: 0, label: '0' },
      { value: 4, label: '4' },
    ],
  },
  {
    key: '11',
    label: '11. Extinction and inattention',
    max: 2,
    guidance: '',
    options: [
      { value: 0, label: '0' },
      { value: 2, label: '2' },
    ],
  },
];

describe('stroke care NIHSS preview', () => {
  it('totals the selected items and reports completeness', () => {
    const result = scoreNihssPreview({ '1a': 1, '5a': 4, '11': 0 }, DEFS);
    expect(result.total).toBe(5);
    expect(result.maxTotal).toBe(9);
    expect(result.complete).toBe(true);
    expect(result.severity).toBe('moderate');
  });

  it('lists missing items instead of scoring them as zero', () => {
    const result = scoreNihssPreview({ '1a': 2 }, DEFS);
    expect(result.complete).toBe(false);
    expect(result.missing).toEqual(['5a', '11']);
  });

  it('treats an allowed untestable item as accounted for, not zero', () => {
    const result = scoreNihssPreview(
      { '1a': 1, '11': 0 },
      DEFS,
      { '5a': 'Left arm amputated' },
      ['5a'],
    );
    expect(result.total).toBe(1);
    expect(result.partial).toBe(true);
    expect(result.untestable).toEqual(['5a']);
    expect(result.complete).toBe(true);
  });

  it('requires a reason for an untestable item', () => {
    const result = scoreNihssPreview(
      { '1a': 1, '11': 0 },
      DEFS,
      { '5a': '' },
      ['5a'],
    );
    expect(result.complete).toBe(false);
    expect(result.untestableWithoutReason).toEqual(['5a']);
  });

  it('rejects values above the item maximum', () => {
    const result = scoreNihssPreview({ '1a': 4, '5a': 1, '11': 1 }, DEFS);
    expect(result.invalid).toEqual(['1a']);
    expect(result.complete).toBe(false);
  });

  it('maps totals to the published severity bands', () => {
    expect(severityForTotal(0)).toBe('none');
    expect(severityForTotal(4)).toBe('minor');
    expect(severityForTotal(15)).toBe('moderate');
    expect(severityForTotal(16)).toBe('moderate_severe');
    expect(severityForTotal(21)).toBe('severe');
    expect(severityLabel('moderate_severe')).toBe('Moderate–severe');
  });

  it('formats timing values without inventing a number', () => {
    expect(formatMinutes(null)).toBe('—');
    expect(formatMinutes(45)).toBe('45 min');
    expect(formatMinutes(90)).toBe('1 h 30 min');
  });
});
