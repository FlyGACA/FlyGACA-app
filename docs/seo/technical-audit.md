# Fly GACA — Technical SEO Audit

_Last reviewed: 2026-06-23 · Scope: the frontend app in this repo_

## Summary

Fly GACA already has a **strong, mature technical-SEO foundation** — among the most complete
you will find on a client-rendered SPA. Per-route metadata, bilingual hreflang, automated
sitemap/robots, canonicalization, duplicate/mirror-host handling, structured data, and an
optional prerender step are all in place and working.

This audit documents what exists (so it is not accidentally rebuilt or regressed), corrects
two inaccurate findings from an earlier draft audit, and lists the small set of genuine,
lower-priority opportunities that remain. **The headline takeaway: the technical foundation
is essentially complete; the growth lever for this site is content + keyword strategy, not
technical remediation** (see `strategy.md`).

## What is already implemented (do not rebuild)

| Area | Where | Notes |
| --- | --- | --- |
| Per-route `<title>` / meta description / OG / Twitter / canonical / hreflang / JSON-LD | `src/lib/usePageMeta.ts` | Single runtime head manager; re-applies on language change so `og:locale` + hreflang stay correct. |
| Canonical + hreflang URL helpers | `src/lib/seo.ts` | Clean param-free canonical; `?lang=en|ar` alternates + `x-default`. |
| Duplicate-host consolidation | `src/lib/seo.ts` (`canonicalRedirect`, `DUPLICATE_HOSTS`) + `main.tsx` + `vercel.json` | Folds `captadel.com` onto the canonical origin (edge 301 + runtime fallback). |
| Mirror/preview-host `noindex` | `src/lib/seo.ts` (`isMirrorHost`) | `*.vercel.app`, `*.web.app`, `*.netlify.app`, `*.pages.dev` get `noindex, follow`; the canonical host and the localhost prerender host are deliberately excluded. |
| JSON-LD builders | `src/lib/jsonld.ts` | `Organization`, `WebSite` (with `SearchAction`), `BreadcrumbList`, `TechArticle`, `Article`, `Course`, `FAQPage`, `SoftwareApplication`, and now `ItemList`. |
| Static Organization + WebSite graph | `index.html` | Present in initial HTML (no JS needed); per-route builders describe the current document. |
| Sitemap + robots | `scripts/build-sitemap.mjs` (runs pre-`vite build`) | ~400+ URLs from the router table + content indexes; per-URL `xhtml:link` hreflang; priority tiers; `lastmod` from content dates. Private/session-gated routes excluded. |
| Optional static prerender | `scripts/prerender.mjs` | Playwright renders public non-library routes + guide slugs to static HTML on Vercel; non-fatal so it can't break a deploy. |
| PWA manifest (EN + AR) + service worker | `vite.config.ts` (`vite-plugin-pwa`) | App-shell precache, `/data/*` network-first; per-language manifest swapped at runtime. |
| Search Console / Bing verification | `vite.config.ts` (`verificationMeta`) | Injected from `VITE_GSC_TOKEN` / `VITE_BING_TOKEN` env vars. |
| Per-route structured data wired in | Home (`FAQPage`), Library/Document (`TechArticle` + breadcrumb), Guides (`Article`), Study (`Course`), Tools (`SoftwareApplication` via `CalcShell`) | See `usePageMeta(...)` calls across `src/pages/**`. |

### Coverage check (verified 2026-06-23)
- **Every public, indexable route sets its own title/description.** The only page without
  `usePageMeta` is `src/pages/account/RequireSession.tsx` — a session-gated wrapper that is
  private and excluded from the sitemap, so this is correct, not a gap.
- **All 55 tool pages** are built on `CalcShell` (`src/components/CalcShell.tsx`), which calls
  `usePageMeta(title, intro, [softwareAppLd(...), breadcrumbLd(...)])`. They all have unique
  titles, descriptions, breadcrumbs and `SoftwareApplication` JSON-LD.
- **Sitemap includes all 55 tool routes and 18 guide routes** (verified against the generated
  `public/sitemap.xml`).

### Corrections to an earlier draft audit
Two findings circulated earlier that are **false** and should be disregarded:
1. _"49 tool pages lack `usePageMeta`."_ Incorrect — `CalcShell` provides it for every tool
   (the draft searched for direct calls in tool files and missed the shared shell).
2. _"FAQ JSON-LD only on Home."_ Incorrect — `About.tsx` and `Pricing.tsx` already emit
   `faqLd(...)` from their visible Q&A copy.

## Change made in this pass

- **Added `ItemList` structured data to the catalog hubs.** New `itemListLd()` builder in
  `src/lib/jsonld.ts` (unit-tested in `tests/jsonld.test.ts`), wired into the Tools index
  (`src/pages/tools/ToolsIndex.tsx`, live tools) and Guides index
  (`src/pages/guides/GuidesIndex.tsx`, all guides). This was the single clearest
  structured-data gap: the catalog pages previously exposed no list schema, so crawlers
  could not read them as ordered lists of their leaf pages. Low-risk, additive, no new copy
  or assets.

## Genuine remaining opportunities (prioritized, mostly optional)

| # | Opportunity | Why it matters | Effort | Status |
| --- | --- | --- | --- | --- |
| 1 | `ItemList` on the Tools and Guides hubs | Lets catalog pages surface as rich lists; helps crawlers map hub → leaf | S | **Done this pass** |
| 2 | `ItemList` / `CollectionPage` on the Study hub (`/study`) and Library section hubs | Same benefit for the other two catalog surfaces | S | Recommended |
| 3 | Per-section Open Graph images (tools / guides / library / study / pricing) | All pages currently share `/img/og-card.png`; differentiated cards lift social/share CTR | M (needs design assets) | Recommended — needs design |
| 4 | Visible HTML breadcrumb nav (not only JSON-LD) on Library/Guides leaf pages | Reinforces IA for users and crawlers; the breadcrumb data already exists | S–M | Recommended |
| 5 | Preload the primary web font in `index.html` | Minor LCP/CLS improvement (Core Web Vitals); fonts are preconnected but not preloaded | S | Recommended |
| 6 | Ensure prerender runs (or an equivalent SSR/snapshot path) on the production host | The SPA depends on JS rendering for most routes; prerender is Vercel-only and non-fatal, so non-prerendered hosts serve a thinner initial HTML to crawlers | M–L | Monitor — verify on the live host |
| 7 | `HowTo` schema on calculators | Could match "how to calculate X" intent — but Google has largely deprecated HowTo rich results, so low ROI | S | Not recommended (low value) |

### Notes on rendering (item 6)
Modern Googlebot renders JavaScript, and the app paints a critical-CSS hero shell in
`index.html` before JS, so the SPA is crawlable. Still, server-rendered or prerendered HTML
is more robust for non-Google crawlers, social unfurlers, and consistency. The existing
`scripts/prerender.mjs` covers this on Vercel; if the production host changes, confirm an
equivalent snapshot/SSR path is in place. This is the only "structural" technical item and
is best validated against the live deployment rather than the repo.

## How to verify (regression checks)
- `npm run typecheck && npm run lint && npm run test && npm run build` — must stay green
  (the test suite includes i18n parity and the JSON-LD builder tests).
- After build, confirm `dist/sitemap.xml` exists and contains the tool/guide routes.
- Spot-check structured data on the running app: open `/tools`, `/guides`, `/about`,
  `/pricing` and confirm the injected `<script type="application/ld+json" data-managed-ld>`
  contains the expected `ItemList` / `FAQPage`. Validate shapes with Google's Rich Results
  Test against the deployed URLs.
- In Search Console: confirm the sitemap is submitted, coverage is clean, and the hreflang
  pairs (`?lang=en` / `?lang=ar` / `x-default`) report no errors.
