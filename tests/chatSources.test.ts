import { describe, expect, it } from 'vitest';
import { partSlug, conversationParts, type SourcedMessage } from '../src/calc/chatSources';

const valid = new Set(['part-61', 'part-91', 'part-121']);

describe('partSlug', () => {
  it('resolves the leading Part number from any candidate field', () => {
    expect(partSlug(valid, '61', undefined, undefined)).toBe('part-61');
    expect(partSlug(valid, undefined, undefined, '91.155(a)')).toBe('part-91');
  });

  it('returns null when no candidate names a known Part', () => {
    expect(partSlug(valid, undefined, undefined, undefined)).toBeNull();
    expect(partSlug(valid, '999')).toBeNull(); // not in the valid set
    expect(partSlug(valid, 'no digits here')).toBeNull();
  });

  it('prefers the first candidate that resolves', () => {
    expect(partSlug(valid, '999', '61')).toBe('part-61');
  });
});

describe('conversationParts', () => {
  const messages: SourcedMessage[] = [
    { role: 'user' },
    {
      role: 'assistant',
      sources: [{ part: '61', citation: '61.57(b)' }, { citation: '91.155' }],
    },
    { role: 'user' },
    {
      role: 'assistant',
      sources: [{ citation: '61.51' }, { part: '999' }, { url: 'https://x' }],
    },
  ];

  it('aggregates unique cited Parts with a count, busiest first', () => {
    expect(conversationParts(messages, valid)).toEqual([
      { slug: 'part-61', num: '61', count: 2 },
      { slug: 'part-91', num: '91', count: 1 },
    ]);
  });

  it('ignores user turns, unknown Parts and sourceless answers', () => {
    expect(conversationParts([{ role: 'user', sources: [{ citation: '61' }] }], valid)).toEqual([]);
    expect(conversationParts([{ role: 'assistant' }], valid)).toEqual([]);
  });
});
