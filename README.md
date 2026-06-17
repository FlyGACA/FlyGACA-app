# Fly GACA — App

A modern TypeScript rebuild of the **Fly GACA** frontend: an independent, educational platform
and open regulatory library for Saudi civil aviation (GACAR, charts, study tools, an AI flight
instructor). **Not affiliated with GACA** — every surface reinforces one rule: verify against the
latest official GACA publication.

This repository is the **frontend app only**. It talks to the *same* backend as the legacy site
(`/api/chat` → the Captain Adel brain, `/api/content` → gated assets); the Firebase Functions
gateway and the Captain Adel service are **not** part of this repo.

## Stack

| Concern    | Choice |
|------------|--------|
| Build      | [Vite](https://vite.dev) 6 |
| UI         | React 18 + TypeScript (strict) |
| Routing    | React Router 6 (data router) |
| i18n / RTL | i18next + react-i18next — EN/AR with `dir` flipping |
| Styling    | Design tokens (CSS custom properties) + CSS Modules, CSS logical properties for RTL |
| PWA        | `vite-plugin-pwa` (Workbox) |
| Native     | Capacitor (iOS primary) via a thin `native-bridge` adapter |
| Tests      | Vitest (pure calc + i18n parity) |

## Commands

```bash
npm install
npm run dev          # Vite dev server
npm run build        # tsc -b && vite build → dist/
npm run preview      # serve the production build
npm run typecheck    # tsc -b --noEmit
npm run lint         # eslint
npm run test         # vitest (calc correctness + bilingual key parity)
npm run format       # prettier --write

npm run cap:sync     # build + copy the web payload into the native shells
```

## Project layout

```
public/data/      Static JSON corpus + content indexes (fetched at runtime)
public/img|fonts  Brand assets
src/styles/       tokens.css (the Falcon palette) + global.css base layer
src/i18n/         en.json / ar.json + the i18next setup
src/app/          Shared chrome: Layout, Header, Footer
src/components/   Reusable UI: LangToggle, Disclaimer, CalcShell
src/lib/          Typed services: api, auth, entitlements, native-bridge, content, hooks
src/calc/         Pure, unit-tested flight math (crosswind, …)
src/pages/        One folder per route
tests/            Vitest specs
```

## Non-negotiable conventions

- **Bilingual + RTL is first-class.** Every user-facing string lives in `src/i18n/{en,ar}.json`.
  `npm run test` fails if a key exists in one language but not the other (the modern equivalent of
  the legacy `check:i18n`).
- **The disclaimer is load-bearing.** The not-affiliated / verify-against-GACA notice is a single
  shared `<Disclaimer />` component — render it on every surface; never reword it inline.
- **Design tokens only.** Never hard-code a colour/space/radius outside `src/styles/tokens.css`.
- **RTL for free.** Use CSS logical properties (`margin-inline`, `inset-block-start`, …), never
  physical left/right.

## CI & deploy

- **CI** (`.github/workflows/ci.yml`) runs on every PR: `typecheck · lint · format:check ·
  test · build`. (A Playwright `e2e` job is added in Stage 9.)
- **Host: Firebase Hosting** (`firebase.json`, project `flygaca-app` in `.firebaserc`). The config
  carries the SPA rewrite, the `/api/chat` + `/api/content` rewrites to the Cloud Functions
  (`me-central2`), and the strict security headers + CSP. `firestore.rules` is ported verbatim
  (per-user isolation; the `entitlement` field is server-only).

```bash
npm run serve          # build + firebase emulator (local hosting)
npm run deploy         # build + deploy hosting
npm run deploy:rules   # deploy Firestore rules
```

Copy `.env.example` → `.env.local` for `VITE_API_BASE` and (from Stage 3) the public Firebase config.

See `MIGRATION.md` for what has been ported from the legacy site and what remains.
