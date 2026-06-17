/**
 * Pure SEO URL helpers — canonical + hreflang for the bilingual single-URL SPA.
 *
 * The app serves one URL per page and switches language client-side, so for
 * crawlers we expose distinct language URLs via a `?lang=` param (honoured by
 * `src/i18n/index.ts`); the canonical stays the clean, param-free path.
 */
export const SITE_ORIGIN =
  (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/$/, '') ??
  'https://flygaca.com';

export const OG_IMAGE = `${SITE_ORIGIN}/img/og-card.png`;

/** Normalize a router path: leading slash, no trailing slash (except root), no query/hash. */
export function normalizePath(path: string): string {
  const clean = (path || '/').split(/[?#]/)[0];
  const withLead = clean.startsWith('/') ? clean : `/${clean}`;
  return withLead.length > 1 ? withLead.replace(/\/+$/, '') : '/';
}

export function canonicalUrl(path: string): string {
  return `${SITE_ORIGIN}${normalizePath(path)}`;
}

export function langUrl(path: string, lang: string): string {
  return `${canonicalUrl(path)}?lang=${lang}`;
}

export interface Alternate {
  hreflang: string;
  href: string;
}

/** hreflang alternates: per-language `?lang=` URLs plus an x-default at the clean URL. */
export function hreflangAlternates(path: string): Alternate[] {
  return [
    { hreflang: 'en', href: langUrl(path, 'en') },
    { hreflang: 'ar', href: langUrl(path, 'ar') },
    { hreflang: 'x-default', href: canonicalUrl(path) },
  ];
}

const OG_LOCALE: Record<string, string> = { en: 'en_US', ar: 'ar_SA' };
export function ogLocale(lang: string): string {
  return OG_LOCALE[lang] ?? 'en_US';
}
