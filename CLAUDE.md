# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this is

The **Fly GACA frontend app** — a modern TypeScript/React/Vite rebuild of the legacy no-build
vanilla PWA (which lives in the `flygaca/flygaca` repo). Fly GACA is an independent, educational
platform and open regulatory library for Saudi civil aviation. It is **not affiliated with GACA**;
treat that as load-bearing whenever you touch user-facing copy — the product helps you find/study
regulation, it never replaces it, and the assistant cites the exact Part/section.

This repo is **frontend only**. The backend (Firebase Functions gateway) and the Captain Adel RAG
service are separate and unchanged; the app calls the same `/api/chat` and `/api/content` endpoints.

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
  disclaimer) and `useUrlState` keeps inputs in the URL. This pair replaces the legacy
  `FGCalc` helper (`calc-tools.js`). **Crosswind is the reference implementation** every other
  tool follows.
- **Services:** `src/lib/{api,auth,entitlements,native-bridge}.ts` are the typed frontend
  services. `entitlements.isActive` is a pure predicate mirroring `functions/entitlements-core.js`
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
- Run `npm run typecheck && npm run lint && npm run test && npm run build` before committing.

## Porting the legacy site

To migrate a tool: lift its math into `src/calc/<tool>.ts` (pure, add a Vitest spec), then build a
page under `src/pages/tools/<Tool>/` using `CalcShell` + `useUrlState`, add its strings to the i18n
bundles, flip its `live` flag in `public/data/tools.json`, and register the route in `router.tsx`.
`MIGRATION.md` tracks progress — the legacy source is in the `flygaca/flygaca` repo.
