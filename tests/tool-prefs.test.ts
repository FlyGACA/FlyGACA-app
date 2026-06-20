import { describe, expect, it } from 'vitest';
import { addRecent, toggleId } from '../src/lib/toolPrefs';

describe('addRecent', () => {
  it('prepends most-recent-first and de-duplicates', () => {
    expect(addRecent(['a', 'b'], 'c')).toEqual(['c', 'a', 'b']);
    expect(addRecent(['a', 'b', 'c'], 'b')).toEqual(['b', 'a', 'c']);
  });

  it('caps the list at max, dropping the oldest', () => {
    expect(addRecent(['a', 'b', 'c'], 'd', 3)).toEqual(['d', 'a', 'b']);
  });
});

describe('toggleId', () => {
  it('adds when absent and removes when present', () => {
    expect(toggleId(['a'], 'b')).toEqual(['a', 'b']);
    expect(toggleId(['a', 'b'], 'a')).toEqual(['b']);
  });
});
