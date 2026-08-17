# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this is

The **Fly GACA app** — a TypeScript/React/Vite rebuild of the legacy no-build vanilla PWA
(the original Fly GACA site, whose source is not in this GitHub org — the regulatory corpus was
ported from it). Fly GACA is an independent, educational platform and open regulatory library for
Saudi civil aviation. It is **not affiliated with GACA**; treat that as load-bearing whenever you
touch user-facing copy — the product helps you find/study regulation, it never replaces it, and the
assistant cites the exact Part/section.

The app is more than calculators. Live surfaces (see `src/router.tsx`, ~123 route entries) include
the **regulatory library** (`/library`, documents + charts, plus `/library/map` — a Leaflet
aerodrome map — and the `/updates` corpus change feed), **Captain Adel** chat (`/chat`), the
**flight-tools catalog** (`/tools/*`), the interactive **Kingdom Airspace HUD** (`/hud` — a
simulated-traffic globe/HUD, pure sim logic in `src/calc/hud/`), a **learn/guides** hub (`/learn`,
`/guides/:slug`), **study** tools (`/study/*` — quiz, flashcards, ground school, mock exam, paths,
exam-prep **packs**, study sheets), an authenticated **account** area (`/account`, `/dashboard`,
`/currency`, `/logbook`, `/records`, `/settings`), **pricing/schools/checkout** (`/pricing`,
`/schools`, `/checkout`, `/checkout/return`), a **licensed Captain Adel API** marketing page
(`/developers`), a **B2B org-admin** cohort dashboard (`/business/admin`), a `/support` page, and
`/about` + legal pages (incl. `/refund`). Home itself is a **bento dashboard**
(`src/components/bento/` — grid, card glow, and a widgets/ family — lazy-loaded off the hero's
critical path), and the global **command palette** (`src/components/CommandPalette/`) jumps between
all of these. `/learn` is the canonical hub — `/study` and `/guides` redirect into it (`/study` →
`/learn?tab=practice`); don't relink them to the old paths.

The repo also contains the **backend**: `functions/` holds the Firebase Cloud Functions — the
Express gateway (`chat`) serving `/api/chat` + `/api/feedback` (auth, App Check, rate limiting, free
daily quota, SSE) plus the licensed `/v1/ask` API surface (tiered, API-key-authenticated),
the Captain Adel RAG flow (Genkit + Gemini), **Moyasar** billing (`createCheckoutConfig`,
`confirmPayment`, `cancelAutoRenew`, `moyasarWebhook`, `renewMoyasarSubscriptions`, and
`getReferralCode`, all in `billing.ts` — writes `users/{uid}.entitlement`), the `claimStaffAccess`,
`claimSchoolSeat`, and `claimFoundingAccess` (pre-launch grandfather grant) complimentary/seat-grant
callables, and the B2B org callables (`getMyOrgs`, `getCohortReadiness`, `provisionSeats`).
`functions/src/index.ts` is the single deploy manifest — only triggers exported there are deployed.
It is its own npm package with its own gate — run `npm run lint && npm test && npm run build` inside
`functions/` when you touch it (root `npm run verify` does not cover it).

> [!IMPORTANT]
> **Read "What is no longer in this repo" below before trusting older docs or your own memory.**
> A large prune (commit `a6c98e3`, 2026-08-16) removed ~2,260 files: the entire `docs/` tree, all
> GitHub Actions workflows, `archive/`, `content/`, `dataconnect/`, `e2e/`, `.claude/`, and the
> `apple/` native tree. Several npm scripts and config files still point at those deleted paths.

## Deploy region — everything is `me-central1` today

The single source of truth is `functions/src/region.ts` (`REGION = "me-central1"`), mirrored
client-side by `FUNCTIONS_REGION` in `src/lib/services/firebase.ts` and by every
`hosting.rewrites[].region` in `firebase.json`. All four agree — **do not "fix" one of them
in isolation**; Hosting refuses to finalize a version whose rewrite names a region the function
isn't deployed in.

**Firestore** already lives in `me-central2` (`firebase.json` → `firestore.location`), which is the
in-Kingdom / PDPL destination the functions are eventually meant to follow. That move is a
deliberate migration and has **not** started in code: deploy the functions to `me-central2` first,
flip `region.ts` + `firebase.json` + `firebase.ts` last, then delete the stranded `me-central1`
functions. `region.ts`'s header comment is the authoritative procedure now that
`docs/RUNBOOK-deploy.md` is gone. `functions/tests/region.test.ts` guards the code↔config pairing.

The Firebase project is **`flygaca-sa`** (`.firebaserc`) — not `flygaca-app`.

## Architecture

- **Build:** Vite + TypeScript (strict). `npm run build` runs
  `build:sitemap → tsc -b → vite build → prerender-head → check:prerender → check:jsonld` →
  `dist/`, which is both the static-host payload and the Capacitor `webDir`. `prerender-head.mjs`
  stamps per-route `<head>` meta (titles, descriptions, canonical, OG, JSON-LD) into the shipped
  HTML for SEO/AI search; `check:prerender` asserts coverage and `check:jsonld` validates the
  emitted structured data. A fuller static-HTML prerender (`npm run prerender`) runs before deploy.
- **Routing:** `src/router.tsx` is the single route table (routes are lazy-loaded per page). Pages
  live one-per-folder under `src/pages/`. The shared chrome (`src/app/Layout|Header|Footer`, plus
  `MobileDock`, `AccountMenu`, and the `src/app/nav.ts` nav registry) replaces the legacy
  `build-chrome.js` stamper — chrome is now a component, never copied.
- **i18n / RTL:** `src/i18n/index.ts` boots i18next from `en.json` / `ar.json` and mirrors the
  choice onto `<html lang/dir>` so RTL flips document-wide. `LangToggle` switches languages.
- **Styling:** `src/styles/tokens.css` is the design-token source of truth (the Falcon palette);
  components use CSS Modules with **logical properties** so RTL mirrors automatically. See
  `FIGMA_DESIGN_SYSTEM.md` for the design system. Motion is tokenized too: `framer-motion` mirrors
  the CSS motion tokens in `src/components/bento/motion.ts`, and
  `tests/bento-motion-parity.test.ts` **fails the build if the two drift**; respect
  `usePrefersReducedMotion`.
- **Data:** the regulatory JSON corpus + indexes ship under `public/data/` (21 files today) and are
  fetched at runtime via `src/lib/content.ts` (`fetchJson`; corpus shapes in
  `src/lib/content.types.ts`, corpus-link routing in `src/lib/contentLinks.ts`) + the `useFetchJson`
  hook — the heavy corpus never enters the JS bundle. (The ~19 MB `library-search.json` and ebooks
  remain lazy/streamed, as in the legacy app.) In production the corpus is offloaded to a bucket and
  served network-first.
- **Calculators:** pure, DOM-free logic in `src/calc/*` (no DOM/i18n) so it is unit-testable.
  Aviation tool math stays **flat** at the `src/calc/` root (`isa`, `tas`, `crosswind`, `holding`,
  `runway*`, `airac`, `metar`, `taf`, `notam`, … — one module per catalog tool, plus the shared date
  math `recency` and the shared numeric guards `guards` (`fin` · `ok` · `norm360` — use these, never
  a local copy)); the non-tool helpers live in subfolders by domain — `calc/chat/` (Captain Adel
  answer/thread/voice: `chat*`, `conversations`, `transcript`, `markdown`, `speech`,
  `textToSpeech`, `voiceSelection`), `calc/pilot/` (`currency`, `logbook`, `achievements`,
  `onboarding`, `ics`, plus the shared `flightFields` readers for the free-text `Flight` columns),
  `calc/library/` (`anchor`, `corpusNav`, `changeTracking`, `offlineManifest`, `libraryFilter`,
  `constellation`), `calc/study/` (`srs` — the cross-platform contract the `FlyGACA-ios` Swift port
  mirrors — `shuffle`, and `glidePath`), `calc/hud/` (the airspace-sim engine: `scenario`,
  `kinematics`, `projection`, `sectors`, `geoKsa`, `callsigns`, `simMetar`, seeded `rng`, `types`),
  and `calc/app/` (`authError`, `dashboardLayout`, `emailShape`, `passwordPolicy`, `pricingView`,
  `toolPresets`). Subfolders may import the flat core (`@/calc/recency`), never each other sideways.
  The `CalcShell` component provides the shared frame (copy-link · try-an-example ·
  ask-Captain-Adel · disclaimer). Input state lives in the URL: a page that consumes **any numeric
  input** uses `useNumericInputs` (reads floats from `nums.<key>`, everything else from
  `inputs.<key>`); string-only pages (decoders, directories) use raw `useUrlState`. Because
  `CalcShell` renders a copy-link button unconditionally, a page that keeps inputs in `useState`
  silently hands out blank links — that is what the hook prevents, not a style preference. Shared
  field/output layout comes from `FieldGrid`/`OutputGrid` + `ResultStat` (`src/components/calc/` —
  which also holds the `NumberField`/`SelectField`/`TextField`/`PasswordField` field primitives and
  the `GaugeDial` instrument readout), and whole-number output goes through `fmtInt`
  (`src/components/calc/format.ts`). This replaces the legacy `FGCalc` helper (`calc-tools.js`).
  **Crosswind is the reference implementation** every other tool follows (its bespoke
  diagram-beside-inputs layout is the one sanctioned exception to `FieldGrid`).
- **Services:** `src/lib/` holds the typed frontend services, grouped by concern:
  `src/lib/services/` (Firebase/account: `firebase`, `auth`, `account`, `sync`, `org`, `staff`,
  `school`, `founding`, `entitlements`, `packEntitlements`, `features`, `billing`, `promo`,
  `pricing`, `referral`, `waitlist`, `studyProgressSync`), `src/lib/prefs/` (localStorage preference
  stores — all built on the `createPrefStore` factory, which owns the listener/snapshot plumbing and
  the best-effort storage helpers; never hand-roll another `useSyncExternalStore` store here),
  `src/lib/seo/` (`seo`, `jsonld`), `src/lib/native/` (`nativeBridge`, `pwa`, `offlineCache`),
  with cross-cutting modules (`api`, `content`, `analytics`, `theme`, `adel`, `aerodromes`,
  `readerMarks`, `share`, …) at the `src/lib/` root. `tools.ts` and `prepCatalog.ts` stay pinned at
  the `src/lib/` root — pipeline scripts under `scripts/` parse them by that literal path. The
  shared React hooks live in `src/hooks/` (`useNumericInputs`, `useUrlState`, `useFetchJson`,
  `useFetchText`, `usePageMeta` — which also exports `useNoindexMeta` — `useCopyToClipboard`,
  `useOfflineSync`, `useViewMode`, `useForm`, `usePrefersReducedMotion`, …).
  `entitlements.isActive` is a pure predicate mirroring `functions/src/billing-core.ts`, and
  `features.ts` (`FEATURE_PLAN` / `useFeature`) is the single source of truth for which plan unlocks
  which premium feature — but the `entitlement` record is **server-only**; the app reads it only to
  gate UI, never to grant, and true enforcement stays in the gateway. Exam-prep packs are gated by
  `packEntitlements.ts` (a promo-immune gate: a pack unlocks on permanent one-time ownership in
  `packEntitlements/{uid}` OR an active paid plan); their structure lives in `prepCatalog.ts`
  (names/blurbs localized under `study.packCatalog.<id>`, same structure-in-TS pattern as
  `tools.ts`).
- **Local-first by default:** when no Firebase is configured (the default local/dev build) the
  Firebase accessors resolve to `null` and every Firebase-gated service (`org`, `waitlist`,
  `studyProgressSync`, sync, auth) degrades to a best-effort no-op — the app stays fully usable
  offline. Study progress lives client-side (`src/lib/studyProgress.ts` is the source of truth);
  `studyProgressSync.ts` is an upload-only backup that feeds the B2B cohort readiness report.
- **PWA / native:** `vite-plugin-pwa` generates the service worker (app shell precached,
  `/data/*` network-first). `src/lib/native/nativeBridge.ts` is inert on web and routes
  auth/IAP/offline-cache through Capacitor plugins inside the native shell (`capacitor.config.ts`;
  iOS + Android).
- **Flavors:** `src/flavors/` (`current.ts` defines `IS_FLAVOR_APP`, `registry.ts` lists them) plus
  `src/app/flavor/` swap in a reduced, single-pack route tree consumed by `src/router.tsx`;
  `scripts/build-flavor.mjs` slices content per flavor. The **native iOS apps built from these
  flavors now live in the `ay2m/FlyGACA-ios` repo** — see "The native iOS apps" below.

## Backend (`functions/`)

- **Pattern:** every business rule lives in a pure, Firebase-free `*-core.ts` module (e.g.
  `billing-core`, `chat-quota-core`, `rate-limit-core`, `staff-core`, `school-core`, `student-core`,
  `org-core`, `referral-core`, `feedback-core`, `api-key-core`, `api-tier-core`, `founding-core`,
  `promo-core`, `auth-core`, `gateway-core`) so policy is unit-testable in isolation; the
  Express/Firestore wrappers (`gateway.ts`, `billing.ts`, `staff.ts`, `school.ts`, `founding.ts`,
  `org.ts`) stay thin. Client-side mirrors (`src/calc/chat/chatQuota.ts`,
  `src/lib/services/entitlements.ts`, `src/lib/services/features.ts`) must match their server core —
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
- **Tests:** `functions/tests/` (32 specs) run under Vitest and need no emulator. The Firestore
  rules suite is separate and lives at the repo root (see below).

## Hosting & deploy

The single Vite build (`dist/`) is served from several fronts, all pointing at the **same** Firebase
Cloud Functions gateway for `/api/*`:

- **Firebase Hosting** is the **canonical origin**: it fronts the Cloud Functions (`chat`,
  `moyasarWebhook`) and — since the DNS cutover completed 2026-07-31 — serves the `flygaca.com`
  apex and `www` directly. `npm run deploy` builds → `prerender` → coverage check →
  `firebase deploy --only hosting`. `deploy:rules` / `deploy:functions` / `deploy:all` are the
  other slices — **`npm run deploy` alone does not deploy `functions/`**.
- **Apple Pay (Moyasar)** requires `public/.well-known/apple-developer-merchantid-domain-association`
  to be served verbatim. `firebase.json`'s `hosting.ignore` was deliberately changed from `**/.*` to
  `.git/**` so dotfolders like `.well-known` ship — **do not restore the `**/.*` glob**, it silently
  breaks Apple Pay domain verification.
- **Cloudflare Worker** (`worker/index.ts` + `wrangler.toml`) and the **Netlify** / **Vercel**
  mirrors each serve `dist/` and **proxy `/api/*` back to the Firebase origin** as a same-origin
  rewrite — so chat/content keep working and the strict CSP never changes. Keep any new API surface
  under `/api/*` for this to hold. The mirrors `X-Robots-Tag: noindex` any host that isn't
  `flygaca.com`.
- Redirects consolidate the marketing domains onto `flygaca.com` (e.g. `captadel.com` →
  `flygaca.com` in `vercel.json` — that rule only fires for traffic still hitting Vercel).
- The **CSP lives in `firebase.json`'s hosting headers** and is hand-maintained. It allows
  gstatic/apis.google.com/accounts.google.com (Firebase Auth) and cdn/api.moyasar.com (card entry +
  3-D Secure). Any new third-party asset needs an explicit edit there.
- `apphosting.yaml` / `apphosting.emulator.yaml` configure a Firebase **App Hosting** backend
  (`flygaca`); it is scaffolding at defaults, not the production path.

## Conventions (enforced)

- **Bilingual + RTL is first-class.** New copy → a key in **both** `src/i18n/en.json` and
  `ar.json`. `npm run test` fails on any key present in one language but not the other
  (`tests/i18n-parity.test.ts`).
- **The disclaimer never drifts.** Use `<Disclaimer />`; do not inline or reword the
  not-affiliated / verify-against-GACA text.
- **Tokens only / logical properties only.** No hard-coded colours; no physical `left`/`right`.
- **Never commit build output.** `public/sitemap.xml` / `public/robots.txt` are regenerated by
  `build:sitemap` and git-ignored. Keep branches synced with `main`.
- **Run `npm run verify` before committing.** It chains the frontend gate —
  `typecheck → lint → format:check → test → build → check:bundle → check:perf`. `check:bundle` fails
  if the initial gzipped JS exceeds its budget (**189 kB** today, `scripts/check-bundle.mjs`; route
  chunks excluded by design). `check:perf` is the companion gate over **every** emitted chunk — a
  per-chunk gz ceiling plus a total-footprint ceiling — catching a lazy route chunk that balloons,
  which `check:bundle` ignores. Re-base a budget only with a comment explaining why, as the existing
  history in `check-bundle.mjs` does.
- **Root tests** are Vitest under `tests/` (213 specs, incl. `tests/hud/` and `tests/rules/`;
  shared helpers in `tests/helpers/`). `npm run test:rules` runs the Firestore-rules suite
  (`tests/rules/firestore-rules.test.ts` against `firestore.rules`) via
  `firebase emulators:exec`, so it needs the emulator — it is **not** part of `npm run verify`.

## What is no longer in this repo

Commit `a6c98e3` (2026-08-16) pruned the repo hard. These are gone from `HEAD` and survive only in
git history — do not cite them, and do not "restore" a doc by re-adding one:

| Removed | Consequence for you |
| --- | --- |
| **`.github/`** (all 5 workflows, dependabot, issue/PR templates) | **There is no CI in this repo.** `npm run verify` (+ the `functions/` gate) is the only check that runs. Nothing validates a push. |
| **`docs/`** (38 files: `DESIGN-genkit-rag-backend.md`, `BILLING.md`, `LICENSED-API.md`, `RUNBOOK-deploy.md`, `DATA-HOSTING.md`, `ARCHITECTURE-BLUEPRINT.md`, `b2b/`, `seo/`, …) | Design/runbook detail now lives only in code comments and in the `FlyGACA/Office` repo. `functions/src/region.ts` is the deploy-region procedure of record. |
| **`e2e/`** (`smoke`, `flows`, `a11y` specs) | `playwright.config.ts` still sets `testDir: './e2e'` and `npm run test:e2e` still exists — **both point at a directory that no longer exists** and will fail. Recreate the specs or drop the script; don't assume e2e coverage. |
| **`content/regulations/*.md`** | `npm run lint:md` and `npm run parse:regulations` have no input here. The compiled output `public/data/regulations-lookup.json` is committed, so the app still works; regenerate it upstream, not from this repo. |
| **`archive/`** (1,285 files), **`.agents/`**, **`.claude/`** | No vendored skills or agent configs in-repo. `skills-lock.json` remains and now pins **Firebase agent-skills** (`firebase/agent-skills`), not the old `flygaca-seo` skill. |
| **`dataconnect/`** | `firebase.json` still declares `dataconnect.source` and a dataconnect emulator port; the schema directory is absent. |
| **`apple/`** (retired earlier, `b892f69`) | See below. |

Also note `README.md` still renders `public/brand/flygaca-mark.png`, `docs/screenshots/…`, and a CI
badge — all now-dead paths. Fix the README only if asked; don't take it as evidence those files
exist.

## The native iOS apps live in another repo

`apple/` was retired from this monorepo. The Swift package (`FlyGACAKit`), the Xcode config, and the
ELPT + AIP app targets now live in **`ay2m/FlyGACA-ios`**, which hand-owns all Swift code.

What stays here is the **content side only**, because this repo remains the source of truth for
content:

- `scripts/build-ios-content.mjs` (`npm run build:apps-content`) and
  `scripts/native/gen-app-icons.mjs` (`npm run ios:icons`) generate each app's `Content/` +
  `Assets.xcassets`. The iOS repo's `scripts/sync-content.sh` shells in here and runs them with
  `--out apple/Apps` so they write **straight into that repo**.
- `src/lib/prepCatalog.ts` and `public/data/` are the inputs those generators read.
- `scripts/flavor-ios.mjs`, `scripts/native/ios-localize.mjs`, `ios-generate.sh`,
  `xcodebuild-wrapper.sh`, `ensure-firebase-plists.sh` and the whole `ios:build:*` / `ios:test` /
  `cap:*` block in `package.json` are **left-over pointers into the deleted `apple/` tree** — they
  cannot work here. The `ios:build:*` set also still lists `ppl`/`cpl`/`ir`/`atpl`, modules that
  were paused. Ignore them; do the build work in `FlyGACA-ios`.
- Two `.mobileprovision` files (`FlyGACA_AIP_AppStore`, `FlyGACA_ELPT_AppStore`) sit at the repo
  root, likewise vestigial here.

## Adding a new tool

The legacy→React migration is **complete** (all catalog tools are live). To add a tool: register
it in `src/lib/tools.ts` — the typed catalog registry and single source of truth (`status:
'soon'` until it ships, then flip to `'live'`) — lift its math into `src/calc/<tool>.ts` (pure,
add a Vitest spec), build a page under `src/pages/tools/<category>/` (the folder matching the
registry's `category`; `ToolsIndex` alone stays at the `tools/` root) using `CalcShell` +
`useNumericInputs` (or `useUrlState` for string-only tools), add its strings to both i18n bundles,
and register the route in `router.tsx`. Names/blurbs/category labels resolve from i18n by id, so the
registry holds only structure (route, category, status, keywords).

## Content & data pipelines (`scripts/`)

Node ESM scripts under `scripts/` (many wired to npm scripts) maintain the corpus and generated
assets — `sync:gaca` + `data:normalize` (pull/normalise the regulatory corpus; `sync:gaca:apply` is
the apply-and-normalise variant, reading `sync-input/`), `parse:regulations` (compile the cross-ref
lookup — input now absent, see above), `build:airports` / `build:chunks` / `embeddings:upsert`
(Supabase pgvector, `supabase/migrations/`), `build:sitemap`, `gen:og`, `gen:aip-sheet` (build the
AIP study sheet into `public/study-sheets/`), `gen:captain` (Captain Adel imagery), `audit:ai` (the
AI-search visibility audit behind `SEO-PLAN.md`), `indexnow` (ping IndexNow), `optimize:img`,
`validate-jsonld`, and `new:guide` (scaffold a guide — see `GUIDE_AUTHORING.md`). Shared script
helpers live in `scripts/lib/` (`flavor-slice`, `markdown-splitter`, `regulations-parse`,
`sync-merge`); `scripts/native/` holds the iOS helpers described above.

## Where to look

> 📖 **Family context:** [The Book of Fly GACA](https://github.com/ay2m/FlyGACA-ios/blob/main/THE-BOOK-OF-FLY-GACA.md)
> is the whole-family reference — all the repos, the shared tenets, and the glossary in one place.
> It is maintained in the iOS repo.

In-repo docs that still exist: `README.md` (getting started), `MIGRATION.md` (rebuild log),
`ROADMAP.md` (what's next), `GUIDE_AUTHORING.md` (learn content), `FIGMA_DESIGN_SYSTEM.md` (design
system), `SEO-PLAN.md` (search/AI-search visibility), `SCREENSHOTS.md` + `screenshots/`,
`CONTRIBUTING.md`, `SECURITY.md`, `LICENSE`.

Sibling repos: `ay2m/Captain-Adel` (the AI flight-instructor service and the shared brain),
`ay2m/FlyGACA-ios` (the native SwiftUI app family), `ay2m/Office` (business/governance/legal/finance
documents — where the strategy and pricing material that used to live in `docs/` now belongs).

The legacy source (the original vanilla Fly GACA site) remains the reference for anything still
ported from the old site.
