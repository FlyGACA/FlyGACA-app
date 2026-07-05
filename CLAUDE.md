# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this is

The **Fly GACA frontend app** — a modern TypeScript/React/Vite rebuild of the legacy no-build
vanilla PWA (the original Fly GACA site, whose source is not in this GitHub org — the
regulatory corpus was ported from it). Fly GACA is an independent, educational
platform and open regulatory library for Saudi civil aviation. It is **not affiliated with GACA**;
treat that as load-bearing whenever you touch user-facing copy — the product helps you find/study
regulation, it never replaces it, and the assistant cites the exact Part/section.

The repo also contains the **backend**: `functions/` holds the Firebase Cloud Functions — the
Express gateway serving `/api/chat` + `/api/feedback` (auth, App Check, rate limiting, SSE), the
Captain Adel RAG flow (Genkit + Gemini, see `docs/DESIGN-genkit-rag-backend.md`), and Stripe
billing (`stripeWebhook` is the only writer of `users/{uid}.entitlement`). It is its own npm
package with its own CI gate — run `npm run lint && npm test && npm run build` inside `functions/`
when you touch it (root `npm run verify` does not cover it). Deploy region is `me-central1`
(`functions/src/region.ts`; firebase.json's rewrite regions must match).

## Architecture

- **Build:** Vite + TypeScript (strict). `npm run build` runs `tsc -b && vite build` → `dist/`,
  which is both the static-host payload and the Capacitor `webDir`.
- **Routing:** `src/router.tsx` is the single route table. Pages live one-per-folder under
  `src/pages/`. The shared chrome (`src/app/Layout|Header|Footer`) replaces the legacy
  `build-chrome.js` stamper — chrome is now a component, never copied.
- **i18n / RTL:** `src/i18n/index.ts` boots i18next from `en.json` / `ar.json` and mirrors the
  choice onto `<html lang/dir>` so RTL flips document-wide. `LangToggle` switches languages.
- **Styling:** `src/styles/tokens.css` is the design-token source of truth (the Falcon palette);
  components use CSS Modules with **logical properties** so RTL mirrors automatically.
- **Data:** the regulatory JSON corpus + indexes ship under `public/data/` and are fetched at
  runtime via `src/lib/content.ts` (`fetchJson`) + the `useFetchJson` hook — the heavy corpus never
  enters the JS bundle. (The ~19 MB `library-search.json` and ebooks remain lazy/streamed, as in the
  legacy app.)
- **Calculators:** pure math in `src/calc/*` (no DOM/i18n) so it is unit-testable; the
  `CalcShell` component provides the shared frame (copy-link · try-an-example · ask-Captain-Adel ·
  disclaimer). Input state lives in the URL: a page that consumes **any numeric input** uses
  `useNumericInputs` (reads floats from `nums.<key>`, everything else from `inputs.<key>`);
  string-only pages (decoders, directories) use raw `useUrlState`. Shared field/output layout
  comes from `FieldGrid`/`OutputGrid` + `ResultStat` (`src/components/calc/`). This replaces the
  legacy `FGCalc` helper (`calc-tools.js`). **Crosswind is the reference implementation** every
  other tool follows (its bespoke diagram-beside-inputs layout is the one sanctioned exception to
  `FieldGrid`).
- **Services:** `src/lib/{api,auth,entitlements,native-bridge}.ts` are the typed frontend
  services. `entitlements.isActive` is a pure predicate mirroring `functions/src/billing-core.ts`
  — the `entitlement` record is **server-only**; the app reads it only to gate UI, never to grant.
- **PWA / native:** `vite-plugin-pwa` generates the service worker (app shell precached,
  `/data/*` network-first). `native-bridge.ts` is inert on web and routes auth/IAP/offline-cache
  through Capacitor plugins inside the native shell.

## Conventions (enforced)

- **Bilingual + RTL is first-class.** New copy → a key in **both** `src/i18n/en.json` and
  `ar.json`. `npm run test` fails on any key present in one language but not the other
  (`tests/i18n-parity.test.ts`, the modern `check:i18n`).
- **The disclaimer never drifts.** Use `<Disclaimer />`; do not inline or reword the
  not-affiliated / verify-against-GACA text.
- **Tokens only / logical properties only.** No hard-coded colours; no physical `left`/`right`.
- Run `npm run verify` before committing. It chains the exact CI gates —
  `typecheck → lint → format:check → test → build → check:bundle` — so a green local run
  means a green CI. (Don't run only a subset: `format:check` and `check:bundle` are enforced in
  CI too.)

## Adding a new tool

The legacy→React migration is **complete** (all catalog tools are live). To add a tool: register
it in `src/lib/tools.ts` — the typed catalog registry and single source of truth (`status:
'soon'` until it ships, then flip to `'live'`) — lift its math into `src/calc/<tool>.ts` (pure,
add a Vitest spec), build a page under `src/pages/tools/` using `CalcShell` + `useNumericInputs`
(or `useUrlState` for string-only tools), add its strings to both i18n bundles, and register the
route in `router.tsx`. `MIGRATION.md` is the historical log of the rebuild; `ROADMAP.md` tracks
what's next. The legacy source (the original vanilla Fly GACA site) remains the reference for
anything still ported from the old site.
