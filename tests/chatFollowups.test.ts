import { describe, expect, it } from 'vitest';
import { followupSuggestions } from '../src/calc/chatFollowups';

describe('followupSuggestions', () => {
  it('offers none for a refusal', () => {
    expect(followupSuggestions({ kind: 'refusal', sources: [] })).toEqual([]);
    expect(followupSuggestions(undefined)).toEqual([]);
  });

  it('references the cited rule when sources are present', () => {
    const out = followupSuggestions({
      kind: 'grounded',
      sources: [{ citation: '91.155', part: '91' }],
    });
    expect(out).toEqual([
      { id: 'exactText', cite: '91.155' },
      { id: 'related', part: '91' },
      { id: 'simple' },
    ]);
  });

  it('derives the Part number from the citation when `part` is absent', () => {
    const out = followupSuggestions({ kind: 'grounded', sources: [{ citation: '61.57(b)' }] });
    expect(out.find((f) => f.id === 'related')).toEqual({ id: 'related', part: '61' });
  });

  it('falls back to evergreen prompts with no sources', () => {
    expect(followupSuggestions({ kind: 'grounded', sources: [] })).toEqual([
      { id: 'simple' },
      { id: 'example' },
    ]);
  });

  it('caps at three suggestions', () => {
    const out = followupSuggestions({
      kind: 'grounded',
      sources: [{ citation: '91.155', part: '91' }],
    });
    expect(out.length).toBeLessThanOrEqual(3);
  });
});
