import { describe, expect, it } from 'vitest';
import { searchHref, parseSearchUrl, toSearchRef } from '../src/lib/content';

describe('searchHref', () => {
  it('rewrites regulations URLs to the Document reader', () => {
    expect(searchHref('document.html?type=regulations&id=part-61#sec-currency')).toBe(
      '/library/part-61#sec-currency',
    );
  });

  it('rewrites reference URLs under /library/reference', () => {
    expect(searchHref('document.html?type=reference&id=ac-68-1-basicmed#sec-1')).toBe(
      '/library/reference/ac-68-1-basicmed#sec-1',
    );
  });

  it('rewrites handbooks URLs under /library/handbook', () => {
    expect(searchHref('document.html?type=handbooks&id=surveillance#sec-2')).toBe(
      '/library/handbook/surveillance#sec-2',
    );
  });

  it('works without an anchor', () => {
    expect(searchHref('document.html?type=regulations&id=part-1')).toBe('/library/part-1');
  });

  it('returns null for unknown types or missing id', () => {
    expect(searchHref('document.html?type=charts&id=oerk')).toBeNull();
    expect(searchHref('document.html?type=regulations')).toBeNull();
  });

  it('carries the search phrase as ?q before the anchor', () => {
    expect(
      searchHref('document.html?type=regulations&id=part-61#sec-currency', 'night currency'),
    ).toBe('/library/part-61?q=night%20currency#sec-currency');
    // Blank/whitespace queries add no query string.
    expect(searchHref('document.html?type=regulations&id=part-1', '  ')).toBe('/library/part-1');
  });

  it('routes a semantic pointer object identically to the legacy URL', () => {
    // Back-compat shim: when the upstream corpus switches to semantic fields,
    // the frontend needs no change. `kind` (LibraryKind) and legacy `type` both work.
    expect(searchHref({ kind: 'regulations', id: 'part-61', anchor: 'sec-currency' })).toBe(
      '/library/part-61#sec-currency',
    );
    expect(searchHref({ type: 'handbooks', id: 'surveillance', anchor: 'sec-2' })).toBe(
      '/library/handbook/surveillance#sec-2',
    );
    expect(searchHref({ kind: 'charts', id: 'oerk' })).toBeNull();
  });
});

describe('parseSearchUrl', () => {
  it('extracts kind, id and anchor', () => {
    expect(parseSearchUrl('document.html?type=reference&id=ac-68-1#sec-1')).toEqual({
      kind: 'reference',
      id: 'ac-68-1',
      anchor: 'sec-1',
    });
  });

  it('returns null when unroutable', () => {
    expect(parseSearchUrl('document.html?type=charts&id=oerk')).toBeNull();
    expect(parseSearchUrl('nonsense')).toBeNull();
  });
});

describe('toSearchRef', () => {
  it('passes through a semantic object, normalising legacy type to kind', () => {
    expect(toSearchRef({ type: 'handbooks', id: 'surveillance', anchor: 'sec-2' })).toEqual({
      kind: 'handbook',
      id: 'surveillance',
      anchor: 'sec-2',
    });
    expect(toSearchRef({ kind: 'reference', id: 'ac-68-1' })).toEqual({
      kind: 'reference',
      id: 'ac-68-1',
    });
  });

  it('parses a legacy string identically to parseSearchUrl', () => {
    const u = 'document.html?type=reference&id=ac-68-1#sec-1';
    expect(toSearchRef(u)).toEqual(parseSearchUrl(u));
  });

  it('returns null for an unroutable object', () => {
    expect(toSearchRef({ kind: 'charts', id: 'oerk' })).toBeNull();
    expect(toSearchRef({ type: 'regulations', id: '' })).toBeNull();
  });
});
