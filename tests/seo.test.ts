import { describe, expect, it } from 'vitest';
import {
  SITE_ORIGIN,
  AR_PREFIX,
  normalizePath,
  canonicalUrl,
  stripArPrefix,
  isArabicPath,
  hreflangAlternates,
  localeRedirect,
  ogLocale,
  ogImageFor,
  canonicalRedirect,
  isMirrorHost,
} from '../src/lib/seo';

describe('normalizePath', () => {
  it('strips query/hash and trailing slashes, keeps root', () => {
    expect(normalizePath('/')).toBe('/');
    expect(normalizePath('/library/')).toBe('/library');
    expect(normalizePath('/tools/crosswind?foo=1#x')).toBe('/tools/crosswind');
    expect(normalizePath('tools')).toBe('/tools');
  });
});

describe('canonical urls', () => {
  it('builds an origin-absolute clean canonical (English default)', () => {
    expect(canonicalUrl('/library/part-1')).toBe(`${SITE_ORIGIN}/library/part-1`);
    expect(canonicalUrl('/library/part-1', 'en')).toBe(`${SITE_ORIGIN}/library/part-1`);
  });
  it('prefixes /ar for the Arabic canonical', () => {
    expect(canonicalUrl('/pricing', 'ar')).toBe(`${SITE_ORIGIN}${AR_PREFIX}/pricing`);
    expect(canonicalUrl('/', 'ar')).toBe(`${SITE_ORIGIN}${AR_PREFIX}`);
  });
  it('never double-prefixes an already /ar-prefixed path', () => {
    expect(canonicalUrl('/ar/pricing', 'ar')).toBe(`${SITE_ORIGIN}${AR_PREFIX}/pricing`);
    expect(canonicalUrl('/ar/pricing', 'en')).toBe(`${SITE_ORIGIN}/pricing`);
  });
});

describe('stripArPrefix / isArabicPath', () => {
  it('strips the /ar locale prefix down to the clean path', () => {
    expect(stripArPrefix('/ar')).toBe('/');
    expect(stripArPrefix('/ar/tools/crosswind')).toBe('/tools/crosswind');
    expect(stripArPrefix('/tools/crosswind')).toBe('/tools/crosswind');
    // `/archive` must not be mistaken for the /ar prefix.
    expect(stripArPrefix('/archive')).toBe('/archive');
  });
  it('detects the Arabic locale root and its descendants only', () => {
    expect(isArabicPath('/ar')).toBe(true);
    expect(isArabicPath('/ar/pricing')).toBe(true);
    expect(isArabicPath('/pricing')).toBe(false);
    expect(isArabicPath('/archive')).toBe(false);
  });
});

describe('hreflangAlternates', () => {
  it('emits en (clean), ar (/ar) and x-default (clean), language-independent', () => {
    const alts = hreflangAlternates('/chat');
    expect(alts.map((a) => a.hreflang)).toEqual(['en', 'ar', 'x-default']);
    expect(alts[0].href).toBe(`${SITE_ORIGIN}/chat`);
    expect(alts[1].href).toBe(`${SITE_ORIGIN}${AR_PREFIX}/chat`);
    expect(alts[2].href).toBe(`${SITE_ORIGIN}/chat`);
  });
  it('emits the same cluster whether given the clean or /ar path', () => {
    expect(hreflangAlternates('/ar/chat')).toEqual(hreflangAlternates('/chat'));
  });
});

describe('localeRedirect', () => {
  it('moves an Arabic boot on a clean URL to the /ar path', () => {
    expect(localeRedirect('/tools/crosswind', 'ar')).toBe(`${AR_PREFIX}/tools/crosswind`);
    expect(localeRedirect('/', 'ar')).toBe(AR_PREFIX);
  });
  it('moves an English boot on an /ar URL back to the clean path', () => {
    expect(localeRedirect('/ar/tools/crosswind', 'en')).toBe('/tools/crosswind');
    expect(localeRedirect('/ar', 'en')).toBe('/');
  });
  it('returns null when the URL already matches the language (loop-safe)', () => {
    expect(localeRedirect('/tools/crosswind', 'en')).toBeNull();
    expect(localeRedirect('/ar/tools/crosswind', 'ar')).toBeNull();
  });
});

describe('ogLocale', () => {
  it('maps languages and defaults to en_US', () => {
    expect(ogLocale('ar')).toBe('ar_SA');
    expect(ogLocale('en')).toBe('en_US');
    expect(ogLocale('zz')).toBe('en_US');
  });
});

describe('ogImageFor', () => {
  it('returns the per-section card for a known section (incl. leaf pages)', () => {
    expect(ogImageFor('/tools')).toBe(`${SITE_ORIGIN}/img/og-tools.png`);
    expect(ogImageFor('/tools/crosswind?foo=1')).toBe(`${SITE_ORIGIN}/img/og-tools.png`);
    expect(ogImageFor('/guides/saudi-ppl-requirements')).toBe(`${SITE_ORIGIN}/img/og-guides.png`);
    expect(ogImageFor('/study/quiz')).toBe(`${SITE_ORIGIN}/img/og-study.png`);
  });
  it('falls back to the default card elsewhere', () => {
    expect(ogImageFor('/')).toBe(`${SITE_ORIGIN}/img/og-card.png`);
    expect(ogImageFor('/about')).toBe(`${SITE_ORIGIN}/img/og-card.png`);
  });
});

describe('canonicalRedirect', () => {
  it('folds a duplicate host onto the canonical origin, preserving path/query/hash', () => {
    expect(
      canonicalRedirect({
        hostname: 'captadel.com',
        pathname: '/pricing',
        search: '?lang=ar',
        hash: '#faq',
      }),
    ).toBe(`${SITE_ORIGIN}/pricing?lang=ar#faq`);
    expect(
      canonicalRedirect({ hostname: 'www.captadel.com', pathname: '/', search: '', hash: '' }),
    ).toBe(`${SITE_ORIGIN}/`);
  });

  it('returns null for the canonical host, previews, localhost and native', () => {
    for (const hostname of [
      'flygaca.com',
      'flygaca-app.web.app',
      'flygaca-app-git-x.vercel.app',
      'localhost',
    ]) {
      expect(canonicalRedirect({ hostname, pathname: '/tools', search: '', hash: '' })).toBeNull();
    }
  });
});

describe('isMirrorHost', () => {
  it('matches the mirror/preview fronts that must noindex', () => {
    for (const hostname of [
      'flygaca-app.web.app',
      'flygaca-app-git-claude-x.vercel.app',
      'flygaca.netlify.app',
      'flygaca.pages.dev',
    ]) {
      expect(isMirrorHost(hostname)).toBe(true);
    }
  });

  it('does NOT match the canonical host or the prerender host', () => {
    for (const hostname of ['flygaca.com', 'www.flygaca.com', 'localhost', '127.0.0.1']) {
      expect(isMirrorHost(hostname)).toBe(false);
    }
  });
});
