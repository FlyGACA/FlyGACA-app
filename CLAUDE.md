# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this is

The **Fly GACA app** — a modern TypeScript/React/Vite rebuild of the legacy no-build vanilla PWA
(the original Fly GACA site, whose source is not in this GitHub org — the regulatory corpus was
ported from it). Fly GACA is an independent, educational platform and open regulatory library for
Saudi civil aviation. It is **not affiliated with GACA**; treat that as load-bearing whenever you
touch user-facing copy — the product helps you find/study regulation, it never replaces it, and the
assistant cites the exact Part/section.

The app is more than calculators. Live surfaces (see `src/router.tsx`) include the **regulatory
library** (`/library`, documents + charts, plus `/library/map` — a Leaflet aerodrome map — and the
`/updates` corpus change feed), **Captain Adel** chat (`/chat`), the **flight-tools catalog**
(`/tools/*`), the interactive **Kingdom Airspace HUD** (`/hud` — a simulated-traffic globe/HUD,
pure sim logic in `src/calc/hud/`), a **learn/guides** hub (`/learn`, `/guides/:slug`), **study**
tools (`/study/*` — quiz, flashcards, ground school, mock exam, paths, exam-prep **packs**, study
sheets), an authenticated **account** area (`/account`, `/dashboard`, `/currency`, `/logbook`,
`/records`, `/settings`), **pricing/schools/checkout** (`/pricing`, `/schools`, `/checkout`,
`/checkout/return`), a **licensed Captain Adel API** marketing page (`/developers` — see
`docs/LICENSED-API.md`), a **B2B org-admin** cohort dashboard (`/business/admin`), and `/about` +
legal pages (incl. `/refund`). Home itself is a **bento dashboard** (`src/components/bento/` —
grid, card glow, and a widgets/ family — lazy-loaded off the hero's critical path), and the global
**command palette** (`src/components/CommandPalette/`) jumps between all of these. `/learn` is the
canonical hub — `/study` and `/guides` redirect into it (`/study` → `/learn?tab=practice`); don't
relink them to the old paths.
Beyond the web app, `apple/` is a native iOS app family (one shared Swift package,
`apple/FlyGACAKit`, one App Store app per exam-prep pack) built from a **flavor** switch
(`src/flavors/`, `src/app/flavor/`; `IS_FLAVOR_APP` is defined in `src/flavors/current.ts` and
consumed by `src/router.tsx`) that swaps in a reduced, single-pack route tree;
`scripts/build-flavor.mjs` slices content per flavor. See
`apple/ARCHITECTURE.md`, `docs/RUNBOOK-native.md`, and `docs/STORE-SUITE.md`.

The repo also contains the **backend**: `functions/` holds the Firebase Cloud Functions — the
Express gateway (`chat`) serving `/api/chat` + `/api/feedback` (auth, App Check, rate limiting, free
daily quota, SSE) plus the licensed `/v1/ask` API surface (tiered, API-key-authenticated, see
`docs/LICENSED-API.md`), the Captain Adel RAG flow (Genkit + Gemini, see
`docs/DESIGN-genkit-rag-backend.md`), **Moyasar** billing (`createCheckoutConfig`, `confirmPayment`,
`cancelAutoRenew`, `moyasarWebhook`, `renewMoyasarSubscriptions`, and `getReferralCode`, all in
`billing.ts` — writes `users/{uid}.entitlement`), the `claimStaffAccess`, `claimSchoolSeat`, and
`claimFoundingAccess` (pre-launch grandfather grant) complimentary/seat-grant callables, and the B2B
org callables (`getMyOrgs`, `getCohortReadiness`, `provisionSeats`). `functions/src/index.ts` is the
single deploy manifest — only triggers exported there are deployed. It is its own npm package with
its own CI gate — run `npm run lint && npm test && npm run build` inside `functions/` when you touch
it (root `npm run verify` does not cover it). Deploy region is `me-central2` (Dammam, in-Kingdom /
PDPL; the single source of truth is `functions/src/region.ts`, mirrored client-side by
`FUNCTIONS_REGION` in `src/lib/services/firebase.ts`). firebase.json's rewrite regions must match —
`functions/tests/region.test.ts` guards and pins that pairing. The `me-central1` → `me-central2`
cutover is **switched in code/config** (Firestore already sits in `me-central2`), but the production
Cloud Functions have **not been redeployed** to `me-central2` yet — they still run in `me-central1`,
so a Firebase Hosting deploy currently errors ("functions … present but in the wrong region") until
the next functions deploy lands. (`docs/RUNBOOK-deploy.md` still calls the cutover "planned" and is
itself stale.)

## Architecture

- **Build:** Vite + TypeScript (strict). `npm run build` runs
  `build:sitemap → tsc -b → vite build → prerender-head → check:prerender` → `dist/`, which is both
  the static-host payload and the Capacitor `webDir`. `prerender-head.mjs` stamps per-route
  `<head>` meta (titles, descriptions, canonical, OG, JSON-LD) into the shipped HTML for SEO/AI
  search; `check:prerender` asserts coverage. A fuller static-HTML prerender (`npm run prerender`)
  runs in the deploy pipeline.
- **Routing:** `src/router.tsx` is the single route table (routes are lazy-loaded per page). Pages
  live one-per-folder under `src/pages/`. The shared chrome (`src/app/Layout|Header|Footer`, plus
  `MobileDock`, `AccountMenu`, and the `src/app/nav.ts` nav registry)
  replaces the legacy `build-chrome.js` stamper — chrome is now a component, never copied.
- **i18n / RTL:** `src/i18n/index.ts` boots i18next from `en.json` / `ar.json` and mirrors the
  choice onto `<html lang/dir>` so RTL flips document-wide. `LangToggle` switches languages.
- **Styling:** `src/styles/tokens.css` is the design-token source of truth (the Falcon palette);
  components use CSS Modules with **logical properties** so RTL mirrors automatically. See
  `FIGMA_DESIGN_SYSTEM.md` for the design system. Motion is tokenized too: `framer-motion` mirrors
  the CSS motion tokens in `src/components/bento/motion.ts`, and
  `tests/bento-motion-parity.test.ts` **fails the build if the two drift**; respect
  `usePrefersReducedMotion`.
- **Data:** the regulatory JSON corpus + indexes ship under `public/data/` and are fetched at
  runtime via `src/lib/content.ts` (`fetchJson`; corpus shapes in `src/lib/content.types.ts`,
  corpus-link routing in `src/lib/contentLinks.ts`) + the `useFetchJson` hook — the heavy corpus never
  enters the JS bundle. (The ~19 MB `library-search.json` and ebooks remain lazy/streamed, as in the
  legacy app.) In production the corpus is offloaded to a bucket and served network-first.
- **Calculators:** pure, DOM-free logic in `src/calc/*` (no DOM/i18n) so it is unit-testable.
  Aviation tool math stays **flat** at the `src/calc/` root (`isa`, `tas`, `crosswind`, `holding`,
  `runway*`, … — one module per catalog tool, plus the shared date math `recency` and the shared
  numeric guards `guards` (`fin` · `ok` · `norm360` — use these, never a local copy)); the non-tool
  helpers live in subfolders by domain — `calc/chat/` (Captain Adel answer/thread/voice:
  `chat*`, `conversations`, `transcript`, `markdown`, `speech`, `textToSpeech`, `voiceSelection`),
  `calc/pilot/` (`currency`, `logbook`, `achievements`, `onboarding`, `ics`, plus the shared
  `flightFields` readers for the free-text `Flight` columns), `calc/library/`
  (`anchor`, `corpusNav`, `changeTracking`, `offlineManifest`, `libraryFilter`, `constellation`),
  `calc/study/` (`srs` — the cross-platform contract the apple/ Swift port mirrors — `shuffle`, and
  `glidePath`), `calc/hud/` (the airspace-sim engine: `scenario`, `kinematics`, `projection`,
  `sectors`, `geoKsa`, `callsigns`, `simMetar`, seeded `rng`), and `calc/app/`
  (`authError`, `dashboardLayout`, `toolPresets`). Subfolders may import the flat core
  (`@/calc/recency`), never each other sideways. The
  `CalcShell` component provides the shared frame (copy-link · try-an-example · ask-Captain-Adel ·
  disclaimer). Input state lives in the URL: a page that consumes **any numeric input** uses
  `useNumericInputs` (reads floats from `nums.<key>`, everything else from `inputs.<key>`);
  string-only pages (decoders, directories) use raw `useUrlState`. Because `CalcShell` renders a
  copy-link button unconditionally, a page that keeps inputs in `useState` silently hands out blank
  links — that is what the hook prevents, not a style preference. Shared field/output layout comes
  from `FieldGrid`/`OutputGrid` + `ResultStat` (`src/components/calc/` — which also holds the
  `NumberField`/`SelectField`/`TextField` field primitives and the `GaugeDial` instrument readout),
  and whole-number output
  goes through `fmtInt` (`src/components/calc/format.ts`). This replaces the legacy `FGCalc` helper
  (`calc-tools.js`). **Crosswind is the reference implementation** every
  other tool follows (its bespoke diagram-beside-inputs layout is the one sanctioned exception to
  `FieldGrid`).
- **Services:** `src/lib/` holds the typed frontend services, grouped by concern:
  `src/lib/services/` (Firebase/account: `firebase`, `auth`, `account`, `sync`, `org`, `staff`,
  `school`, `founding`, `entitlements`, `packEntitlements`, `features`, `billing`, `promo`,
  `pricing`, `referral`, `waitlist`, `studyProgressSync`), `src/lib/prefs/` (localStorage preference
  stores — all built on the `createPrefStore` factory, which owns the listener/snapshot plumbing and
  the best-effort storage helpers; never hand-roll another `useSyncExternalStore` store here),
  `src/lib/seo/` (`seo`, `jsonld`), `src/lib/native/` (`nativeBridge`, `pwa`, `offlineCache`),
  with cross-cutting modules (`api`, `content`, `analytics`, `theme`, …) at the `src/lib/` root.
  `tools.ts` and `prepCatalog.ts` stay pinned at the `src/lib/` root — pipeline scripts under
  `scripts/` parse them by that literal path. The shared React hooks live in `src/hooks/`
  (`useNumericInputs`, `useUrlState`, `useFetchJson`, `usePageMeta` — which also exports
  `useNoindexMeta` — `useCopyToClipboard`, `useOfflineSync`, `useViewMode`, `useForm`,
  `usePrefersReducedMotion`, …). `entitlements.isActive` is a pure
  predicate mirroring `functions/src/billing-core.ts`, and `features.ts` (`FEATURE_PLAN` /
  `useFeature`) is the single source of truth for which plan unlocks which premium feature — but the
  `entitlement` record is **server-only**; the app reads it only to gate UI, never to grant, and true
  enforcement stays in the gateway. Exam-prep packs are gated by `packEntitlements.ts` (a
  promo-immune gate: a pack unlocks on permanent one-time ownership in `packEntitlements/{uid}` OR an
  active paid plan); their structure lives in `prepCatalog.ts` (names/blurbs localized under
  `study.packCatalog.<id>`, same structure-in-TS pattern as `tools.ts`).
- **Local-first by default:** when no Firebase is configured (the default local/dev build) the
  Firebase accessors resolve to `null` and every Firebase-gated service (`org`, `waitlist`,
  `studyProgressSync`, sync, auth) degrades to a best-effort no-op — the app stays fully usable
  offline. Study progress lives client-side (`src/lib/studyProgress.ts` is the source of truth);
  `studyProgressSync.ts` is an upload-only backup that feeds the B2B cohort readiness report.
- **PWA / native:** `vite-plugin-pwa` generates the service worker (app shell precached,
  `/data/*` network-first). `src/lib/native/nativeBridge.ts` is inert on web and routes auth/IAP/offline-cache
  through Capacitor plugins inside the native shell (`capacitor.config.ts`; iOS + Android).

## Backend (`functions/`)

- **Pattern:** every business rule lives in a pure, Firebase-free `*-core.ts` module (e.g.
  `billing-core`, `chat-quota-core`, `rate-limit-core`, `staff-core`, `school-core`, `student-core`,
  `org-core`, `referral-core`, `feedback-core`, `api-key-core`, `api-tier-core`, `founding-core`,
  `promo-core`, `auth-core`) so policy is unit-testable in isolation; the Express/Firestore wrappers
  (`gateway.ts`, `billing.ts`, `staff.ts`, `school.ts`, `founding.ts`, `org.ts`) stay thin.
  Client-side mirrors (`src/calc/chat/chatQuota.ts`, `src/lib/services/entitlements.ts`,
  `src/lib/services/features.ts`) must match their server core —
  `tests/client-server-mirrors.test.ts` enforces this, it is not just convention.
- **Entitlement is server-owned.** `users/{uid}.entitlement` is written **only** by Cloud Functions
  through the Admin SDK (which bypasses `firestore.rules`): the **Moyasar** billing callables
  (`billing.ts` — `createCheckoutConfig`/`confirmPayment`/`moyasarWebhook`), `claimStaffAccess`
  (`staff.ts`), `claimSchoolSeat` (`school.ts`), and `claimFoundingAccess` (`founding.ts` —
  one-time, time-limited Pro grant for accounts created before the launch cutoff); B2B seats are
  provisioned via `provisionSeats` (`org.ts`). Grants only ever upgrade — a grant never downgrades,
  so it can't clobber a paid plan. Clients can never write `entitlement` (rules forbid it). A
  domain/staff/student match is honoured **only for a verified email** — email verification is the
  ownership proof. The app never grants; it only reads `entitlement` to gate UI. Checkout supports
  server-validated promo codes (`promo-core.ts`, `promoCodes/{code}`) applied only to the first
  charge — the client passes the code string, never a price.
- Docs: `docs/DESIGN-genkit-rag-backend.md`, `docs/BILLING.md`, `docs/APP-CHECK-BACKEND.md`,
  `docs/LICENSED-API.md` (the `/v1/ask` metered API, `api-tier-core.ts` tiers),
  `docs/PRICING-REVENUE-STRATEGY.md`, `docs/b2b/` (org-admin dashboard + study-progress-sync
  design).

## Hosting & deploy

The single Vite build (`dist/`) is served from several fronts, all pointing at the **same** Firebase
Cloud Functions gateway for `/api/*`:

- **Firebase Hosting** is the **canonical origin**: it fronts the Cloud Functions (`chat`,
  `moyasarWebhook`) and — since the DNS cutover completed 2026-07-31 — serves the `flygaca.com`
  apex and `www` directly (with `flygaca-app.web.app` as the underlying site). `npm run deploy`
  builds → `prerender` → coverage check → `firebase deploy`, but the **production deploy path is
  the `deploy.yml` workflow**, which additionally offloads the corpus to the bucket.
- **Cloudflare Worker** (`worker/index.ts` + `wrangler.toml`) and the **Netlify** / **Vercel**
  mirrors each serve `dist/` and **proxy `/api/*` back to the Firebase origin** as a same-origin
  rewrite — so chat/content keep working and the strict CSP (`connect-src 'self'`) never changes.
  Keep any new API surface under `/api/*` for this to hold. The mirrors `X-Robots-Tag: noindex`
  any host that isn't `flygaca.com`.
- Redirects consolidate the marketing domains onto `flygaca.com` (e.g. `captadel.com` → `flygaca.com`
  in `vercel.json` — that rule only fires for traffic still hitting Vercel).

See `docs/RUNBOOK-deploy.md` for the deploy runbook (including the completed `flygaca.com` DNS
cutover and the in-progress `me-central1` → `me-central2` functions cutover — config switched, the
production functions redeploy still pending) and `docs/DATA-HOSTING.md`
for how the corpus bucket is served. `dataconnect/` (Firebase Data Connect) and
`supabase/migrations/` (pgvector for RAG embeddings) hold the datastore schemas.

## Conventions (enforced)

- **Bilingual + RTL is first-class.** New copy → a key in **both** `src/i18n/en.json` and
  `ar.json`. `npm run test` fails on any key present in one language but not the other
  (`tests/i18n-parity.test.ts`).
- **The disclaimer never drifts.** Use `<Disclaimer />`; do not inline or reword the
  not-affiliated / verify-against-GACA text.
- **Tokens only / logical properties only.** No hard-coded colours; no physical `left`/`right`.
- **Never commit build output.** `public/sitemap.xml` / `public/robots.txt` are regenerated by
  `build:sitemap` and git-ignored. Keep branches synced with `main`; see `docs/MERGE-CONFLICTS.md`
  for prevention + how to resolve lockfile / i18n conflicts.
- Run `npm run verify` before committing. It chains the frontend gate —
  `typecheck → lint → format:check → test → build → check:bundle` (`check:bundle` fails if the
  initial gzipped JS exceeds its budget — 188 kB today; route chunks excluded by design). CI
  (`.github/workflows/ci.yml`) mirrors the same steps individually but swaps `test` for
  `test:coverage` — a coverage **ratchet** with thresholds in `vitest.config.ts` — plus three more
  jobs you should be aware of when your change touches them:
  **functions** (`lint · test:coverage · build` inside `functions/`), **Firestore rules**
  (`npm run test:rules`, emulator-backed — `firestore.rules` + `tests/rules/`), and **e2e · a11y**
  (`npm run test:e2e`, Playwright — `e2e/smoke.spec.ts`, `flows.spec.ts`, `a11y.spec.ts`).
  `.github/workflows/` holds six workflows in all: `ci.yml`, **`deploy.yml`** (the only production
  deploy — build, budgets, prerender, corpus-bucket offload, `firebase deploy`),
  `deploy-cloudflare.yml` (mirror, secret-gated), `firebase-hosting-pull-request.yml` (PR
  previews), `ios.yml` (Swift tests + per-app builds), and **docs-parser** — which lints the
  regulatory Markdown (`lint:md`), runs `parse:regulations`, and upserts embeddings.

## Adding a new tool

The legacy→React migration is **complete** (all catalog tools are live). To add a tool: register
it in `src/lib/tools.ts` — the typed catalog registry and single source of truth (`status:
'soon'` until it ships, then flip to `'live'`) — lift its math into `src/calc/<tool>.ts` (pure,
add a Vitest spec), build a page under `src/pages/tools/<category>/` (the folder matching the
registry's `category`; `ToolsIndex` alone stays at the `tools/` root) using `CalcShell` + `useNumericInputs`
(or `useUrlState` for string-only tools), add its strings to both i18n bundles, and register the
route in `router.tsx`. Names/blurbs/category labels resolve from i18n by id, so the registry holds
only structure (route, category, status, keywords).

## Content & data pipelines (`scripts/`)

Node ESM scripts under `scripts/` (many wired to npm scripts) maintain the corpus and generated
assets — e.g. `sync:gaca` + `data:normalize` (pull/normalise the regulatory corpus; `sync:gaca:apply`
is the apply-and-normalise variant), `parse:regulations` (compile the cross-ref lookup from
`content/regulations/*.md`), `build:airports` / `build:chunks` / `embeddings:upsert` (Supabase
pgvector), `build:sitemap`, `gen:og`, `gen:aip-sheet` (build the AIP study sheet), `gen:captain`
(Captain Adel imagery), `audit:ai` (the AI-search visibility audit behind `SEO-PLAN.md`),
`optimize:img`, and `new:guide` (scaffold a guide — see `GUIDE_AUTHORING.md`). Shared script
helpers live in `scripts/lib/` (flavor slicing, markdown splitting, regulations parsing, sync
merge) and `scripts/native/` (iOS build/signing helpers). Deploy slices exist as
`deploy:rules` / `deploy:functions` / `deploy:all` — `npm run deploy` alone does **not** deploy
`functions/`.

## Where to look

`MIGRATION.md` (rebuild log), `ROADMAP.md` (what's next), `README.md` (getting started),
`GUIDE_AUTHORING.md` (learn content), `FIGMA_DESIGN_SYSTEM.md` (design system),
`SEO-PLAN.md` + the `flygaca-seo` skill (search/AI-search visibility; vendored skills live under
`.claude/skills/`, pinned by `skills-lock.json`), `docs/ARCHITECTURE-BLUEPRINT.md`
(platform-wide technical blueprint), root `SECURITY.md`, and `docs/` generally (design, billing,
`RUNBOOK-deploy.md` / `DATA-HOSTING.md`, `RUNBOOK-firebase.md`, the `RUNBOOK-ios-*.md` set,
`LICENSED-API.md`, `PRICING-REVENUE-STRATEGY.md`, `RUNBOOK-native.md` /
`STORE-SUITE.md` (the iOS app family), `APPS-FAMILY-ROADMAP.md`, `STUDY-CONTENT-REVIEW.md`,
`TESTING-ROADMAP.md`, `corpus-link-shape.md`, `docs/seo/`, `b2b/` designs). The legacy source (the
original vanilla Fly GACA site) remains the reference for anything still ported from the old site.

`archive/` is parked non-app material — vendored third-party reference collections, the per-tool
agent-config folders, scripts nothing calls, finished-work docs (completed audits, the legacy-PWA
cutover runbook), and the investor material. Nothing there is imported, built, or linted; see
`archive/README.md` before assuming something is missing. `docs/` is live engineering
documentation, plus two point-in-time subtrees (`docs/seo/archive/`,
`docs/screenshots/review-2026-07/`).
