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
library** (`/library`, documents + charts), **Captain Adel** chat (`/chat`), the **flight-tools
catalog** (`/tools/*`), a **learn/guides** hub (`/learn`, `/guides/:slug`), **study** tools
(`/study/*` — quiz, flashcards, ground school, mock exam, paths, packs, study sheets), an
authenticated **account** area (`/dashboard`, `/currency`, `/logbook`, `/records`, `/settings`),
**pricing/schools** (`/pricing`, `/schools`), and legal pages.

The repo also contains the **backend**: `functions/` holds the Firebase Cloud Functions — the
Express gateway (`chat`) serving `/api/chat` + `/api/feedback` (auth, App Check, rate limiting, free
daily quota, SSE), the Captain Adel RAG flow (Genkit + Gemini, see
`docs/DESIGN-genkit-rag-backend.md`), Stripe billing (`stripeWebhook` is the **only** writer of
`users/{uid}.entitlement`), a referral-code callable, and the `claimStaffAccess` complimentary-grant
callable. `functions/src/index.ts` is the single deploy manifest. It is its own npm package with its
own CI gate — run `npm run lint && npm test && npm run build` inside `functions/` when you touch it
(root `npm run verify` does not cover it). Deploy region is `me-central1`
(`functions/src/region.ts`; firebase.json's rewrite regions must match).

## Architecture

- **Build:** Vite + TypeScript (strict). `npm run build` runs
  `build:sitemap → tsc -b → vite build → prerender-head → check:prerender` → `dist/`, which is both
  the static-host payload and the Capacitor `webDir`. `prerender-head.mjs` stamps per-route
  `<head>` meta (titles, descriptions, canonical, OG, JSON-LD) into the shipped HTML for SEO/AI
  search; `check:prerender` asserts coverage. A fuller static-HTML prerender (`npm run prerender`)
  runs in the deploy pipeline.
- **Routing:** `src/router.tsx` is the single route table (routes are lazy-loaded per page). Pages
  live one-per-folder under `src/pages/`. The shared chrome (`src/app/Layout|Header|Footer`)
  replaces the legacy `build-chrome.js` stamper — chrome is now a component, never copied.
- **i18n / RTL:** `src/i18n/index.ts` boots i18next from `en.json` / `ar.json` and mirrors the
  choice onto `<html lang/dir>` so RTL flips document-wide. `LangToggle` switches languages.
- **Styling:** `src/styles/tokens.css` is the design-token source of truth (the Falcon palette);
  components use CSS Modules with **logical properties** so RTL mirrors automatically. See
  `FIGMA_DESIGN_SYSTEM.md` for the design system.
- **Data:** the regulatory JSON corpus + indexes ship under `public/data/` and are fetched at
  runtime via `src/lib/content.ts` (`fetchJson`) + the `useFetchJson` hook — the heavy corpus never
  enters the JS bundle. (The ~19 MB `library-search.json` and ebooks remain lazy/streamed, as in the
  legacy app.) In production the corpus is offloaded to a bucket and served network-first.
- **Calculators:** pure math in `src/calc/*` (no DOM/i18n) so it is unit-testable; the
  `CalcShell` component provides the shared frame (copy-link · try-an-example · ask-Captain-Adel ·
  disclaimer). Input state lives in the URL: a page that consumes **any numeric input** uses
  `useNumericInputs` (reads floats from `nums.<key>`, everything else from `inputs.<key>`);
  string-only pages (decoders, directories) use raw `useUrlState`. Shared field/output layout
  comes from `FieldGrid`/`OutputGrid` + `ResultStat` (`src/components/calc/`). This replaces the
  legacy `FGCalc` helper (`calc-tools.js`). **Crosswind is the reference implementation** every
  other tool follows (its bespoke diagram-beside-inputs layout is the one sanctioned exception to
  `FieldGrid`).
- **Services:** `src/lib/*.ts` are the typed frontend services (`api`, `auth`, `firebase`,
  `entitlements`, `billing`, `pricing`, `referral`, `staff`, `native-bridge`, `offlineCache`,
  `sync`, `analytics`, `seo`, `jsonld`, …) plus a family of `use*` hooks. `entitlements.isActive`
  is a pure predicate mirroring `functions/src/billing-core.ts` — the `entitlement` record is
  **server-only**; the app reads it only to gate UI, never to grant.
- **PWA / native:** `vite-plugin-pwa` generates the service worker (app shell precached,
  `/data/*` network-first). `native-bridge.ts` is inert on web and routes auth/IAP/offline-cache
  through Capacitor plugins inside the native shell (`capacitor.config.ts`; iOS + Android).

## Backend (`functions/`)

- **Pattern:** every business rule lives in a pure, Firebase-free `*-core.ts` module (e.g.
  `billing-core`, `chat-quota-core`, `rate-limit-core`, `staff-core`, `school-core`, `student-core`,
  `referral-core`, `feedback-core`, `api-key-core`) so policy is unit-testable in isolation; the
  Express/Firestore wrappers (`gateway.ts`, `billing.ts`, `staff.ts`) stay thin. Client-side
  mirrors (`src/calc/chatQuota.ts`, `src/lib/entitlements.ts`) must match their server core.
- **Entitlement is server-owned.** Tiers/grants come from Stripe (`stripeWebhook`), the staff grant,
  school seats (invoiced, provisioned by an admin), and the student rate (verified academic email).
  A domain/staff/student match is honoured **only for a verified email** — email verification is the
  ownership proof. The app never grants; it only reads `entitlement` to gate UI.
- Docs: `docs/DESIGN-genkit-rag-backend.md`, `docs/BILLING.md`, `docs/APP-CHECK-BACKEND.md`.

## Conventions (enforced)

- **Bilingual + RTL is first-class.** New copy → a key in **both** `src/i18n/en.json` and
  `ar.json`. `npm run test` fails on any key present in one language but not the other
  (`tests/i18n-parity.test.ts`).
- **The disclaimer never drifts.** Use `<Disclaimer />`; do not inline or reword the
  not-affiliated / verify-against-GACA text.
- **Tokens only / logical properties only.** No hard-coded colours; no physical `left`/`right`.
- Run `npm run verify` before committing. It chains the frontend CI gate —
  `typecheck → lint → format:check → test → build → check:bundle`. CI (`.github/workflows/ci.yml`)
  runs this plus three more jobs you should be aware of when your change touches them:
  **functions** (`lint · test · build` inside `functions/`), **Firestore rules**
  (`npm run test:rules`, emulator-backed — `firestore.rules` + `tests/rules/`), and **e2e · a11y**
  (`npm run test:e2e`, Playwright, `e2e/`). A separate **docs-parser** workflow lints the regulatory
  Markdown (`lint:md`), runs `parse:regulations`, and upserts embeddings.

## Adding a new tool

The legacy→React migration is **complete** (all catalog tools are live). To add a tool: register
it in `src/lib/tools.ts` — the typed catalog registry and single source of truth (`status:
'soon'` until it ships, then flip to `'live'`) — lift its math into `src/calc/<tool>.ts` (pure,
add a Vitest spec), build a page under `src/pages/tools/` using `CalcShell` + `useNumericInputs`
(or `useUrlState` for string-only tools), add its strings to both i18n bundles, and register the
route in `router.tsx`. Names/blurbs/category labels resolve from i18n by id, so the registry holds
only structure (route, category, status, keywords).

## Content & data pipelines (`scripts/`)

Node ESM scripts under `scripts/` (many wired to npm scripts) maintain the corpus and generated
assets — e.g. `sync:gaca` + `data:normalize` (pull/normalise the regulatory corpus),
`parse:regulations` (compile the cross-ref lookup from `content/regulations/*.md`), `build:airports`
/ `build:chunks` / `embeddings:upsert` (Supabase pgvector), `build:sitemap`, `gen:og`,
`optimize:img`, and `new:guide` (scaffold a guide — see `GUIDE_AUTHORING.md`).

## Where to look

`MIGRATION.md` (rebuild log), `ROADMAP.md` (what's next), `README.md` (getting started),
`GUIDE_AUTHORING.md` (learn content), `FIGMA_DESIGN_SYSTEM.md` (design system),
`SEO-PLAN.md` + the `flygaca-seo` skill (search/AI-search visibility), and `docs/` (design, billing,
runbooks, audits). The legacy source (the original vanilla Fly GACA site) remains the reference for
anything still ported from the old site.
