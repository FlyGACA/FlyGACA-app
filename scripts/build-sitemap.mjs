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
const PRIVATE = new Set(['/account', '/dashboard', '/logbook', '/settings']);
const norm = (p) => (p === '/' ? '/' : `/${p.replace(/^\//, '')}`);

const staticPaths = routerPaths
  .filter((p) => !p.includes(':') && p !== '*')
  .map(norm)
  .filter((p) => !PRIVATE.has(p));
const urls = new Set(['/', ...staticPaths]);

// Expand the dynamic routes we can enumerate from data.
const corpora = [
  ['/library', 'public/data/gacar-index.json'],
  ['/library/reference', 'public/data/reference-index.json'],
  ['/library/handbook', 'public/data/ebooks-index.json'],
];
for (const [base, file] of corpora) {
  for (const d of readJson(file).documents) urls.add(`${base}/${d.slug}`);
}

const guideSlugs = [
  ...read('src/pages/guides/guides.ts')
    .match(/GUIDE_SLUGS\s*=\s*\[([\s\S]*?)\]/)[1]
    .matchAll(/'([^']+)'/g),
].map((m) => m[1]);
for (const slug of guideSlugs) urls.add(`/guides/${slug}`);

const today = new Date().toISOString().slice(0, 10);
const sorted = [...urls].sort();
const body = sorted
  .map(
    (u) =>
      `  <url><loc>${SITE}${u}</loc><lastmod>${today}</lastmod>` +
      `<priority>${u === '/' ? '1.0' : '0.7'}</priority></url>`,
  )
  .join('\n');

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;

const robots = `User-agent: *
Allow: /

Sitemap: ${SITE}/sitemap.xml
`;

writeFileSync(join(root, 'public/sitemap.xml'), xml);
writeFileSync(join(root, 'public/robots.txt'), robots);
console.log(`sitemap: ${sorted.length} URLs (origin ${SITE})`);
