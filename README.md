<div align="center">

<img src="public/brand/flygaca-mark.png" alt="Fly GACA" width="112" />

# Fly GACA — App

**An independent, educational platform and open regulatory library for Saudi civil aviation.**
GACAR · charts · study tools · an AI flight instructor — bilingual (EN ⇄ AR) and RTL-native.

<br />

[![CI](https://img.shields.io/github/actions/workflow/status/gacafly/flygaca-app/ci.yml?style=for-the-badge&label=CI&labelColor=0a0e12&color=2d6e8a)](../../actions/workflows/ci.yml)
![Bundle](https://img.shields.io/badge/initial_JS-134_kB_gz-2d6e8a?style=for-the-badge&labelColor=0a0e12)
![i18n](https://img.shields.io/badge/i18n-EN_⇄_AR-8fc9a8?style=for-the-badge&labelColor=0a0e12)
![PWA](https://img.shields.io/badge/PWA-ready-8fc9a8?style=for-the-badge&labelColor=0a0e12&logo=pwa&logoColor=white)

<br />

![Vite](https://img.shields.io/badge/Vite-6-2d6e8a?style=flat-square&logo=vite&logoColor=white&labelColor=0a0e12)
![React](https://img.shields.io/badge/React-18-2d6e8a?style=flat-square&logo=react&logoColor=white&labelColor=0a0e12)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-2d6e8a?style=flat-square&logo=typescript&logoColor=white&labelColor=0a0e12)
![React Router](https://img.shields.io/badge/Router-6-2d6e8a?style=flat-square&logo=reactrouter&logoColor=white&labelColor=0a0e12)
![Capacitor](https://img.shields.io/badge/Capacitor-iOS-2d6e8a?style=flat-square&logo=capacitor&logoColor=white&labelColor=0a0e12)
![Firebase](https://img.shields.io/badge/Firebase-Hosting-2d6e8a?style=flat-square&logo=firebase&logoColor=white&labelColor=0a0e12)

</div>

> [!IMPORTANT]
> **Not affiliated with GACA.** Fly GACA helps you *find and study* regulation — it never replaces it.
> Every surface reinforces one rule: **verify against the latest official GACA publication.** The
> assistant cites the exact Part/section; the `<Disclaimer />` notice is load-bearing and never reworded.

---

## ✈️ What this is

A modern TypeScript rebuild of the **Fly GACA** frontend. This repository is the **frontend app
only** — it talks to the *same* backend as the legacy site:

- `/api/chat` → the **Captain Adel** brain (grounded, citation-first answers)
- `/api/content` → gated assets

> [!NOTE]
> The Firebase Functions gateway and the Captain Adel service live in the separate `flygaca/flygaca`
> repo and are **not** part of this codebase.

## 🧰 Stack

| Concern | Choice |
| --- | --- |
| **Build** | [Vite](https://vite.dev) 6 → `dist/` (static-host payload + Capacitor `webDir`) |
| **UI** | React 18 + TypeScript (strict) |
| **Routing** | React Router 6 (single route table) |
| **i18n / RTL** | i18next + react-i18next — EN/AR with document-wide `dir` flipping |
| **Styling** | Design tokens (the *Falcon* palette) + CSS Modules, CSS **logical properties** for free RTL |
| **Data** | Static JSON corpus under `public/data/`, fetched at runtime (never bundled) |
| **PWA** | `vite-plugin-pwa` (Workbox) — app shell precached, `/data/*` network-first |
| **Native** | Capacitor (iOS primary) via a thin `native-bridge` adapter |
| **Tests** | Vitest (pure calc + i18n parity) · Playwright (e2e + a11y) |

## ⚡ Quick start

```bash
npm install
npm run dev          # Vite dev server (HMR)
npm run build        # build:sitemap → tsc -b → vite build → dist/
npm run preview      # serve the production build

# quality gates (all green before commit)
npm run typecheck    # tsc -b --noEmit
npm run lint         # eslint
npm run test         # vitest — calc correctness + bilingual key parity
npm run test:e2e     # playwright — smoke + a11y
npm run format       # prettier --write

npm run cap:sync     # build + copy the web payload into the native shells
```

> [!TIP]
> Copy `.env.example` → `.env.local` to wire the public Firebase config and turn on Auth/Firestore/
> Analytics. With no `VITE_FIREBASE_*` set, the app runs fully **local-first** — no backend required.

## 🗂 Project layout

<details open>
<summary><b>Where things live</b></summary>

```
public/data/      Static JSON corpus + content indexes (fetched at runtime)
public/img|fonts  Brand assets
src/styles/       tokens.css (the Falcon palette) + global.css base layer
src/i18n/         en.json / ar.json + the i18next setup
src/app/          Shared chrome: Layout, Header, Footer
src/components/   Reusable UI: LangToggle, Disclaimer, CalcShell
src/lib/          Typed services: api, auth, firebase, entitlements, native-bridge, content, hooks
src/calc/         Pure, unit-tested flight math (crosswind is the reference impl)
src/pages/        One folder per route
tests/            Vitest specs   ·   e2e/  Playwright specs
```

</details>

## 📐 Non-negotiable conventions

- **🌍 Bilingual + RTL is first-class.** Every user-facing string lives in `src/i18n/{en,ar}.json`.
  `npm run test` fails if a key exists in one language but not the other.
- **⚖️ The disclaimer is load-bearing.** The not-affiliated / verify-against-GACA notice is one shared
  `<Disclaimer />` — render it on every surface; never reword it inline.
- **🎨 Design tokens only.** Never hard-code a colour / space / radius outside `src/styles/tokens.css`.
- **↔️ RTL for free.** Use CSS logical properties (`margin-inline`, `inset-block-start`, …), never
  physical `left`/`right`.

## 🚀 CI & deploy

**CI** (`.github/workflows/ci.yml`) runs on every PR — two jobs:

- `typecheck · lint · format:check · test · build · check:bundle` (initial JS budget ≤ 160 kB gz)
- `e2e · a11y` (Playwright)

**Hosting** — one build, four fronts. **Firebase Hosting is canonical** (the `/api/*` Cloud Functions
are co-located); **Vercel · Cloudflare · Netlify** are mirror fronts that proxy `/api/*` back to the
Firebase gateway, so chat/content keep working with the strict CSP unchanged.

<div align="center">

[![Firebase](https://img.shields.io/badge/Firebase-canonical-c8a04a?style=for-the-badge&logo=firebase&logoColor=white&labelColor=0a0e12)](firebase.json)
[![Vercel](https://img.shields.io/badge/Vercel-mirror-2d6e8a?style=for-the-badge&logo=vercel&logoColor=white&labelColor=0a0e12)](vercel.json)
[![Cloudflare](https://img.shields.io/badge/Cloudflare-mirror-2d6e8a?style=for-the-badge&logo=cloudflarepages&logoColor=white&labelColor=0a0e12)](wrangler.toml)
[![Netlify](https://img.shields.io/badge/Netlify-mirror-2d6e8a?style=for-the-badge&logo=netlify&logoColor=white&labelColor=0a0e12)](netlify.toml)

</div>

```bash
# Firebase (canonical)
npm run build && firebase deploy --only hosting   # + npm run deploy:rules

# Vercel       vercel deploy --prod
# Cloudflare   npx wrangler pages deploy dist --project-name flygaca-app
# Netlify      netlify deploy --build --prod
```

> [!NOTE]
> Per-platform env vars, exact commands, and a post-deploy smoke checklist live in
> [`docs/RUNBOOK-deploy.md`](docs/RUNBOOK-deploy.md). Firebase + Firestore specifics are in
> [`docs/RUNBOOK-firebase.md`](docs/RUNBOOK-firebase.md); go-live in
> [`docs/RUNBOOK-cutover.md`](docs/RUNBOOK-cutover.md).

## 📚 More

See [`MIGRATION.md`](MIGRATION.md) for what has been ported from the legacy site and what remains, and
[`CLAUDE.md`](CLAUDE.md) for the architecture deep-dive.

<div align="center">
<br />
<sub>Built for the Saudi GA community · <b>find it · study it · always verify against GACA</b></sub>
</div>
