# Technical SEO reference — rendering, i18n, performance, indexing ops

## Rendering pipeline (protect this above all)

Two layers, both must stay healthy:

1. **Head snapshots (guaranteed)** — `scripts/prerender-head.mjs`, runs inside `npm run build`. Node-only, writes each route's `<head>` (title/description/canonical/hreflang/OG/JSON-LD) into `dist/<route>/index.html`. This is the floor: even a broken body prerender leaves correct metadata.
2. **Full-body prerender (the AI layer)** — `scripts/prerender.mjs` (Playwright), runs inside `npm run deploy` before `firebase deploy`. This is what makes content visible to non-JS crawlers.

Invariants to enforce when touching either:
- Coverage: every indexable URL in `public/sitemap.xml` should have a body-prerendered file. Add/keep a coverage check that diffs sitemap routes vs `dist/` output and **fails the deploy** on gaps (a silent prerender skip = invisible content).
- The SPA fallback trick in `index.html` (home hero removed on non-home routes) must not leak into prerendered pages.
- Per-route head values come from `usePageMeta`; `index.html` holds only homepage/x-default baselines. Keep `index.html` ↔ `src/lib/seo.ts` in sync (both carry comments marking the pairing).
- Mirrors (Vercel/Netlify) stay `noindex` with 301s / canonicals to `https://flygaca.com` — one canonical host, always.

## hreflang & the bilingual URL model

Current model: one path per page; `?lang=en` / `?lang=ar` variants; head + sitemap declare `hreflang="en"`, `"ar"`, `x-default`. This is valid (Google supports parameter URLs in hreflang) — the risks are practical:

- **The `ar` variant must be crawlable as its own document.** Verify the body prerender renders `?lang=ar` pages (Arabic text in HTML, `<html lang="ar" dir="rtl">`). If it only renders default-language bodies, Arabic content is invisible to AI crawlers — a large loss, since Arabic queries are the growth market and Arabic voice search in KSA is growing fast.
- Consider `ar-SA` alongside `ar` in hreflang when touching the alternates (Gulf targeting); keep `x-default` → the parameterless URL.
- Keep head-hreflang and sitemap-hreflang identical (mismatches degrade trust in both).
- A future `/ar/...` path migration is the textbook-ideal model but is a large refactor with redirect risk; do not undertake it casually — the pragmatic priority is making the current `?lang=ar` variants fully prerendered and consistent.
- Arabic metadata is authored, not translated: separate keyword intent per language (see content-eeat.md).

## Core Web Vitals (2026 state)

Thresholds: LCP ≤ 2.5s (aim 2.0), INP ≤ 200ms, CLS ≤ 0.1 — measured on **field data**, and CrUX now attributes SPA soft navigations properly, so route-change jank is no longer hidden.

Repo-specific watchpoints:
- **INP** is the metric most sites fail. Danger zones here: the library full-text search (the ~19 MB `library-search.json` is lazy/streamed — keep it that way; keep filtering off the main thread or chunked; `useDebouncedValue` exists — use it), heavy calculators, and language toggle (document-wide RTL flip). Pattern: update UI first, defer heavy work (`setTimeout`/`requestIdleCallback`/worker).
- **LCP**: home is handled (critical-CSS hero in `index.html`). Check content templates: the LCP element on library/guide pages should be server-present text, not a late-loading element. Fonts are self-hosted with `display: swap` — keep it.
- **CLS**: reserve space for lazy content and OG images; test both directions (RTL flips can shift layout).
- Measure with real field data: add `web-vitals` reporting into the site's own analytics (Firebase is the primary host, so don't rely on Vercel Speed Insights, which only sees the mirror), plus GSC CWV report per URL group.

## Indexing operations

- **Sitemap**: `scripts/build-sitemap.mjs` runs in every build. Keep `lastmod` truthful from corpus metadata — Google uses it for recrawl scheduling and ignores it if it lies.
- **IndexNow**: add a post-deploy step that pings IndexNow (Bing/Copilot ecosystem) with changed URLs — cheap, instant recrawl for the Microsoft/OpenAI answer stack. Google ignores IndexNow; for Google, accurate sitemaps + internal links are the lever.
- **404/redirect hygiene**: SPA fallback must still serve real 404 status (via prerendered 404 handling) for unknown routes where possible; `public/_redirects` / `firebase.json` own redirects — audit for chains and mixed hosts.
- **Search Console + Bing Webmaster**: both verified; check Pages report after each large content release; watch "Crawled - currently not indexed" for thin/duplicate signals.

## Checklist for any technical SEO change

1. `npm run build` clean; inspect a sample of `dist/<route>/index.html`.
2. No-JS content check (curl with AI-bot UAs) on affected routes.
3. Lighthouse or `npm run test:e2e` smoke where interaction changed (INP).
4. `npm run verify` green.
5. If URLs changed: sitemap regenerated, redirects added, GSC/IndexNow informed.
