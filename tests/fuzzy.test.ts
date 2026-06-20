import { describe, expect, it } from 'vitest';
import { fuzzyScore, rankItems, scoreItem } from '../src/calc/fuzzy';

describe('fuzzyScore', () => {
  it('returns 0 for an empty query', () => {
    expect(fuzzyScore('', 'anything')).toBe(0);
  });

  it('rewards a direct substring over a scattered subsequence', () => {
    expect(fuzzyScore('wind', 'Crosswind & headwind')).toBeGreaterThan(
      fuzzyScore('wdh', 'Crosswind & headwind'),
    );
  });

  it('returns -1 when the query is not a subsequence', () => {
    expect(fuzzyScore('xyz', 'Crosswind')).toBe(-1);
  });

  it('ranks a prefix match highest', () => {
    expect(fuzzyScore('cross', 'Crosswind')).toBeGreaterThan(fuzzyScore('wind', 'Crosswind'));
  });

  it('matches across word boundaries (initials)', () => {
    expect(fuzzyScore('wb', 'Weight & balance')).toBeGreaterThan(0);
  });
});

describe('scoreItem', () => {
  it('falls back to keyword hints when the label does not match', () => {
    const item = { label: 'Weight & balance', keywords: ['cg', 'mass'] };
    expect(scoreItem('cg', item)).toBeGreaterThan(0);
    expect(scoreItem('zzz', item)).toBe(-1);
  });
});

describe('rankItems', () => {
  const items = [
    { label: 'Crosswind & headwind' },
    { label: 'Cloud base' },
    { label: 'Weight & balance', keywords: ['cg'] },
  ];

  it('returns all items unchanged for an empty query', () => {
    expect(rankItems('', items)).toHaveLength(3);
  });

  it('keeps only matches and orders them best-first', () => {
    const out = rankItems('cl', items);
    expect(out[0].label).toBe('Cloud base');
    expect(out.every((i) => i.label !== 'Weight & balance')).toBe(true);
  });

  it('finds an item via its keyword', () => {
    expect(rankItems('cg', items).map((i) => i.label)).toEqual(['Weight & balance']);
  });
});
