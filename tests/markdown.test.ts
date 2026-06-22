import { describe, expect, it } from 'vitest';
import { parseInline, parseMarkdown, safeHref } from '../src/calc/markdown';

describe('parseInline', () => {
  it('splits bold and code out of surrounding text', () => {
    expect(parseInline('see **GACAR** at `91.155` now')).toEqual([
      { type: 'text', value: 'see ' },
      { type: 'bold', value: 'GACAR' },
      { type: 'text', value: ' at ' },
      { type: 'code', value: '91.155' },
      { type: 'text', value: ' now' },
    ]);
  });

  it('returns a single text span for plain input', () => {
    expect(parseInline('just words')).toEqual([{ type: 'text', value: 'just words' }]);
  });

  it('parses a markdown link with a safe href', () => {
    expect(parseInline('see [Part 91](/library/part-91) for rules')).toEqual([
      { type: 'text', value: 'see ' },
      { type: 'link', value: 'Part 91', href: '/library/part-91' },
      { type: 'text', value: ' for rules' },
    ]);
  });

  it('parses an external https link', () => {
    expect(parseInline('[GACA](https://gaca.gov.sa)')).toEqual([
      { type: 'link', value: 'GACA', href: 'https://gaca.gov.sa' },
    ]);
  });

  it('degrades a javascript: link to inert literal text (no link span)', () => {
    const spans = parseInline('[x](javascript:void)');
    expect(spans.some((s) => s.type === 'link')).toBe(false);
    expect(spans.map((s) => s.value).join('')).toBe('[x](javascript:void)');
  });
});

describe('safeHref', () => {
  it('allows site-relative paths and http(s)/mailto', () => {
    expect(safeHref('/library/part-61')).toBe('/library/part-61');
    expect(safeHref('https://gaca.gov.sa')).toBe('https://gaca.gov.sa');
    expect(safeHref('mailto:info@example.com')).toBe('mailto:info@example.com');
  });

  it('rejects protocol-relative and dangerous schemes', () => {
    expect(safeHref('//evil.example')).toBeNull();
    expect(safeHref('javascript:alert(1)')).toBeNull();
    expect(safeHref('data:text/html;base64,xxx')).toBeNull();
    expect(safeHref('')).toBeNull();
  });
});

describe('parseMarkdown', () => {
  it('separates paragraphs on blank lines', () => {
    const blocks = parseMarkdown('first line\n\nsecond line');
    expect(blocks).toHaveLength(2);
    expect(blocks.every((b) => b.type === 'paragraph')).toBe(true);
  });

  it('parses headings with their level', () => {
    const [h] = parseMarkdown('## Weather minima');
    expect(h).toMatchObject({ type: 'heading', level: 2 });
  });

  it('parses an unordered list as one block of items', () => {
    const blocks = parseMarkdown('- one\n- two\n- three');
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({ type: 'ul' });
    expect(blocks[0].type === 'ul' && blocks[0].items).toHaveLength(3);
  });

  it('parses an ordered list distinctly from bullets', () => {
    const blocks = parseMarkdown('1. first\n2. second');
    expect(blocks[0].type).toBe('ol');
  });

  it('keeps a paragraph and a following list as separate blocks', () => {
    const blocks = parseMarkdown('Intro text\n- a\n- b');
    expect(blocks.map((b) => b.type)).toEqual(['paragraph', 'ul']);
  });

  it('degrades empty/whitespace input to no blocks without throwing', () => {
    expect(parseMarkdown('')).toEqual([]);
    expect(parseMarkdown('   \n  \n')).toEqual([]);
  });
});
