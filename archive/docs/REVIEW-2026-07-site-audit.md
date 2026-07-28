# flygaca.com — Comprehensive Site Review (July 2026)

**Prepared by:** Senior digital strategy / UX & conversion review (Claude Code)
**Scope:** Brand, UX/UI, content, SEO, performance, functionality, CRO, competitive positioning, business logic, security & trust
**Repo state reviewed:** `main` @ `b127069` (this repo is the production source of flygaca.com)

## Methodology & evidence base

This review was produced from inside the product's own environment, which is stronger than a
surface crawl in most dimensions and weaker in one:

- **Full source audit** of the frontend (`src/`) and backend (`functions/`), including the billing,
  chat, and PWA pipelines.
- **The real app, run and driven locally** (Vite dev server + Chromium): 26 screenshots across
  14 English routes, 6 Arabic routes, and 6 mobile-viewport routes; interactive passes (onboarding
  tour, mobile nav sheet); automated **axe-core WCAG 2.1 AA scans on 7 pages**; a production build
  with the enforced bundle budget.
- **Production-only facts** (host cutover, indexing state) are cited from the repo's own live
  incident log, `SEO-PLAN.md`, because this sandbox has no public-internet egress —
  `https://flygaca.com` itself could not be fetched. Items that can only be confirmed against the
  live host are explicitly marked **[verify on prod]**.
- Competitive benchmarking (Section 8) draws on domain knowledge of the aviation
  reference/training space and is labeled as such.

Screenshots referenced below live in [`docs/screenshots/review-2026-07/`](../../docs/screenshots/review-2026-07/).

---

# SECTION 1 — Executive Summaries

## 1a. For the Internal Team (direct, action-oriented)

The product is dramatically better than its market presence. Engineering quality is top-decile:
zero axe violations on every page scanned, a 181.5 kB gzipped initial bundle under an enforced
183 kB CI budget, flawless EN/AR parity (2,289 keys each, test-enforced), logical-properties-only
CSS with textbook RTL, and a billing webhook with real idempotency. That is rare and worth saying
plainly.

Three things are actively costing you money and trust right now:

1. **Nobody can find the site.** The open P0 in `SEO-PLAN.md` — production serving `noindex` on
   the canonical host and an SPA shell to AI crawlers — makes every other investment invisible.
   Finish the Firebase cutover (P0.b) before touching anything else.
2. **The funnel leaks at every stage.** Anonymous visitors hit a hard sign-in wall before asking
   Captain Adel a single question; the pricing page advertises two products that cannot be bought
   (Season Pass "Available at launch", student rate display-only); the Pro CTA itself is disabled
   until billing is connected; the B2B schools form is a `mailto:` handoff with no server capture;
   and there is zero social proof anywhere on the site. There is also no soft conversion (no
   newsletter, no saved-progress hook) to catch the 95% who aren't ready to pay.
3. **Compliance debt is real.** GA4 + Vercel Analytics fire with no consent banner while the
   privacy policy claims consent-based processing and promises deletion rights no code path
   fulfils (`deleteAllData()` only wipes local state). The "5 free questions/day" chat quota is
   client-side `localStorage` only — the gateway enforces no daily cap and App Check enforcement
   is off. Under PDPL and plain abuse economics, these are pre-launch blockers for paid marketing.

Do the P0 cutover, wire the two dead SKUs or hide them, add server-side quota + consent, and this
becomes a genuinely launchable paid product within a quarter.

## 1b. For Investors (strategic, opportunity-focused)

Fly GACA sits alone in a defensible niche: the only bilingual (Arabic-first-class), independent
digital library of Saudi civil-aviation regulation, paired with 55 flight-planning calculators, a
ground-school study system, and a RAG assistant that cites the exact GACAR Part and section it
answers from. Saudi Arabia's aviation sector is in a state-backed expansion cycle (Vision 2030
targets, new carriers, new academies), and every pilot, dispatcher, and flight school in the
Kingdom must work with exactly the corpus this product has indexed — 74 GACAR Parts, 211 reference
documents — in both languages. No regional or global incumbent (ForeFlight, Sporty's, Skybrary)
serves this regulatory surface, in Arabic, at all.

The asset quality is unusually high for the stage: production-grade accessibility, performance
budgets enforced in CI, a clean Stripe/RevenueCat entitlement architecture, and B2B motion
(per-seat school licensing from SAR 250/seat/yr) already scaffolded. The monetization design is
sound — free regulatory library as the moat and top-of-funnel, Pro subscription (SAR 449/yr) for
the AI instructor, currency tracking, mock exams and offline packs, plus school seats as the
expansion vector.

What the capital buys is straightforward execution, not invention: completing the search-indexing
cutover (currently suppressing all organic acquisition), activating the two dormant SKUs (student,
exam-season pass) that match the Saudi cadet demographic, hardening the free-tier quota
server-side, and building the trust layer (testimonials, school logos, compliance) that converts
an audience the product is already technically able to serve. The gap between product maturity and
go-to-market maturity is the opportunity.

## 1c. For the Client / Stakeholder (high-level, forward-looking)

Fly GACA's foundations are exceptional. The brand — the falcon mark, the night-cockpit palette,
the "independent, educational, bilingual" voice, the discipline of citing the exact Part and
section — is coherent on every page, in both languages, and it is exactly the right identity for a
serious regulatory reference. The engineering underneath it (speed, accessibility, offline
support, Arabic parity) is at a standard most funded competitors do not reach. Nothing in this
review recommends changing who Fly GACA is.

The work ahead is about letting the world in. Today the site is effectively invisible to search
engines and AI assistants because of a known hosting issue that is already diagnosed and
mid-migration — completing that is the single most valuable action available. After that, the
theme is confidence: let visitors try Captain Adel before signing in, show the voices of the
pilots and schools who use the library, make every advertised plan actually purchasable, and
formalize the privacy commitments the site already makes in words. None of this is a redesign; it
is finishing work on a platform that is already the best-built product in its field. With
distribution unblocked and the trust layer added, Fly GACA is positioned to become the default
reference for Saudi aviation — the thing every student pilot in the Kingdom has open in a tab.

---

# SECTION 2 — Scorecard Overview

| #   | Dimension                      |  Score   | One-line verdict                                                                                                                                                                     |
| --- | ------------------------------ | :------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Brand & Visual Identity        | **9/10** | Cohesive, distinctive, token-disciplined night-cockpit identity carried perfectly across EN/AR; only micro-polish issues.                                                            |
| 2   | UX/UI Design                   | **8/10** | Excellent patterns (mobile dock, focus traps, skeletons, zero axe violations) with a few real gaps: route-change focus, tour-over-hero, unwrapped tables.                            |
| 3   | Content Quality                | **8/10** | Honest, motif-driven copy with true bilingual parity; small factual drift (54 vs 55 tools) and no human/author credentials.                                                          |
| 4   | SEO                            | **6/10** | Best-practice on-page/JSON-LD/prerender machinery — all currently nullified by the open production `noindex`/shell-serving P0.                                                       |
| 5   | Performance & Technical Health | **9/10** | 181.5 kB gz initial JS under an enforced budget, self-hosted fonts, critical-CSS LCP, clean console on every route; one 19 MB in-memory search-index risk.                           |
| 6   | Functionality & Features       | **8/10** | All ~80 routes mount error-free and the 55 tools are live and registry-synced; iOS IAP path unimplemented, per-page auth guards fragile.                                             |
| 7   | Conversion Optimization (CRO)  | **5/10** | Strong risk-reversal copy undermined by a sign-in wall on the hero product, two unpurchasable SKUs, zero social proof, and no soft-conversion capture.                               |
| 8   | Competitive Positioning        | **7/10** | Category-of-one in Saudi/bilingual regulatory reference; behind best-in-class on trust signals, community, and distribution.                                                         |
| 9   | Business Logic & Offerings     | **6/10** | Clean plan architecture and single-source pricing, but student/pass SKUs are advertised-not-sellable and /schools hides its price.                                                   |
| 10  | Security & Trust               | **6/10** | Strong headers/CSP/webhook idempotency and no committed secrets — offset by missing consent banner, client-only free quota, App Check off on chat, and unfulfilled deletion promise. |

**Overall: 7.2/10** — an elite build with a blocked front door and an unfinished cash register.

---

# SECTION 3 — Strengths (What's Working Well)

## Brand & visual identity

- **A real, disciplined design system.** `src/styles/tokens.css` is a single source of truth
  (the Falcon palette) with self-documented contrast rationale — e.g. the comment that brand teal
  is "too low-contrast as text on night," routing links through `--link` instead; and the Cockpit
  theme's near-black-on-amber `--text-on-brand` with an explicit "NOT white" warning. This is
  design-token hygiene most teams never reach.
- **The hero is genuinely distinctive** (`home-hero.png`): "Every Saudi reg. One captain on the
  answer." in a gold→teal gradient, beside a live Captain Adel Q&A widget that itself carries an
  "Illustrative example — always verify" caption. The brand promise (cited answers, independence)
  is _demonstrated_ in the hero, not just claimed.
- **Identity survives translation.** The Arabic home page (`home-arabic-rtl.png`) is a true mirror
  — layout, bento dashboard, tour, footer all flip via logical properties; a repo-wide grep found
  **zero physical left/right CSS declarations**. Units, citations, and version strings are
  isolated with `<bdi dir="ltr">`. This is best-in-class RTL work.
- **Consistent voice.** "Cites the exact Part and section" recurs as a deliberate motif across
  hero, chat, about, and pricing; the not-affiliated disclaimer is one shared component
  (`src/components/Disclaimer.tsx`) so it never drifts.

## UX/UI

- **Zero axe-core violations** (WCAG 2 A/AA rulesets) on all seven pages scanned: `/`, `/tools`,
  `/tools/crosswind`, `/pricing`, `/chat`, `/library`, `/learn`. Backed by an e2e axe job in CI.
- **Textbook interaction engineering:** skip-to-content link (`Layout.tsx:37`), global
  `:focus-visible` rings, a mobile "More" sheet with a complete focus trap (Tab wrap, Escape,
  focus restore — `Header.tsx:72–116`), 44 px tap targets enforced in `global.css`, and
  `prefers-reduced-motion` handled in both CSS and JS (including view-transition pseudos).
- **The mobile bottom dock** (`mobile-more-sheet.png`) — Library / Adel / Tools / Learn / More —
  is a stronger mobile IA than a hamburger and matches the app-like PWA positioning.
- **Calculator UX is a real pattern, not 55 one-offs:** `CalcShell` gives every tool
  copy-link/share/preset/how-it-works/related-tools/disclaimer framing; inputs ride the URL so any
  setup is shareable; results render as semantic `<dl>` stats. Crosswind (`tool-crosswind.png`)
  shows the clean empty state ("Enter runway, wind…" placeholder diagram) and example affordance.
- **Loading/error states are designed, not defaulted:** space-reserving skeletons on lazy routes
  (`RouteFallback.tsx`), an error boundary that keeps the chrome and auto-clears on navigation,
  a live-reacting `/offline` page, and an update-ready toast for the PWA.

## Content

- **Bilingual parity is enforced, not aspirational** — 2,289 leaf keys in each of `en.json` /
  `ar.json`, with a failing test on any divergence.
- **Honest numbers.** The proof-strip stats (74 Parts, 55 tools, 20 guides) are derived from real
  registries, and the pricing page states "Indicative pricing, confirmed at launch" rather than
  faking a live checkout. The trust posture ("He can be wrong, always verify") is unusually
  credible for the category.
- **The guide corpus targets exactly the right queries** (`/guides/how-to-become-a-pilot-in-saudi-arabia`,
  `saudi-cpl-requirements`, `foreign-license-conversion-to-gaca`…) — 20 guides mapping 1:1 to
  high-intent Saudi aviation searches.

## SEO machinery (the code layer)

- Per-page meta/OG/canonical/hreflang via `usePageMeta.ts`; JSON-LD builders (article, FAQ,
  course, breadcrumb) wired on docs, guides, tools, pricing, legal; `sitemap.xml` with 687 URLs;
  `robots.txt` explicitly allowing GPTBot/ClaudeBot/PerplexityBot; `llms.txt`; and a build that
  emits head snapshots for **314 bilingual routes** (`check-prerender: OK`), with a deploy-time
  full-body prerender layer and a fatal coverage gate. As machinery, this is ahead of most
  commercial sites.

## Performance

- **181.5 kB gz initial JS against an enforced 183 kB CI budget** (`scripts/check-bundle.mjs`) —
  measured in this review's build. Fonts self-hosted via `@fontsource` (no third-party CDN),
  critical inline CSS paints the hero before JS, every route but Home is code-split, and the
  19 MB search index / 21 MB airports data are isolated in a dedicated NetworkFirst cache so they
  can't evict saved regulatory docs. Every screenshotted route ran with **zero console errors**.

## Functionality

- All ~80 routes in `router.tsx` mounted successfully in the sweep; the 55-tool registry
  (`src/lib/tools.ts`) is fully route-synced with no dead entries; legacy URLs redirect.
- The chat pipeline degrades gracefully (SSE → buffered JSON fallback, abort-preserving partial
  answers, per-message retry) and renders model output inertly (no `dangerouslySetInnerHTML`),
  linkifying GACAR citations into the in-app Library.

## Security & billing engineering

- Strong headers on both hosts (HSTS, `frame-ancestors 'none'`, nosniff, tight
  Permissions-Policy); no secrets in the tree (verified); Stripe webhook with signature check,
  event-ID idempotency and rollback-on-error; entitlements are server-write-only and
  emulator-tested in CI; the two Stripe callables enforce App Check.

---

# SECTION 4 — Weaknesses (What's Failing or Underperforming)

## 4.1 Distribution (SEO) — the P0

- **Production is documented as `noindex` on the canonical host, serving the un-prerendered SPA
  shell to non-JS/AI crawlers** (`SEO-PLAN.md`, open items P0.a/P0.b). Until the Firebase Hosting
  cutover completes and is verified, the entire 687-URL sitemap, the JSON-LD layer, and the guide
  corpus earn nothing. Everything else in this review is second-order to this. **[verify on prod]**
- The full-body prerender is a deploy-time layer; two capture risks found in this review:
  `scripts/prerender.mjs` snapshots `document.documentElement.outerHTML` after `networkidle`
  without dismissing the **first-visit onboarding tour** (its markup/backdrop can be baked into
  crawler HTML) and without scrolling, so **below-fold `CountUp` stats can freeze at 0** in
  snapshots (the counters animate only on intersection — `CountUp.tsx:69–78`). A crawler reading
  "0 GACAR Parts" is worse than no stat. **[verify in deploy artifacts]**
- Three overlapping SEO documents (`SEO-PLAN.md`, `docs/SEO-STRATEGY.md`, `docs/seo/*`) invite
  drift; one already contains a wrong region (`docs/APP-CHECK-BACKEND.md` says `me-central2`;
  everything real is `me-central1`).

## 4.2 Conversion & funnel

- **Hard sign-in wall on the flagship feature.** `/chat` (see `chat-signed-out.png`) shows
  suggested questions but replaces the composer with "Sign in to ask Captain Adel" — twice on one
  screen. An anonymous visitor cannot try even one question of the product the hero just sold
  them. This is the single largest self-inflicted conversion loss on the site.
- **Two advertised products cannot be bought:** the Exam Season Pass band (SAR 149/90 days)
  renders a permanently disabled "Available at launch" button (`Pricing.tsx:249`), and student
  pricing (SAR 39/299) is display-only inside a `<details>` toggle with no checkout path — the
  backend maps `student`/`pass` plan values **silently to full annual price**
  (`functions/src/billing.ts:94`). Meanwhile the Pro CTA itself is disabled when billing isn't
  connected ("Checkout opens when billing is connected"). A pricing page where, depending on
  state, zero of four purchase paths transact.
- **Zero social proof anywhere** — no testimonials, user counts, school logos, ratings, press, or
  named credentials, confirmed by repo-wide sweep. For a paid product asking SAR 449/yr, the
  funnel runs entirely on self-assertion.
- **B2B lead capture is a `mailto:`** — the /schools form builds a `mailto:sales@flygaca.com`
  link (`Schools.tsx:56–61`): no server capture, no CRM, no confirmation; a lead without a
  configured mail client is silently lost. The schools page also **shows no price at all** —
  "from SAR 250/seat/yr" exists only on /pricing.
- **No soft conversion.** No newsletter, no exam-date reminder capture, no "save your progress"
  account hook — nothing to hold a not-yet-ready visitor, in a product whose audience has a
  known multi-month study lifecycle.
- The first-visit **onboarding tour covers the hero** on both desktop and mobile
  (`home-first-visit-tour.png`) — a 5-step modal before the visitor has seen the headline. It
  never returns after dismissal (verified), but it front-loads friction at the moment of maximum
  bounce risk and hides the two hero CTAs behind a Skip.
- The home hero has **no path to Pro** — /pricing is reachable only from the bottom conversion
  band; the "reg." abbreviation in the H1 ("Every Saudi **reg.**") slightly undercuts an
  otherwise premium first line.

## 4.3 Trust, privacy & abuse

- **No consent banner while GA4 + Vercel Analytics collect** (`firebase.ts:87–93`,
  `AnalyticsProvider.tsx`), yet the privacy policy claims consent-based processing and PDPL
  rights including withdrawal. Live PDPL/GDPR exposure.
- **The privacy policy promises deletion the product can't perform.** `deleteAllData()`
  (`account.ts:239`) wipes local state only — no Firebase Auth deletion, no server-side
  `users/{uid}` removal, no server data export. "What we collect" also omits GA4/Vercel analytics
  and the Firestore-synced logbook/records data.
- **The "5 free questions/day" quota is client-side `localStorage` only.** The gateway enforces
  no daily cap (only a 20/min burst limit) and `ENFORCE_APP_CHECK` defaults to false on chat
  (`gateway.ts:25,128`). Clearing localStorage = unlimited free Gemini usage on your bill. Both a
  monetization leak and an abuse vector; rate limiters are also per-instance (multiply under
  autoscale).
- **Analytics are dead on the canonical host:** `@vercel/analytics` beacons have no collector
  when served from Firebase Hosting — so the team is making decisions with no field data (also
  flagged as SEO-PLAN 4.1), while still incurring the consent obligation.
- **[verify on prod]** `deploy.yml:43` copies a **blank** `.env.example` to `.env.local` at build
  time and passes no `VITE_FIREBASE_*` env — if that is what actually ships, auth, Firestore
  sync, billing, and App Check are all silently off on flygaca.com and the app runs local-only.
  The workflow comment contradicts the file contents. Highest-impact ambiguity in the repo.

## 4.4 Accessibility & UX gaps (beyond axe's reach)

- **No focus management on SPA route change** — `ScrollToTop.tsx` scrolls but never moves focus
  to `#main`; screen-reader users get no announcement that the page changed (WCAG 2.4.3-adjacent;
  the biggest real a11y gap).
- **Calculator results aren't announced**: `OutputGrid` is a bare `<dl>` with no live region — a
  screen-reader user typing into Crosswind hears nothing as results update (WCAG 4.1.3). Copy/share
  confirmations _are_ announced; the actual answers aren't.
- **Five tools render wide tables with no overflow wrapper** (`RegLookup.tsx:37`,
  `Airspace.tsx:56`, `RoutePlanner.tsx:102`, `ChartSymbols.tsx:30`, `Transponder.tsx:28`; only
  `WindTable` wraps) — horizontal-scroll/clipping risk on phones.
- Chat streaming into a `role="log"` region token-by-token with no finalized-answer announcement
  is unreliable for screen readers; the composer's only label is its placeholder.
- Chart raster images carry `alt=""` with no text alternative for the information they convey;
  a few hard `px` font sizes (8 px sparkline labels) won't scale.

## 4.5 Functionality & platform

- **iOS purchase path is unimplemented**: `billingChannel()` returns `'revenuecat'` and both
  billing calls throw `'native-billing'`, but no RevenueCat handler exists in-repo — tapping Pro
  in a native build dead-ends. Store-review-blocking if shipped.
- **Auth gating is per-page convention, not enforced**: account routes are registered unguarded
  in `router.tsx` and rely on each page remembering `RequireSession`; account deletion uses a bare
  `window.confirm`.
- **The 19 MB `library-search.json` is fetched outside the shared cache, fully retained in React
  state, and linearly re-scanned per keystroke** (`Library.tsx:161–221`) — a real memory/jank risk
  on low-end mobile, with no worker offload and no size warning on metered connections.
- No iOS "Add to Home Screen" guidance (iOS ignores `beforeinstallprompt`) in a market that is
  heavily iOS.
- Four hosting configurations coexist (Firebase, Vercel, Cloudflare, Netlify) with already-drifted
  CSPs, and the deploy pins `firebase-tools@13` while the repo uses `^15` — reproducibility and
  lockstep hazards.

## 4.6 Content nits

- **"54 free flight calculators" in `metaDesc.tools`** (`en.json:3110`) vs 55 everywhere else —
  a factual error on an indexed meta description; `llms.txt` also says 54.
- Refund FAQ says "Email us and we'll sort it out" but names no address; contact is fragmented
  across four mailto addresses with no form.
- Marquee claims ("61 aerodromes mapped", "13 VFR charts") aren't tied to a registry count and can
  silently go stale; orphan i18n keys (`home.convert.secondary`, `home.ctaTools`) are dead weight.

---

# SECTION 5 — What to Improve or Enhance

## Quick Wins (under 1 week)

| #   | What                                                                                                                                                                                 | Why / expected impact                                                                                          |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| Q1  | **Finish & verify the hosting cutover** (SEO-PLAN P0.b): DNS to Firebase, confirm `noindex` gone and body-prerendered HTML served on flygaca.com (`curl -A GPTBot`).                 | Unblocks 100% of organic and AI-search acquisition. Nothing else compounds until this ships.                   |
| Q2  | **Hide the Season Pass band and the student `<details>`** until purchasable (or replace CTAs with "Notify me" email capture).                                                        | Removes dead CTAs from the money page; the notify-me variant converts dead ends into a launch list.            |
| Q3  | **Fix "54" → "55"** in `metaDesc.tools` and `llms.txt`; name `support@flygaca.com` in the refund FAQ; delete orphan i18n keys.                                                       | Factual consistency on indexed surfaces; removes trust paper-cuts.                                             |
| Q4  | **Give anonymous users 2–3 Captain Adel questions before the sign-in gate** (server-side IP/App-Check-scoped allowance), sign-in to continue.                                        | The classic try-before-identify pattern; directly attacks the largest funnel leak. Pairs with Q6.              |
| Q5  | **Wrap the five unwrapped tool tables** in the existing `.tableWrap` pattern; add `role="status"` live region to `OutputGrid`; focus `#main` on route change.                        | Three small diffs close the three biggest real a11y gaps (mobile overflow, silent results, silent navigation). |
| Q6  | **Enforce the daily chat quota server-side** (per-uid Firestore counter in the gateway) and flip `ENFORCE_APP_CHECK` per the existing runbook's watch→enforce path.                  | Closes the monetization leak/abuse vector before any paid traffic is bought.                                   |
| Q7  | **Swap `@vercel/analytics` for a collector that works on Firebase Hosting** (GA4 you already init, or Plausible if going consent-light) + add `web-vitals` reporting (SEO-PLAN 4.1). | Restores field data on the canonical host; you are currently flying instruments-out.                           |
| Q8  | Change the H1 to spell out "regulation" (e.g. "Every Saudi regulation. One captain on the answer.") in both languages.                                                               | Premium polish on the most-read line of the site; zero risk.                                                   |

## Medium-Term (1–4 weeks)

| #   | What                                                                                                                                                                                                                                                                               | Why / expected impact                                                                                                                                |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| M1  | **Trust layer v1:** 3–5 named testimonials (cadets/instructors), school logos as they close, a "built by" persona on /about with aviation credentials, Stripe/secure-payment badges beside the Go Pro CTA.                                                                         | Social proof is the single highest-leverage CRO addition for a SAR 449/yr ask; author identity also feeds Google E-E-A-T (aligns with SEO-PLAN 6.1). |
| M2  | **Real B2B capture:** post the /schools form to a Cloud Function (store + email + Slack/webhook), add a confirmation state, and show "from SAR 250/seat/yr · min 10 seats" on the page itself.                                                                                     | Stops silently losing the highest-LTV leads; price transparency qualifies them.                                                                      |
| M3  | **Consent + privacy truth-up:** lightweight PDPL/GDPR consent banner gating analytics; rewrite "What we collect" to name GA4/analytics and Firestore-synced records; implement real account deletion (Auth user + `users/{uid}`) and server-data export.                           | Converts the privacy policy from liability into a trust asset; required before paid acquisition in KSA/EU.                                           |
| M4  | **Onboarding tour → non-blocking**: replace the auto-opening 5-step modal with a dismissible corner coachmark or a "Take the 30-second tour" chip in the hero.                                                                                                                     | First paint shows the hero, not a modal; tour becomes pull, not push.                                                                                |
| M5  | **Prerender hygiene:** in `prerender.mjs`, set the tour's localStorage key + emulate reduced motion (or scroll the page) before capture, so snapshots contain final stat values and no tour markup; add a snapshot assertion ("no `Welcome to Fly GACA`, no `>0<` in stat strip"). | Protects the crawler-facing HTML the whole SEO plan depends on.                                                                                      |
| M6  | **Ship the Season Pass and student SKUs for real:** create the Stripe prices, fix the backend plan mapping (`billing.ts:94`) to reject unknown plans instead of defaulting to annual, add student verification (e.g. .edu.sa / school-code).                                       | Two prices tuned to the cadet demographic; the exam-season pass is a natural high-urgency purchase.                                                  |
| M7  | **Soft conversion:** newsletter/"regulation change alerts (free, monthly)" email capture in the footer and at guide ends; exam-date countdown hook in Study.                                                                                                                       | Captures the long study lifecycle; feeds launch announcements (Q2's notify-me list).                                                                 |
| M8  | **Search index performance:** move `library-search.json` parsing/scanning into a Web Worker (or adopt FlexSearch with a prebuilt compact index), route it through `loadJson`, release memory on idle.                                                                              | Removes the main mobile jank/memory risk in the core library flow.                                                                                   |
| M9  | Consolidate SEO docs: fold `docs/SEO-STRATEGY.md` + `docs/seo/*` into `SEO-PLAN.md` (one authoritative file), fix the `me-central2` doc error.                                                                                                                                     | One source of truth; prevents the next agent/human from executing a stale plan.                                                                      |

## Strategic (1–3 months)

| #   | What                                                                                                                                                                                                                    | Why / expected impact                                                                                                                                       |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1  | **Own the Saudi aviation query space:** execute SEO-PLAN Phase 1 (KeyFacts blocks, FAQPage schema on the four money guides, answer-first rewrites, Part-landing summaries, bilingual glossary) now that indexing works. | The guide corpus already matches the queries; this makes it extractable by Google AI Overviews and chat assistants — where this audience increasingly asks. |
| S2  | **School dashboard as the B2B wedge:** cohort progress, syllabus alignment, seat management — the compare table already promises "Admin dashboard & seats".                                                             | Converts per-seat licensing from a discount into a product; schools are the distribution shortcut to students.                                              |
| S3  | **Finish the native story:** implement the RevenueCat purchase path (or gate Pro UI off in native), add iOS Add-to-Home-Screen guidance for the PWA.                                                                    | iOS-heavy market; a dead Pro button in a shipped app is a store rejection and a brand wound.                                                                |
| S4  | **Regulatory change-tracking as the moat:** productize the `SyncedStamp`/updates pipeline into diffed, dated, subscribable change alerts (free summary email → Pro in-app alerts).                                      | Recurring external trigger for re-engagement; deepens the "always current" trust position that GACA's own PDF distribution can't match.                     |
| S5  | **Community/credibility flywheel:** instructor-reviewed guide bylines, a school partner page, presence at Saudi aviation academies — feeding M1's trust layer with real names.                                          | In a small national market, reputation propagates through institutions, not ads.                                                                            |

---

# SECTION 6 — What to Redesign

Only two surfaces need more than tweaks — and neither touches brand identity.

1. **The signed-out chat experience** (`/chat`). Today: a static gate with two stacked "Go to
   sign in" CTAs and suggestion chips the visitor can't use. Redesign goal: a _live first-touch_
   — visitor taps a suggested question, watches Captain Adel stream a real cited answer (server-
   metered, 2–3 anonymous turns), then hits a warm "Sign in free to keep asking — 5 questions/day"
   gate with the conversation preserved through sign-in. The suggestion chips, disclaimer
   placement, and visual design all stay; what changes is _when_ identity is demanded. Success
   metric: anonymous→signed-in conversion on /chat.

2. **The pricing page's non-Pro tiers** (`/pricing`). Today: a dead Season Pass band, a hidden
   student toggle, and a Schools card whose price lives elsewhere on the page. Redesign goal: one
   coherent "choose your track" architecture — Student / Pro / Season Pass / Schools — where every
   visible price has a working action (buy, verify-student, notify-me, or book-a-demo), the
   guarantee/trial line sits under every CTA, and a testimonial strip anchors the fold. Keep the
   existing card design language, compare table, and FAQ; this is information architecture, not
   visual redesign.

3. _(Honorable mention — pattern, not page.)_ **First-visit onboarding**: retire the hero-blocking
   modal pattern (see M4). The tour content is good; its delivery mechanism costs more than it
   teaches.

---

# SECTION 7 — What to Remove

| Item                                                                                                           | Where                                                    | Why removal helps                                                                                                                                                    |
| -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The **disabled Season Pass band** (until purchasable)                                                          | `Pricing.tsx:234–253`                                    | A prominent dead button on the money page teaches visitors that CTAs here don't work. Reinstate the day the Stripe price exists (M6) — or convert to notify-me (Q2). |
| **`@vercel/analytics` + Speed Insights on the canonical host**                                                 | `src/lib/analytics.ts`, `AnalyticsProvider.tsx`          | Beacons with no collector on Firebase Hosting: pure dead weight that still triggers consent obligations. Replace per Q7 (don't just delete measurement).             |
| **Redundant hosting configs** (Netlify, and Cloudflare _or_ Vercel — keep one fallback)                        | `netlify.toml`, `wrangler.toml`/`worker/`, `vercel.json` | Four header/CSP/redirect surfaces are already drifting; each stale host is a potential duplicate-content or wrong-CSP incident. Keep Firebase + one.                 |
| **Duplicate SEO strategy docs**                                                                                | `docs/SEO-STRATEGY.md`, `docs/seo/*`                     | Three parallel plans guarantee somebody executes the stale one. Fold into `SEO-PLAN.md` (M9).                                                                        |
| **Orphan i18n keys** (`home.convert.secondary`, `home.ctaTools`) and the second "Go to sign in" block on /chat | `en.json`/`ar.json`, `Chat.tsx`                          | Dead copy rots; the duplicated sign-in CTA on one screen reads as pressure, not clarity.                                                                             |
| **The `'student' \| 'pass'` values from `ProPlan`** until backend support exists                               | `src/lib/billing.ts:17`                                  | A type that silently charges full annual price for a student checkout is a landmine; remove the variants or make the backend reject them (M6).                       |

Nothing brand-related is recommended for removal. The falcon mark, palette, bilingual voice,
disclaimers, and the "independent, educational" positioning should be preserved exactly as they
are — they are the product's most defensible assets after the corpus itself.

---

# SECTION 8 — Competitive Benchmarking

_(Domain-knowledge benchmarks; no live crawl was possible from this environment.)_

### vs. eCFR / FAA DRS (best-in-class digital regulation libraries)

The US eCFR sets the standard for regulatory UX: always-current consolidated text, point-in-time
versions, granular citation URLs. **Fly GACA already beats it on presentation** (search, mobile,
dark cockpit reading experience, bilingual text — eCFR has no Arabic anywhere) and matches its
citation-anchor discipline via the corpus link scheme. **The gap:** eCFR's authority is inherent;
Fly GACA must _earn_ trust through provenance — visible "synced N min ago", per-document
amendment dates (SEO-PLAN 2.2/6.2), and named editorial oversight. **The opportunity:** GACA's own
official distribution is PDF-centric; a fast, linkable, bilingual HTML mirror with change
tracking is a categorically better product that the regulator itself doesn't offer.

### vs. ForeFlight (best-in-class pilot tooling)

ForeFlight owns operational flight tools but is US/EU-centric, English-only, USD 120+/yr, and has
zero GACAR content. Fly GACA's 55 browser-native, URL-shareable calculators are a different
category — study/reference, not EFB — and its "not for operational use" honesty is the right
lane. **The gap:** ForeFlight converts through depth of integration (one tool feeds the next).
Fly GACA's tools are siloed; the "related tools" chips are a start, but presets, a unit-profile
that persists across tools, and Adel-explains-this-result integration would create the same
compounding stickiness. **The opportunity:** nobody serves the _Saudi checkride_ workflow
(GACAR VFR minima, fuel reserves, Part 61 currency) — Fly GACA's GACAR-specific lookups are
unique and should be marketed as such.

### vs. Sporty's / BoldMethod (best-in-class flight training content & conversion)

These are the CRO benchmark: heavy social proof (star ratings, alumni counts), free email courses
capturing every visitor, urgency around checkride season, and polished video. **The gap is the
entire trust/soft-conversion layer** — Fly GACA has no testimonials, no email capture, no
seasonal campaign structure, while its _content engine_ (guides + quizzes + mock exams) is
already comparable. **The opportunity:** BoldMethod's model (free daily quiz → email list → course
sales) maps directly onto Fly GACA's existing quiz bank and the dormant Season Pass — an
"exam-season" campaign with a daily GACAR question email is a proven playbook this stack can run
in weeks.

### Net position

Fly GACA is a **category of one** — no bilingual, independent, AI-cited Saudi regulatory platform
exists. Its build quality exceeds all three benchmarks in accessibility, RTL, and performance
budgets. It trails all three in social proof, email capture, and (temporarily) discoverability.
Those are precisely the cheapest gaps to close.

---

# SECTION 9 — Strategic Recommendations Summary

The prioritized roadmap. Items 1–5 are sequenced; 6–15 can parallelize.

1. **Complete and verify the hosting cutover** — kill the production `noindex`, confirm body
   prerender serves to crawlers (SEO-PLAN P0.b). _Everything compounds from here._
2. **Verify production Firebase config actually ships** (blank `.env.example` copied in
   `deploy.yml`) — if auth/billing are silently off on flygaca.com, that's the real P0 twin.
3. **Server-enforce the free chat quota + enable App Check on the gateway** — close the
   monetization/abuse hole before buying traffic.
4. **Open Captain Adel to anonymous visitors (2–3 metered questions)** and redesign the sign-in
   moment as a continuation, not a wall.
5. **Make every advertised price purchasable or capture-able** — wire Season Pass + student SKUs
   with correct backend mapping, or swap dead buttons for notify-me capture.
6. **Ship the trust layer** — testimonials, school logos, named authorship on /about, payment
   badges at the CTA.
7. **PDPL/GDPR truth-up** — consent banner, honest "what we collect", real account deletion and
   export.
8. **Fix analytics on the canonical host + add web-vitals field data** — restore instruments.
9. **Real B2B pipeline** — server-captured /schools form, on-page seat pricing, demo booking.
10. **Soft-conversion machine** — regulation-change digest + exam-season email capture across
    guides and footer.
11. **Close the top-3 a11y gaps** — route-change focus, live-region calculator outputs, table
    overflow wrappers (plus prerender snapshot hygiene in the same sprint).
12. **Execute SEO-PLAN Phase 1 on the four money guides** — KeyFacts, FAQPage schema,
    answer-first rewrites, bilingual glossary.
13. **Search-index performance** — worker-offload the 19 MB index before mobile growth.
14. **Decide the native story** — implement RevenueCat or gate Pro out of the iOS build; add iOS
    A2HS guidance.
15. **Consolidate operational truth** — one SEO doc, two hosting configs max, aligned CLI
    versions, fixed region references.

---

# SECTION 10 — Final Verdict

**Where the site stands today:** Fly GACA is the best-engineered product in its niche and very
possibly in the wider flight-training content space — with a front door that is currently locked
(production indexing), a cash register that is half-installed (two dead SKUs, client-side quota,
possibly unshipped Firebase config), and a trust story told entirely in the first person (zero
social proof). The 7.2/10 overall is unusual in its shape: 9s in the places that normally take
years (accessibility, performance, i18n, brand discipline) and 5–6s in the places that normally
take weeks (checkout wiring, consent banner, testimonials, a working lead form).

**Where it could realistically go:** the default reference for Saudi civil aviation — the site
every GACA-track student, instructor, and dispatcher keeps open, the corpus every AI assistant
cites for GACAR questions, and a subscription business with a B2B seat motion into the Kingdom's
expanding flight academies. The market is state-backed and growing, the incumbents don't speak
Arabic or GACAR, and the hard assets (corpus, tools, bilingual build) already exist. That outcome
is execution-limited, not product-limited.

**The single most important change:** _finish the hosting cutover and verify flygaca.com serves
indexable, body-prerendered pages._ Every other recommendation in this report — the funnel fixes,
the trust layer, the SKUs, the content plan — multiplies a traffic number that is currently held
near zero by one known, already-diagnosed infrastructure task. Ship P0.b first; then let people
try the captain before asking who they are.

---

_Appendix — screenshots:_ `home-hero.png` (hero, tour dismissed), `home-first-visit-tour.png`
(tour over hero), `pricing.png`, `chat-signed-out.png` (sign-in wall), `tool-crosswind.png`
(reference tool), `home-arabic-rtl.png` (RTL mirror), `mobile-more-sheet.png` (mobile dock/sheet)
— all under `docs/screenshots/review-2026-07/`.
