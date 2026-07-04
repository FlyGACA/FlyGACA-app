# Fly GACA — 2026 SEO plan (template)

The live, checkbox-tracked copy of this plan lives at `SEO-PLAN.md` in the repo root — update that one as items complete. If it's missing, seed it from this file.

This plan targets the 2026 reality: AI answers (Google AI Overviews/AI Mode, ChatGPT, Perplexity, Gemini) absorb a large share of clicks, and visibility = being the cited source. The repo's technical baseline is already strong (per-route meta, head+body prerender, 530-URL sitemap with hreflang, JSON-LD, clean robots). The plan therefore: verifies and hardens that foundation (Phase 0), makes content extractable and citable (Phases 1–2), treats Arabic as a first-class track (Phase 3), then performance, freshness ops, and authority (Phases 4–6).

Each item: priority (P0 = do first), effort (S <½ day, M ~1 day, L multi-day), files, definition of done, and a paste-ready Claude Code prompt. Work through the skill: read the matching reference file before coding; every item ends with `npm run verify` green and this plan updated.

---

## Phase 0 — Verify & harden the crawl foundation (P0)

**0.1 No-JS visibility audit (S).** Prove AI crawlers see full content. Script `scripts/audit-ai-visibility.mjs`: fetch ~25 production URLs (sample every route type × both `?lang` variants) with GPTBot/ClaudeBot/PerplexityBot/OAI-SearchBot/browser UAs; assert expected body text present; report a coverage table.
Files: new script; package.json script entry. DoD: script runs green against production; failures filed as bugs.
Prompt: *"Using the flygaca-seo skill, build scripts/audit-ai-visibility.mjs per plan item 0.1 and run it against https://flygaca.com."*

**0.2 Prerender coverage gate (M).** Diff `public/sitemap.xml` URLs vs body-prerendered files in `dist/`; fail `npm run deploy` on gaps; warn on routes prerendered but absent from the sitemap.
**Confirmed live bug (2026-07-03, eval run):** the corpus already needs ~405 prerendered routes against the 400 default cap — ~5 library documents are silently skipped on every deploy, and the prerender step is non-fatal by design. This is a today-problem, not a hypothetical.
Files: `scripts/prerender.mjs` (or a new check script chained in deploy). DoD: deliberately removing a route from prerender breaks deploy; cap raised with headroom.
Prompt: *"Per flygaca-seo plan item 0.2, raise the prerender route cap with headroom and add a sitemap↔prerender coverage gate that fails the deploy."*

**0.3 Arabic variant prerender check (M).** Confirm `?lang=ar` pages prerender with Arabic body + `<html lang="ar" dir="rtl">`. This gates all of Phase 3.
**Confirmed structural gap (2026-07-03):** static hosts resolve files by *path only*, so under the `?lang=` model the Arabic body is never served pre-rendered — a no-JS crawler always gets the default-language body. Fixing requires either dual-rendering Arabic snapshots to distinct paths (plus a serving strategy) or revisiting the URL model for content routes. Decide deliberately; don't paper over it.
DoD: curl of an Arabic content URL shows Arabic content without JS, or a documented decision on the chosen mechanism.

**0.4 robots/headers bot posture (S).** Add explicit Allow stanzas for GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot, Google-Extended, Bingbot to `public/robots.txt` (documenting intent); audit `public/_headers`, `_redirects`, `firebase.json` for anything that could challenge/block bot UAs; confirm mirrors stay noindex.

## Phase 1 — Answer-first content layer (P0–P1)

**1.1 KeyFacts component (M).** Reusable bilingual "Key facts" block (3–6 self-contained factual bullets + governing Part/section) rendered directly under the H1 of guides and Part landing pages; text from i18n; wired into JSON-LD via `usePageMeta`.
DoD: component + spec; deployed on ≥1 guide as pattern-setter; visible in prerendered HTML.

**1.2 FAQ component + FAQPage schema (M).** Visible FAQ section fed by i18n keys; `jsonld.ts` builder emits FAQPage matching on-page text verbatim. Roll out to the four money guides first (licensing, medical, conversion, ELP). Source questions from Captain Adel logs + GSC.
DoD: FAQ live on 4 guides, both languages, schema validates.

**1.3 Answer-first rewrite of money pages (L).** Apply the pattern in `references/ai-search.md` (H1 as searched, answer complete in first ~200 words, tables for enumerables, provenance footer) to licensing/medical/conversion/ELP guides — EN and AR authored separately.
DoD: 4 guides restructured; no-JS check shows the answer block; facts traceable to corpus.

**1.4 Part landing summaries (L).** Each GACAR Part landing gets a human summary: what it covers, who it applies to, most-referenced sections. Batchable (e.g. 10 Parts/session); template + i18n keys; never fabricate — derive from the Part's actual text.
DoD: top-15 Parts by traffic done first; rest scheduled.

**1.5 Glossary page (M).** Bilingual aviation/GACAR glossary; `DefinedTermSet`/`DefinedTerm` schema; internal-linked from content.
DoD: glossary route live with ≥50 terms, both languages, schema valid, in sitemap.

## Phase 2 — Structured data upgrades (P1)

**2.1 BreadcrumbList site-wide (S).** Builder in `jsonld.ts` from route ancestry; emitted by `usePageMeta` on all content routes; localized names.
**2.2 dateModified/dateReviewed everywhere (M).** Populate from real corpus metadata (AIRAC date for aeronautical data, sync date for regulations, review date for guides); show the same date visibly on-page.
**2.3 Course/LearningResource for Ground School (M).** Course → hasCourseInstance; lessons as LearningResource (`teaches`, `inLanguage`).
**2.4 Organization entity hygiene (S).** `sameAs` real profiles, `contactPoint` i@flygaca.com; consistent name/logo. No accreditation claims.
**2.5 JSON-LD validation in CI (M).** Vitest specs per builder + `scripts/validate-jsonld.mjs` walking prerendered dist; chain into verify/CI.
DoD for phase: rich-results eligible pages validate; CI fails on invalid schema.

## Phase 3 — Arabic as a first-class search track (P1)

**3.1 Arabic keyword & intent pass (M, partly non-code).** Research Arabic queries natively (not translations); adjust AR titles/descriptions in `ar.json` for the money pages; document query→URL map in this plan.
**3.2 hreflang refinement (S).** Consider adding `ar-SA` alongside `ar`; ensure head and sitemap alternates match exactly; `x-default` = parameterless URL.
**3.3 Arabic answer-first content (L).** AR KeyFacts/FAQ/answer blocks authored in MSA with Gulf awareness (depends on 0.3, 1.1–1.3).
DoD: money pages fully answer-first in Arabic; Arabic assistant-audit (ask in Arabic) added to the quarterly check.

## Phase 4 — Performance / CWV (P1–P2)

**4.1 Field-data plumbing (S).** `web-vitals` reporting into own analytics (primary host is Firebase — don't rely on the Vercel mirror's Speed Insights); review GSC CWV monthly.
**4.2 INP audit & fixes (M).** Library search input path (debounce, chunk/worker the 19 MB index filtering), calculators, language/RTL toggle: UI-first updates, heavy work deferred. Target <200ms field INP.
**4.3 Content-page LCP & CLS pass (M).** LCP element = server-present text on library/guide templates; reserve space for lazy blocks; test RTL.

## Phase 5 — Freshness & indexing ops (P1–P2)

**5.1 AIRAC freshness loop (M).** Aerodrome/chart pages show current AIRAC cycle + last-reviewed; `dateModified` bumps from data pipeline each cycle; sitemap `lastmod` follows real changes.
**5.2 IndexNow on deploy (S).** Post-deploy ping with changed URLs (Bing/Copilot ecosystem; Google ignores it — sitemaps cover Google).
**5.3 Quarterly refresh calendar (S, recurring).** Top ~20 pages re-verified/refreshed quarterly (AI citation decay ~3 months); log dates in this plan.
**5.4 AI-visibility measurement (S, recurring).** Analytics segment for AI referrers (chatgpt.com, perplexity.ai, gemini.google.com, copilot.microsoft.com); quarterly assistant audit EN+AR (10 canonical questions, log citations).

## Phase 6 — E-E-A-T & off-site authority (P1–P2, largely non-code)

**6.1 About/methodology page (M).** Who builds it, how content is processed from GACA sources, update cadence, corrections policy, contact; footer-linked; `AboutPage` schema.
**6.2 Provenance component (S).** Consistent "Source: GACAR Part X §Y — verify at gaca.gov.sa · last reviewed DATE" block on all content pages (formalizes existing ethos).
**6.3 Off-site presence programme (recurring, human-led).** Honest participation where Saudi/GCC aviation students gather (Reddit, PPRuNe ME, X, flight-school communities); partnerships with schools/instructors; original-data releases (AIRAC change notes, aerodrome dataset) for citable mentions. No astroturfing.
**6.4 Entity grounding (S).** Consistent naming/profiles; Wikidata entry; Wikipedia only if genuinely notable.

---

## Explicitly deprioritized (2026 evidence)

- **llms.txt tooling** — keep `public/llms.txt` accurate, invest nothing more (AI crawlers essentially never fetch it; no measured citation effect).
- **`/ar/` path migration** — textbook-ideal but high-risk refactor; revisit only if parameter-variant prerendering (0.3) proves insufficient in GSC/citation data.
- **Mass content generation** — demoted by 2025–26 core updates and corrosive to the trust profile.

## Suggested order of execution

0.1 → 0.2 → 0.3 → 0.4 → 1.1 → 1.2 → 1.3 (then 2.1, 2.2, 2.5 alongside content work) → 3.x → 1.4/1.5 → 4.x → 5.x → 6.x. Phases 5.3/5.4/6.3 are recurring, not one-shot.
