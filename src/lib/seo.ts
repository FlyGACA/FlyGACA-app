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

/**
 * Non-canonical production hosts that serve the *same* build under a different
 * brand/domain. Left indexable they split ranking signals and clutter the
 * branded SERP, so we fold them onto the canonical origin. Preview/staging
 * fronts (`*.vercel.app`, `*.web.app`, `*.netlify.app`, `*.pages.dev`),
 * `localhost`, and the native shell are intentionally excluded.
 */
export const DUPLICATE_HOSTS = new Set(['captadel.com', 'www.captadel.com']);

/**
 * If `loc` is on a known duplicate host, the canonical URL to redirect to
 * (same path/query/hash on the canonical origin); otherwise `null`. Pure so the
 * decision is unit-testable; the actual `location.replace` lives in `main.tsx`.
 */
export function canonicalRedirect(loc: {
  hostname: string;
  pathname: string;
  search: string;
  hash: string;
}): string | null {
  if (!DUPLICATE_HOSTS.has(loc.hostname)) return null;
  return `${SITE_ORIGIN}${loc.pathname}${loc.search}${loc.hash}`;
}

/**
 * Host suffixes of the *mirror* fronts that serve the same build for redundancy
 * (Firebase `*.web.app`, Vercel `*.vercel.app`, Netlify `*.netlify.app`,
 * Cloudflare `*.pages.dev`) plus their PR previews. They must stay live but must
 * NOT be indexed — otherwise Google treats them as duplicates of flygaca.com and
 * may pick one as canonical. `flygaca.com` and `localhost` (the prerender host)
 * are deliberately not matched, so neither the canonical site nor the baked
 * snapshots ever get a noindex.
 */
const MIRROR_HOST_SUFFIXES = ['.web.app', '.vercel.app', '.netlify.app', '.pages.dev'];

/** True if `hostname` is a non-canonical mirror/preview front that should noindex. */
export function isMirrorHost(hostname: string): boolean {
  return MIRROR_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix));
}
