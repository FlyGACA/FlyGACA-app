/**
 * Generate public/sitemap.xml + public/robots.txt from the single route table
 * (src/router.tsx) plus the content indexes. Static routes are emitted as-is;
 * the dynamic library/guide routes are expanded from their data. Runs before
 * `vite build` so the fresh files get copied out of public/ into dist/.
 *
 * Override the canonical origin with SITE_URL (defaults to the product domain).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = (process.env.SITE_URL ?? 'https://flygaca.com').replace(/\/$/, '');

const read = (p) => readFileSync(join(root, p), 'utf8');
const readJson = (p) => JSON.parse(read(p));

// Every `path: '...'` from the route table — the single source of truth.
const routerPaths = [...read('src/router.tsx').matchAll(/path:\s*'([^']+)'/g)].map((m) => m[1]);

// Session-gated, user-private routes carry no SEO value — keep them out.
const PRIVATE = new Set([
  '/account',
  '/dashboard',
  '/currency',
  '/logbook',
  '/records',
  '/settings',
]);
// The former Guides + Study hubs now redirect to /learn — don't index the redirects
// (their content + leaf pages live on, and `/learn` carries the hub priority).
const REDIRECTS = new Set(['/guides', '/study']);
const norm = (p) => (p === '/' ? '/' : `/${p.replace(/^\//, '')}`);

const today = new Date().toISOString().slice(0, 10);
const isDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v);

const staticPaths = routerPaths
  .filter((p) => !p.includes(':') && p !== '*')
  .map(norm)
  .filter((p) => !PRIVATE.has(p) && !REDIRECTS.has(p));
// url -> lastmod (ISO date). Default everything to the build date; corpus pages
// override with their own freshness signal below.
const urls = new Map(['/', ...staticPaths].map((p) => [p, today]));

// Expand the dynamic routes we can enumerate from data, dating each entry from
// the source document's effectiveDate/revision (or the index's generated date).
const corpora = [
  ['/library', 'public/data/gacar-index.json'],
  ['/library/reference', 'public/data/reference-index.json'],
  ['/library/handbook', 'public/data/ebooks-index.json'],
];
for (const [base, file] of corpora) {
  const idx = readJson(file);
  const fallback = isDate(idx.generated) ? idx.generated.slice(0, 10) : today;
  for (const d of idx.documents) {
    const lastmod = isDate(d.effectiveDate)
      ? d.effectiveDate.slice(0, 10)
      : isDate(d.revision)
        ? d.revision.slice(0, 10)
        : fallback;
    urls.set(`${base}/${d.slug}`, lastmod);
  }
}

const guidesSrc = read('src/pages/guides/guides.ts');
const guideSlugs = [
  ...guidesSrc.match(/GUIDE_SLUGS\s*=\s*\[([\s\S]*?)\]/)[1].matchAll(/'([^']+)'/g),
].map((m) => m[1]);
// Drafts are unlisted — omit any guide whose GUIDE_STATUS entry is 'draft'.
const draftGuides = new Set(
  [
    ...(guidesSrc.match(/GUIDE_STATUS[^{]*\{([\s\S]*?)\n\};/)?.[1] ?? '').matchAll(
      /'([^']+)':\s*'draft'/g,
    ),
  ].map((m) => m[1]),
);
for (const slug of guideSlugs) {
  if (!draftGuides.has(slug)) urls.set(`/guides/${slug}`, today);
}

// Aerodrome directory → one detail page per curated ICAO (the /tools/aerodromes/:icao
// route resolves each from airports.json). Dated from the index's generated date.
const aero = readJson('public/data/aerodromes-index.json');
const aeroDate = isDate(aero.generated) ? aero.generated.slice(0, 10) : today;
for (const d of aero.documents) urls.set(`/tools/aerodromes/${d.icao}`, aeroDate);

// Prep packs → one detail page per pack id (src/pages/study/packCatalog.ts). Each pack
// page carries a unique localized name + description regardless of Pro gating.
const packIds = [...read('src/pages/study/packCatalog.ts').matchAll(/\bid:\s*'([^']+)'/g)].map(
  (m) => m[1],
);
for (const id of packIds) urls.set(`/study/packs/${id}`, today);
// Not indexed by design: chart sheets and study sheets (selected by ?param on a
// single viewer page, no per-item URL) and the 1,736 definition terms (search-only).

// Priority tiers: home → hubs → reference/guide content → tools → legal → rest.
const HUBS = new Set(['/library', '/tools', '/learn', '/guides', '/study']);
const LEGAL = new Set(['/disclaimer', '/terms', '/privacy', '/safety']);
function priority(u) {
  if (u === '/') return '1.0';
  if (HUBS.has(u)) return '0.9';
  if (u.startsWith('/library/') || u.startsWith('/guides/')) return '0.8';
  if (u.startsWith('/tools/')) return '0.7';
  if (LEGAL.has(u)) return '0.3';
  return '0.6';
}

// Per-URL hreflang alternates mirror src/lib/seo.ts: English at the clean path,
// Arabic under /ar, x-default at the clean path. The same cluster is emitted on
// both the English and Arabic <url> entries (reciprocal hreflang).
const arLoc = (u) => `${SITE}/ar${u === '/' ? '' : u}`;
function alternates(u) {
  return (
    `<xhtml:link rel="alternate" hreflang="en" href="${SITE}${u}"/>` +
    `<xhtml:link rel="alternate" hreflang="ar" href="${arLoc(u)}"/>` +
    `<xhtml:link rel="alternate" hreflang="x-default" href="${SITE}${u}"/>`
  );
}

const urlEntry = (u, loc, lastmod) =>
  `  <url><loc>${loc}</loc><lastmod>${lastmod}</lastmod>` +
  `<priority>${priority(u)}</priority>${alternates(u)}</url>`;

// The content/UI routes that get a prerendered Arabic twin (SEO-PLAN 0.3):
// static pages + hubs + tools + non-draft guides. Excludes the reader corpus,
// aerodromes and packs (no Arabic body prerendered for those yet).
const arPaths = new Set(['/', ...staticPaths]);
for (const slug of guideSlugs) if (!draftGuides.has(slug)) arPaths.add(`/guides/${slug}`);

const sorted = [...urls.keys()].sort();
const arSorted = [...arPaths].sort();
const body = [
  ...sorted.map((u) => urlEntry(u, `${SITE}${u}`, urls.get(u))),
  ...arSorted.map((u) => urlEntry(u, arLoc(u), urls.get(u) ?? today)),
].join('\n');

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${body}
</urlset>
`;

// Fly GACA is an independent, educational Saudi civil-aviation library that wants
// to be crawled and cited. All agents are allowed; the AI answer engines and search
// crawlers below are listed explicitly to document that intent (a bot that matches
// its own group ignores the `*` group, so each must carry its own `Allow: /`). In
// 2026 being uncitable is fatal — never add a `Disallow` here to fence out a bot.
const CITATION_BOTS = [
  'GPTBot', // OpenAI training/index crawler
  'OAI-SearchBot', // ChatGPT search index
  'ChatGPT-User', // ChatGPT live user-triggered fetches
  'ClaudeBot', // Anthropic crawler
  'Claude-Web', // Anthropic live fetches
  'PerplexityBot', // Perplexity index crawler
  'Perplexity-User', // Perplexity live user-triggered fetches
  'Google-Extended', // Gemini / Vertex AI grounding opt-in
  'Applebot-Extended', // Apple Intelligence opt-in
  'Bingbot', // Bing / Copilot
];
const robots = `# Fly GACA — independent educational Saudi civil-aviation library.
# We want to be crawled and cited; every agent is allowed. See scripts/build-sitemap.mjs.
User-agent: *
Allow: /

# AI answer engines & search crawlers — explicitly welcomed (documents intent).
${CITATION_BOTS.map((ua) => `User-agent: ${ua}\nAllow: /\n`).join('\n')}
Sitemap: ${SITE}/sitemap.xml
`;

writeFileSync(join(root, 'public/sitemap.xml'), xml);
writeFileSync(join(root, 'public/robots.txt'), robots);
console.log(
  `sitemap: ${sorted.length} en + ${arSorted.length} ar = ${sorted.length + arSorted.length} URLs (origin ${SITE})`,
);
