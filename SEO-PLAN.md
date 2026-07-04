# Fly GACA — 2026 SEO plan

The live, checkbox-tracked backlog for search + AI-answer visibility. This is the shared
memory across SEO sessions — **update it as items complete** (tick the box, add the date, note
follow-ups). Seeded 2026-07-04 from the `flygaca-seo` skill template (`references/plan.md`) and
reconciled against the actual repo + a live production audit — several template items were already
built, and the audit surfaced a live P0 incident (see below).

**The 2026 target:** AI answers (Google AI Overviews/AI Mode, ChatGPT, Perplexity, Gemini) absorb a
large share of clicks; visibility = being the *cited source*. That requires, in priority order:
crawlable HTML (most AI bots don't run JS), answer-first structure, verifiable dated facts with named
sources, freshness, E-E-A-T + brand footprint, then schema. Fly GACA's cite-the-exact-Part/section
ethos is exactly what these systems reward — lean into it.

Status legend: `[x]` done · `[~]` partial (gap named) · `[ ]` not started.
Effort: S <½ day · M ~1 day · L multi-day.

---

## 🚨 P0 INCIDENT (found 2026-07-04 by `npm run audit:ai`) — the live site is uncrawlable

The audit script (item 0.1) run against production found **every sampled URL failing on two
independent, citation-fatal counts**:

1. **The canonical domain is `noindex`.** `flygaca.com` (apex) 308-redirects to `www.flygaca.com`,
   and **every `www.flygaca.com` response carries `X-Robots-Tag: noindex, follow`** — so the entire
   production site is telling Google/Bing/AI crawlers *do not index*. Root cause: production is served
   by **Vercel** (both apex and www report `server: Vercel`), and the `vercel.json` noindex rule —
   written to keep *mirror* hosts out of the index — matches `www.flygaca.com` because it isn't the
   exact bare `flygaca.com` host. The apex→www redirect then funnels every visitor onto the noindexed
   host. The pages' own `<link rel="canonical">` points back at bare `flygaca.com`, which just
   redirects to the noindexed www again.
2. **Bodies are the SPA shell, not prerendered content.** Every route returns ~15–410 chars of visible
   text, an empty `#root`, the home-hero placeholder leaking onto non-home routes, and **no
   `<footer>`/`<main>`**. Root cause: the body prerender (`scripts/prerender.mjs`) only runs in the
   **Firebase** deploy path (`npm run deploy`); Vercel builds with `npm run build`, which runs only the
   *head* prerender. So even where indexing were allowed, there'd be no crawlable content.

This predates this session's changes (infra/host config, not code touched here). It supersedes the
rest of the plan: **fix host + indexability first, or every downstream SEO item is invisible.**

- [ ] **P0.a — Decide the canonical host & kill the noindex (P0, S–M).** Either (a) make **Firebase**
      the served host for `flygaca.com` (so `npm run deploy`'s body prerender is what ships), or (b)
      commit to **Vercel as primary** and run the body prerender in the Vercel build + fix the noindex
      rule to treat `www.flygaca.com` + bare `flygaca.com` as the *canonical* host (indexable), not a
      mirror. Pick one host; make the apex and www agree; the indexable host must match the
      sitemap/canonical (non-www today — so either serve non-www indexable, or move canonical to www).
- [ ] **P0.b — Ensure the served host body-prerenders (P0, M).** Whichever host wins P0.a must serve
      `scripts/prerender.mjs` output. If Vercel: add the prerender step to its build (needs Chromium in
      the Vercel build) or a prerender/ISR equivalent. Re-run `npm run audit:ai` until green.
- [ ] **P0.c — Reconcile the redirect & canonical (P0, S).** apex↔www redirect direction must point at
      the indexable canonical host and match `src/lib/seo.ts` `SITE` + the sitemap. No
      canonical→redirect→noindex chains.

DoD for the incident: `npm run audit:ai` exits 0 (all sampled URLs indexable + body-visible to
GPTBot/ClaudeBot/PerplexityBot/OAI-SearchBot).

---

## Phase 0 — Verify & harden the crawl foundation (P0)

- [x] **0.1 No-JS visibility audit (S).** `scripts/audit-ai-visibility.mjs` + `npm run audit:ai`.
      Fetches the live sitemap, samples route types × `?lang` variants, requests each with the AI-bot
      UAs + a browser control, and asserts both **indexable** (no `noindex` header/meta) and
      **body-visible** (real `<footer>`/`<main>` + ≥600 chars, not the SPA shell). Exits non-zero on
      failure (CI-cron ready; intentionally *not* in `verify`/`deploy` — it's a network check).
      *Done 2026-07-04. First run immediately surfaced the P0 incident above.*
- [~] **0.2 Prerender coverage gate (M).** `scripts/prerender.mjs` warns (`console.warn`) when the
      corpus is capped, but the cap is `PRERENDER_MAX ?? 400` and the step is **non-fatal by design**
      (`process.exit(0)` always; CI comment: "a prerender failure never blocks the deploy"). There is
      **no** sitemap↔dist coverage gate that fails the deploy. **Live risk:** the sitemap already has
      530 URLs vs a 400 cap → ~130 reader pages are silently skipped on every Firebase deploy. *To do:*
      raise the cap with headroom (≥560) and add a `check-prerender-coverage.mjs` that diffs
      `public/sitemap.xml` vs body-prerendered `dist/` files and **fails** `deploy`. (Note: moot for
      Vercel, which prerenders no bodies at all — see P0.b.)
- [ ] **0.3 Arabic variant prerender (M).** Structural gap: static hosts resolve by path only, so under
      the `?lang=` model the Arabic body is never served pre-rendered — a no-JS crawler always gets the
      default-language body. Confirmed by 0.1 (Arabic body present on 0/12 `?lang=ar` URLs, though that
      run is dominated by the P0 shell issue). Needs a deliberate decision: dual-render Arabic snapshots
      to distinct paths (+ a serving strategy) or revisit the URL model for content routes. Gates Phase 3.
- [x] **0.4 robots/headers bot posture (S).** `robots.txt` (generated by `scripts/build-sitemap.mjs`)
      now carries explicit `Allow: /` stanzas documenting intent for GPTBot, OAI-SearchBot, ChatGPT-User,
      ClaudeBot, Claude-Web, PerplexityBot, Perplexity-User, Google-Extended, Applebot-Extended, Bingbot;
      wildcard still `Allow: /`. Mirrors confirmed `noindex` in `vercel.json`/`public/_headers`. *Done
      2026-07-04.* ⚠️ Caveat: the noindex rule is currently over-matching the canonical host — see P0.a.

## Phase 1 — Answer-first content layer (P0–P1)

- [ ] **1.1 KeyFacts component (M).** Reusable bilingual "Key facts" block (3–6 self-contained bullets +
      governing Part/section) under the H1 of guides and Part landings; text from i18n; wired into
      JSON-LD via `usePageMeta`. *Today: guides show intro + a takeaways `<aside>`, no key-facts block.*
- [ ] **1.2 FAQ component + FAQPage schema (M).** Visible FAQ fed by i18n; `faqLd` builder emits FAQPage
      matching on-page text verbatim. *Today: the `faqLd` builder exists and is wired on `/about` only;
      guides have no FAQ.* Roll out to the four money guides first
      (`how-to-become-a-pilot-in-saudi-arabia` / `saudi-ppl-requirements`, `gaca-medical-class-1`,
      `foreign-license-conversion-to-gaca`, `icao-english-saelpt`). Each answer self-contained + its own
      verify-against-GACA caveat, in **both** languages.
- [ ] **1.3 Answer-first rewrite of money pages (L).** H1 as searched, answer complete in first ~200
      words, tables for enumerables, provenance footer. EN + AR authored separately (not translated).
- [ ] **1.4 Part landing summaries (L).** Each GACAR Part landing gets a human summary (what it covers,
      who it applies to, most-referenced sections). *Today: `Document.tsx` renders machine-extracted
      corpus only — no summary panel.* Derive from the Part's actual text; never fabricate. Top-15 by
      traffic first.
- [ ] **1.5 Glossary page (M).** Bilingual GACAR/aviation glossary; `DefinedTermSet`/`DefinedTerm`
      schema; internal-linked. *Today: no route/component/i18n keys, and the corpus already holds 1,736
      definition terms (currently search-only) to seed it.* ≥50 terms, both languages, in sitemap.

## Phase 2 — Structured data upgrades (P1)

- [x] **2.1 BreadcrumbList site-wide (S).** `breadcrumbLd` in `jsonld.ts`, emitted via `usePageMeta` on
      library docs, guides, tools, about. *Largely done; spot-check any content route added later.*
- [~] **2.2 dateModified/dateReviewed everywhere (M).** `articleLd`/`techArticleLd` accept `dateModified`
      and `Document.tsx` feeds corpus `effectiveDate`/`revision`; **but** no visible on-page date and no
      review dates on guides. *To do:* surface the same date on-page; add guide review dates.
- [~] **2.3 Course/LearningResource for Ground School (M).** `courseLd` builder exists but is **not
      wired** to the ground-school/study routes yet.
- [~] **2.4 Organization entity hygiene (S).** `organizationLd` with stable `@id` ships site-wide; verify
      `sameAs` real profiles + `contactPoint` (i@flygaca.com), consistent name/logo. No accreditation
      claims.
- [~] **2.5 JSON-LD validation in CI (M).** `tests/jsonld.test.ts` + `tests/seo.test.ts` +
      `tests/page-meta.test.tsx` cover the builders in `npm run test`. *Missing:* a
      `scripts/validate-jsonld.mjs` that walks the prerendered `dist/` and fails CI on invalid emitted
      schema (as opposed to unit-testing the builders).

## Phase 3 — Arabic as a first-class search track (P1) — gated on 0.3

- [ ] **3.1 Arabic keyword & intent pass (M).** Research Arabic queries natively; adjust AR
      titles/descriptions in `ar.json` for the money pages; document query→URL map here.
- [~] **3.2 hreflang refinement (S).** `src/lib/seo.ts` emits `en` / `ar` / `x-default` via `?lang=`
      (head + sitemap match). *Consider:* `ar-SA` alongside `ar` (Gulf targeting); `og:locale` already
      maps `ar → ar_SA`.
- [ ] **3.3 Arabic answer-first content (L).** AR KeyFacts/FAQ/answer blocks in MSA with Gulf awareness
      (depends on 0.3, 1.1–1.3). Add an Arabic assistant audit (ask in Arabic) to the quarterly check.

## Phase 4 — Performance / CWV (P1–P2)

- [~] **4.1 Field-data plumbing (S).** Uses `@vercel/analytics` + Speed Insights (`src/lib/analytics.ts`,
      web+prod only). *Gap per skill:* Firebase is meant to be the primary host, so Vercel-mirror-only
      field data misses real users — add `web-vitals` reporting into own analytics; review GSC CWV
      monthly. (Interacts with the P0 host decision.)
- [ ] **4.2 INP audit & fixes (M).** Library search input (debounce, chunk/worker the ~19 MB index
      filtering — `useDebouncedValue` exists), calculators, language/RTL toggle. Target <200ms field INP.
- [ ] **4.3 Content-page LCP & CLS pass (M).** LCP = server-present text on library/guide templates;
      reserve space for lazy blocks; test RTL.

## Phase 5 — Freshness & indexing ops (P1–P2)

- [ ] **5.1 AIRAC freshness loop (M).** Aerodrome/chart pages show current AIRAC cycle + last-reviewed;
      `dateModified` bumps from the data pipeline each cycle; sitemap `lastmod` follows real changes.
      *Today: AIRAC math exists (`src/calc/airac.ts`, `changeTracking.ts`) but is shown only on
      `/tools/airac`, not on charts/aerodromes/library.*
- [ ] **5.2 IndexNow on deploy (S).** Post-deploy ping with changed URLs (Bing/Copilot; Google ignores
      it — sitemaps cover Google). *Not started.*
- [ ] **5.3 Quarterly refresh calendar (S, recurring).** Top ~20 pages re-verified/refreshed quarterly
      (AI citation decay ~3 months); log dates here.
- [ ] **5.4 AI-visibility measurement (S, recurring).** Analytics segment for AI referrers
      (chatgpt.com, perplexity.ai, gemini.google.com, copilot.microsoft.com); quarterly assistant audit
      EN+AR (10 canonical questions, log citations). Pair with a scheduled `npm run audit:ai` run.

## Phase 6 — E-E-A-T & off-site authority (P1–P2, largely non-code)

- [~] **6.1 About/methodology page (M).** `src/pages/About.tsx` has methodology, FAQ, contact +
      org/article/faq/breadcrumb schema. *To add:* `AboutPage` type, an explicit corrections policy,
      update cadence.
- [~] **6.2 Provenance component (S).** *Today:* an inline "verify against GACA" line in `Document.tsx`
      + the global `<Disclaimer />`; no reusable "Source: GACAR Part X §Y — verify at gaca.gov.sa · last
      reviewed DATE" component. Formalize it and put it on all content pages.
- [ ] **6.3 Off-site presence programme (recurring, human-led).** Honest participation where Saudi/GCC
      aviation students gather (Reddit, PPRuNe ME, X, flight-school communities); school/instructor
      partnerships; original-data releases (AIRAC change notes, aerodrome dataset). No astroturfing.
- [ ] **6.4 Entity grounding (S).** Consistent naming/profiles; Wikidata entry; Wikipedia only if
      genuinely notable.

---

## Explicitly deprioritized (2026 evidence)

- **llms.txt tooling** — keep `public/llms.txt` accurate, invest nothing more (AI crawlers essentially
  never fetch it; no measured citation effect).
- **`/ar/` path migration** — textbook-ideal but high-risk refactor; revisit only if the `?lang=ar`
  parameter-variant prerendering (0.3) proves insufficient in GSC/citation data.
- **Mass content generation** — demoted by 2025–26 core updates and corrosive to the trust profile.

## Suggested order of execution

**P0 incident (P0.a → P0.b → P0.c) first — nothing below matters while the site is noindex + shell.**
Then 0.2 → 0.3 → 1.1 → 1.2 → 1.3 (with 2.2, 2.5 alongside content work) → 3.x → 1.4/1.5 → 4.x → 5.x →
6.x. Phases 5.3/5.4/6.3 are recurring.

## Session log

- **2026-07-04** — Seeded this plan (reconciled to real repo state). Shipped **0.1**
  (`scripts/audit-ai-visibility.mjs` + `npm run audit:ai`) and **0.4** (AI-bot stanzas in the generated
  `robots.txt`). First audit run surfaced the **P0 incident** (canonical domain `noindex` + shell-only
  bodies, served by Vercel) — filed above; not yet fixed. Corrected an earlier mis-read that 0.2's
  coverage gate already existed — it does not (only a non-fatal warn).
