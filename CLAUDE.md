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
`/checkout/return`), a **licensed Captain Adel API** marketing page (`/developers`), a **B2B
org-admin** cohort dashboard (`/business/admin`), and `/about`, `/support` +
legal pages (`/disclaimer`, `/terms`, `/privacy`, `/refund`, `/safety`). Home itself is a **bento
dashboard** (`src/components/bento/` —
grid, card glow, and a widgets/ family — lazy-loaded off the hero's critical path), and the global
**command palette** (`src/components/CommandPalette/`) jumps between all of these. `/learn` is the
canonical hub — `/study` and `/guides` redirect into it (`/study` → `/learn?tab=practice`); don't
relink them to the old paths.

**Arabic is the same route tree mounted under `basename: '/ar'`** (`src/router.tsx` bottom +
`localeRedirect`/`AR_PREFIX` in `src/lib/seo/seo.ts`, applied in `src/main.tsx` before the router
mounts). React Router strips the prefix, so `<Link>`s auto-prepend `/ar` and `useLocation()` still
reports the logical path — never hand-write `/ar/...` into a link.

Beyond the web app there is a **flavor** switch (`src/flavors/`, `src/app/flavor/`; `IS_FLAVOR_APP`
is defined in `src/flavors/current.ts` and consumed by `src/router.tsx`) that swaps in a reduced,
single-pack route tree for the per-pack app builds; `scripts/build-flavor.mjs` slices content per
flavor. **The native Swift/Xcode code is no longer in this repo** — the `apple/` mirror was retired
(2026-08) and lives only in `ay2m/FlyGACA-ios`. What stays here is the **content source of truth**
it consumes: `public/data/`, `src/lib/prepCatalog.ts`, and the generators
`scripts/build-ios-content.mjs` + `scripts/native/gen-app-icons.mjs`, which the iOS repo's
`scripts/sync-content.sh` shells into. The leftover `ios:build:*` / `ios:generate` /
`screenshots:*` npm scripts and `scripts/native/xcodebuild-wrapper.sh` have **no `apple/` tree to
act on here** — treat them as dead in this repo and do the work in `FlyGACA-ios`.

The repo also contains the **backend**: `functions/` holds the Firebase Cloud Functions — the
Express gateway (`chat`) serving `/api/chat` + `/api/feedback` (auth, App Check, rate limiting, free
daily quota, SSE) plus the licensed `/v1/ask` API surface (tiered, API-key-authenticated —
`api-key-core.ts` / `api-tier-core.ts`), the Captain Adel RAG flow (Genkit + Gemini —
`captain-adel.ts`, `captain-adel-prompt.ts`, `corpus.ts`), **Moyasar** billing (`createCheckoutConfig`, `confirmPayment`,
`cancelAutoRenew`, `moyasarWebhook`, `renewMoyasarSubscriptions`, and `getReferralCode`, all in
`billing.ts` — writes `users/{uid}.entitlement`), the `claimStaffAccess`, `claimSchoolSeat`, and
`claimFoundingAccess` (pre-launch grandfather grant) complimentary/seat-grant callables, and the B2B
org callables (`getMyOrgs`, `getCohortReadiness`, `provisionSeats`). `functions/src/index.ts` is the
single deploy manifest — only triggers exported there are deployed. It is its own npm package with
its own gate — run `npm run lint && npm test && npm run build` inside `functions/` when you touch
it (root `npm run verify` does not cover it). Deploy region is **`me-central1`**: the single source
of truth is `functions/src/region.ts`, mirrored client-side by `FUNCTIONS_REGION` in
`src/lib/services/firebase.ts` and by every `"region"` field in `firebase.json`'s rewrites —
`functions/tests/region.test.ts` guards and pins that pairing, and Hosting refuses to finalize a
version if they disagree. Firestore already sits in `me-central2` (Dammam, in-Kingdom / PDPL); the
`me-central1` → `me-central2` functions cutover is **still pending** and is a deliberate ordered
migration, not a one-line edit — deploy to `me-central2` first, flip the config last, then delete
the stranded `me-central1` functions (procedure in the header comment of `region.ts`).

## Architecture

- **Build:** Vite + TypeScript (strict). `npm run build` runs
  `build:sitemap → tsc -b → vite build → prerender-head → check:prerender → check:jsonld` →
  `dist/`, which is both
  the static-host payload and the Capacitor `webDir`. `prerender-head.mjs` stamps per-route
  `<head>` meta (titles, descriptions, canonical, OG, JSON-LD) into the shipped HTML for SEO/AI
  search; `check:prerender` asserts coverage and `check:jsonld` validates the stamped structured
  data. A fuller static-HTML prerender (`npm run prerender`) runs in the deploy path, followed by
  `check:prerender:coverage`.
- **Routing:** `src/router.tsx` is the single route table (routes are lazy-loaded per page). Pages
  live one-per-folder under `src/pages/`. The shared chrome (`src/app/Layout|Header|Footer`, plus
  `MobileDock`, `AccountMenu`, and the `src/app/nav.ts` nav registry)
  replaces the legacy `build-chrome.js` stamper — chrome is now a component, never copied.
- **i18n / RTL:** `src/i18n/index.ts` boots i18next from `en.json` / `ar.json` and mirrors the
  choice onto `<html lang/dir>` so RTL flips document-wide. `LangToggle` switches languages, and
  the language also owns the URL: Arabic documents live under the `/ar` basename (see above), so a
  language switch is a navigation, not just a state change.
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
  `calc/study/` (`srs` — the cross-platform contract the `FlyGACA-ios` Swift port mirrors — `shuffle`, and
  `glidePath`), `calc/hud/` (the airspace-sim engine: `scenario`, `kinematics`, `projection`,
  `sectors`, `geoKsa`, `callsigns`, `simMetar`, seeded `rng`), and `calc/app/`
  (`authError`, `dashboardLayout`, `emailShape`, `passwordPolicy`, `pricingView`, `toolPresets`).
  Subfolders may import the flat core
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
- **Tests:** `functions/tests/` mirrors the source one-file-per-module (`*-core.test.ts` for the
  pure policy, `*-routes.test.ts` for the Express wrappers), plus `region.test.ts` (the
  region/`firebase.json` pairing) and the `corpus-*.test.ts` set (citation + lineage integrity of
  the RAG corpus loader).
- The `docs/` tree that used to hold the backend design notes (`DESIGN-genkit-rag-backend.md`,
  `BILLING.md`, `APP-CHECK-BACKEND.md`, `LICENSED-API.md`, `b2b/`) **is no longer in the repo** —
  see "Repo layout" below. The code is the reference now; `functions/src/index.ts`'s header comment
  and the `*-core.ts` module headers carry the surviving rationale.

## Hosting & deploy

The single Vite build (`dist/`) is served from several fronts, all pointing at the **same** Firebase
Cloud Functions gateway for `/api/*`:

- **Firebase Hosting** is the **canonical origin**: it fronts the Cloud Functions (`chat`,
  `moyasarWebhook`) and — since the DNS cutover completed 2026-07-31 — serves the `flygaca.com`
  apex and `www` directly (with `flygaca-app.web.app` as the underlying site). `npm run deploy`
  builds → `prerender` → `check:prerender:coverage` → `firebase deploy --only hosting`; it does
  **not** deploy `functions/` (use `deploy:functions` / `deploy:all`). The GitHub Actions
  `deploy.yml` workflow, which owns production deploys and additionally offloads the corpus to the
  bucket, was restored after the 2026-08-16 `.github/` deletion incident (see "Repo layout") — it
  is gated on the `DEPLOY_FUNCTIONS` repo variable and the deploy secrets as before; re-verify those
  are still configured before relying on it.
- **Cloudflare Worker** (`worker/index.ts` + `wrangler.toml`) and the **Netlify** / **Vercel**
  mirrors each serve `dist/` and **proxy `/api/*` back to the Firebase origin** as a same-origin
  rewrite — so chat/content keep working and the strict CSP (`connect-src 'self'`) never changes.
  Keep any new API surface under `/api/*` for this to hold. The mirrors `X-Robots-Tag: noindex`
  any host that isn't `flygaca.com`.
- Redirects consolidate the marketing domains onto `flygaca.com` (e.g. `captadel.com` → `flygaca.com`
  in `vercel.json` — that rule only fires for traffic still hitting Vercel).

Hosting/runtime config lives in the repo root, not in prose: `firebase.json` (rewrites + regions),
`firestore.rules` / `firestore.indexes.json` / `storage.rules` / `database.rules.json`,
`apphosting.yaml`, `remoteconfig.template.json`, `wrangler.toml`, `netlify.toml`, `vercel.json`.
`supabase/migrations/` holds the pgvector schema for the RAG embeddings. (`dataconnect/` and the
`docs/RUNBOOK-deploy.md` / `docs/DATA-HOSTING.md` runbooks are no longer in the repo.)

## Conventions (enforced)

- **Bilingual + RTL is first-class.** New copy → a key in **both** `src/i18n/en.json` and
  `ar.json`. `npm run test` fails on any key present in one language but not the other
  (`tests/i18n-parity.test.ts`).
- **The disclaimer never drifts.** Use `<Disclaimer />`; do not inline or reword the
  not-affiliated / verify-against-GACA text.
- **Tokens only / logical properties only.** No hard-coded colours; no physical `left`/`right`.
- **Never commit build output.** `public/sitemap.xml` / `public/robots.txt` are regenerated by
  `build:sitemap` and git-ignored. Keep branches synced with `main`.
- **`npm run verify` is the gate**, run locally and mirrored by `ci.yml`'s `build` job on every
  push/PR (restored 2026-08-18 after the `.github/` deletion incident — see "Repo layout"; the
  workflow itself notes why it pins Node 24, not 20, for the coverage ratchet). Vercel's Git
  integration still builds a preview per PR alongside it, and remains useful for catching a broken
  `vite build` fastest and on **Linux**, where a case-only filename mistake surfaces. `verify` chains
  `typecheck → lint → format:check → test → build → check:bundle → check:perf`. `check:bundle` fails
  if the **initial** gzipped JS exceeds its budget (`BUDGET_KB = 189` in `scripts/check-bundle.mjs`;
  route chunks are lazy and excluded by design — the constant's header comment logs every re-base
  and why, so add a line there rather than silently bumping it). `check:perf` is the companion gate
  over **every** emitted chunk — a per-chunk gz ceiling plus a total-footprint ceiling — catching a
  lazy route chunk that balloons, which `check:bundle` ignores.
- Suites `verify` does **not** run, and when to run them yourself:
  - `functions/`: `cd functions && npm run lint && npm test && npm run build` — its own npm package.
  - `npm run test:rules` — `firestore.rules` against `tests/rules/`, wrapped in
    `firebase emulators:exec` (needs the Firestore emulator, hence its own
    `vitest.rules.config.ts` and exclusion from the default run).
  - `npm run test:coverage` — the coverage **ratchet**; thresholds live in `vitest.config.ts`.
  - `npm run test:e2e` — Playwright, `testDir: './e2e'`. **The `e2e/` directory is not in the repo
    right now**, so this collects nothing; `playwright.config.ts` is retained for when the specs
    return.

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
assets — e.g. `sync:gaca` + `data:normalize` (pull/normalise the regulatory corpus into
`public/data/`; `sync:gaca:apply` is the apply-and-normalise variant, and `sync-input/` is its
staging area), `build:airports` / `build:chunks` / `embeddings:upsert` (Supabase pgvector),
`build:sitemap`, `gen:og`, `gen:aip-sheet` (build the AIP study sheet), `gen:captain`
(Captain Adel imagery), `audit:ai` + `indexnow` (the AI-search visibility audit and IndexNow ping
behind `SEO-PLAN.md`), `optimize:img`, `new:guide` (scaffold a guide — see `GUIDE_AUTHORING.md`),
and `build:apps-content` (`build-ios-content.mjs` — generates the iOS repo's `Content/` folders).
Shared script helpers live in `scripts/lib/` (flavor slicing, markdown splitting, regulations
parsing, sync merge). Deploy slices exist as `deploy:rules` / `deploy:functions` / `deploy:all`.

Two script pairs are currently **input-less**, because `content/regulations/*.md` left with the
`content/` tree: `lint:md` (markdownlint over that glob) and `parse:regulations` (which compiled
`public/data/regulations-lookup.json` from it). The generated lookup is still committed and still
read at runtime — regenerating it means restoring the Markdown source first.

## Where to look

> 📖 **Family context:** [The Book of Fly GACA](https://github.com/ay2m/FlyGACA/blob/main/THE-BOOK-OF-FLY-GACA.md) is the whole-family reference — all ten repos, the shared tenets, and the glossary in one place.

Documentation now lives **entirely at the repo root**: `README.md` (getting started),
`ROADMAP.md` (the single source of truth for open work), `MIGRATION.md` (rebuild log),
`GUIDE_AUTHORING.md` (learn content), `FIGMA_DESIGN_SYSTEM.md` (design system),
`SEO-PLAN.md` (search / AI-search visibility — the companion `flygaca-seo` skill is provided by the
Claude Code session, not by the repo), `SCREENSHOTS.md` (the iOS marketing-screenshot workflow —
its commands run in `FlyGACA-ios`), `CONTRIBUTING.md`, `SECURITY.md`, and `LICENSE`. Sibling repos:
`ay2m/FlyGACA-ios` (native Swift app family), `ay2m/Captain-Adel` (the standalone AI service),
`ay2m/Office` (business/governance documents).

### Repo layout — what is *not* here anymore

A single large housekeeping commit (`a6c98e3`, 2026-08-16, on `main`) removed several top-level
trees, apparently by accident: it landed with an unsigned, undescribed commit ("commit") pushed
directly to `main` with no PR, from an account with no other legitimate history in this repo, and
it reintroduced hosting configs (`vercel.json`, `netlify.toml`, `apphosting.yaml`, `worker/`) that
an earlier, deliberate migration had removed. `.github/workflows/` — including `ci.yml`, the
`build`/`functions`/`rules`/`e2e` gate — was restored from pre-incident history on 2026-08-18; see
the git log for exactly which commit. The tracked tree still lacks `docs/`, `e2e/` specs, `content/`,
and a few other trees this incident removed:

| Removed | Consequence |
| --- | --- |
| `docs/` | Every `docs/…` link in `README.md` and older docs is dead, including the screenshot images the README embeds. |
| `e2e/` | `npm run test:e2e` collects no specs (config retained, `ci.yml`'s `e2e` job runs green on zero tests). |
| `content/` | `lint:md` and `parse:regulations` have no input (see above); `docs-parser.yml` is restored but stays dormant — it's path-filtered on `content/regulations/**`, which doesn't exist. |
| `apple/` | Retired earlier (2026-08) into `ay2m/FlyGACA-ios`; the `ios:*` npm scripts are dead here — unrelated to this incident. |
| `archive/`, `dataconnect/`, `.agents/` | Parked/vendored material. `.agents/` held the `skills` CLI's install tree; the root `skills-lock.json` still pins those eleven `firebase-*` skills and remains orphaned — nothing in the repo reads it. |
| `.claude/` | **Partially restored** (2026-08-18): `.claude/skills/` now carries the seven vendored cybersecurity skills this repo had before the incident, plus `THIRD_PARTY_NOTICES.md` and a `settings.json` marketplace registration. The deleted `.claude/agents/` subagents and the `.agents/`-symlinked `firebase-*` skills were **not** restored. |

Treat that table as description, not aspiration: don't "fix" a doc by re-adding a tree, and don't
cite a `docs/` path in new writing. Restoring any of the remaining trees is a real decision (content
volume, whether the source still exists elsewhere) worth raising with a maintainer first — unlike
`.github/workflows/`, which is pure infrastructure recovered verbatim from git history with no
judgment call involved.

That commit also swept up eight `src/` files. Seven had no remaining references, but
`src/pages/hud/hud.module.css` was live — imported by five HUD components, and distinct from
`Hud.module.css` — so the build broke on any case-sensitive filesystem while still resolving on
macOS. It has been restored. **Lesson for this repo: a case-only filename difference is invisible
on a Mac**; if you rename or delete a CSS module, build once on Linux (or in CI) before trusting it.

The same commit also deleted `scripts/link-lint-typescript.mjs`, together with the `typescript-6`
devDependency alias and the `postinstall` hook that runs it — see below. Also restored.

### Two TypeScripts, on purpose

`typescript-eslint@8` **throws on load under TypeScript 7** ("does not support TS 7.0"), before
ESLint reads a single file — and since `lint` comes early in the `verify` chain, that alone stops
the whole gate. It supports `>=4.8.4 <6.1.0`; no released version handles TS 7, so upgrading it is
not an option and downgrading TypeScript would undo the deliberate TS 7 migration.

So the repo runs **two** TypeScripts side by side, exactly as TypeScript's own 7.0 announcement
prescribes:

- `typescript: ^7.0.2` — what `tsc -b` and the build use.
- `typescript-6: npm:typescript@6.0.3` — what typescript-eslint gets, via
  `scripts/link-lint-typescript.mjs`, run from `postinstall`. It symlinks
  `node_modules/<each typescript-eslint package>/node_modules/typescript` → `typescript-6`.

**npm `overrides` cannot express this** — `typescript` is a *peer* dependency of the
`@typescript-eslint/*` packages and a direct root devDependency, so npm hoists the root's 7.x into
the single slot and resolves the peer to it, marking the override invalid instead of nesting a
second copy. That reasoning lives in the script's header; read it before touching this.

`functions/` carries its own self-contained copy of the same script and alias (a `../scripts/…`
import would break `firebase deploy --only functions`, which uploads only that directory).

This is a workaround, not a design. **Delete all of it** — script, `postinstall`, and the
`typescript-6` alias, in both packages — once typescript-eslint ships TS 7 support; `npm run lint`
passing without it is the signal.
