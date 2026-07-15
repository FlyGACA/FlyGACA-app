<!-- ════════════════════════════════════════════════════════════════════ -->
<!--  HERO / BRANDING                                                       -->
<!-- ════════════════════════════════════════════════════════════════════ -->

<div align="center">

<img src="public/brand/flygaca-mark.png" alt="Fly GACA logo" width="160" />

# ✈️ Fly GACA

### The independent flight deck for Saudi civil aviation

**_find it · study it · always verify against GACA_**

<p align="center">
  <a href="https://github.com/FlyGACA/FlyGACA-app/actions/workflows/ci.yml">
    <img src="https://img.shields.io/github/actions/workflow/status/FlyGACA/FlyGACA-app/ci.yml?style=for-the-badge&label=CI&labelColor=0a0e12&color=2d6e8a" alt="Build Status" />
  </a>
  <a href="https://github.com/FlyGACA/FlyGACA-app/releases">
    <img src="https://img.shields.io/badge/version-0.1.0-2d6e8a?style=for-the-badge&labelColor=0a0e12" alt="Version" />
  </a>
  <a href="LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-8fc9a8?style=for-the-badge&labelColor=0a0e12" alt="License" />
  </a>
  <a href="https://flygaca.com">
    <img src="https://img.shields.io/badge/PWA-installable-8fc9a8?style=for-the-badge&logo=pwa&logoColor=white&labelColor=0a0e12" alt="PWA Ready" />
  </a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite&logoColor=white&labelColor=0a0e12" alt="Vite" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=white&labelColor=0a0e12" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat-square&logo=typescript&logoColor=white&labelColor=0a0e12" alt="TypeScript" />
  <img src="https://img.shields.io/badge/i18n-EN%20%E2%87%84%20AR-8fc9a8?style=flat-square&logo=i18next&logoColor=white&labelColor=0a0e12" alt="i18next" />
  <img src="https://img.shields.io/badge/Capacitor-iOS%20%2F%20Android-119EFF?style=flat-square&logo=capacitor&logoColor=white&labelColor=0a0e12" alt="Capacitor" />
  <img src="https://img.shields.io/badge/Firebase-me--central1-FFCA28?style=flat-square&logo=firebase&logoColor=white&labelColor=0a0e12" alt="Firebase" />
</p>

<p align="center">
  <a href="https://flygaca.com"><b>🌐 Live app</b></a>
  &nbsp;·&nbsp;
  <a href="#-get-started-in-60-seconds"><b>⚡ Quick start</b></a>
  &nbsp;·&nbsp;
  <a href="#-architecture--tech-stack"><b>🏗️ Architecture</b></a>
  &nbsp;·&nbsp;
  <a href="#-contribute"><b>🤝 Contribute</b></a>
</p>

</div>

> [!IMPORTANT]
> **Not affiliated with GACA.** Fly GACA helps you *find and study* regulation — it never replaces it. Every answer cites the exact Part/section, and every surface reinforces one rule: **verify against the latest official GACA publication.**

---

## 📑 Table of Contents

- [About the Project](#-about-the-project)
- [Key Features](#-key-features)
- [Get Started in 60 Seconds](#-get-started-in-60-seconds)
- [Architecture & Tech Stack](#-architecture--tech-stack)
- [Deploy](#-deploy)
- [Contribute](#-contribute)
- [License](#-license)
- [Contact](#-contact)

---

## 🎯 About the Project

**Fly GACA** is a bilingual (EN ⇄ AR), RTL-native open regulatory library and educational platform for the Saudi general-aviation community. It turns the dense world of **GACAR** (General Authority of Civil Aviation Regulations) into something accessible, searchable, and genuinely reliable.

This repository is the modern rebuild — a strict-TypeScript **React 19 + Vite 8** frontend plus its **Firebase Cloud Functions** backend. Together they ship a blazing-fast, offline-capable Progressive Web App (and native iOS/Android shells via Capacitor) that puts the full regulatory corpus, **55+ aviation calculators**, and **Captain Adel** — a citation-first Retrieval-Augmented AI instructor — in the palm of your hand.

> [!NOTE]
> The backend gateway (`functions/`) is an Express + Genkit service running in **`me-central1`**. It proxies `/api/chat` to Captain Adel's RAG flow (Gemini) and handles Stripe billing. The heavy regulatory corpus streams at runtime as static JSON under `public/data/`, so the JS bundle stays feather-light.

---

## 🚀 Key Features

Everything below is built to accelerate study, sharpen flight planning, and democratize access to aviation regulation.

| Feature | What you get |
| :--- | :--- |
| 📚 **Open GACAR Library** | The full regulatory corpus, streamed at runtime — never bundled, always fast. |
| 🤖 **Captain Adel AI** | Ask anything; get **citation-first** answers grounded entirely in official regulation. |
| 🧮 **55+ Flight Tools** | Crosswind, density altitude, weight & balance, and more — shareable, URL-stateful, unit-tested math. |
| 🌦️ **Weather & Ops** | Decode METARs/TAFs, parse NOTAMs, and track the current AIRAC cycle at a glance. |
| 🗺️ **Charts & Airspace** | Interactive Leaflet maps loaded with Saudi aerodrome and approach-chart data. |
| 🎓 **Ground School** | Spaced-repetition flashcards, mock exams, and structured learning paths. |
| 🌍 **Bilingual & RTL** | Instant EN ⇄ AR switching; CSS logical properties mirror the whole UI automatically. |
| 📲 **PWA & Native** | Install offline via Workbox, or ship first-class iOS/Android shells with Capacitor. |

---

## ⚡ Get Started in 60 Seconds

Get a local dev environment running in under a minute.

### Prerequisites

- **Node.js** `20` (matches CI)
- **npm** `>= 10`

### Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/FlyGACA/FlyGACA-app.git
cd FlyGACA-app

# 2. Install dependencies
npm install

# 3. (Optional) Configure your local environment
cp .env.example .env.local

# 4. Launch the dev server
npm run dev
```

Open **`http://localhost:5173`** and you're flying. 🛫

> [!TIP]
> Without `VITE_FIREBASE_*` variables set, the app runs **local-first** — the corpus, tools, and ground school all work offline; only backend features like Captain Adel AI stay dark until you wire up Firebase.

---

## 🏗️ Architecture & Tech Stack

Engineered for performance, offline reliability, and strict type safety.

<table>
<tr><td>

**Frontend**
- ⚛️ React 19 · Vite 8 · TypeScript (strict)
- 🧭 `react-router` — single route table
- 🎨 CSS Modules + design tokens (logical properties)
- 🌐 i18next — bilingual EN/AR with RTL mirroring
- 📦 `vite-plugin-pwa` (Workbox) service worker

</td><td>

**Backend & Native**
- 🔥 Firebase Cloud Functions (Express) · `me-central1`
- 🧠 Genkit + Gemini RAG (Captain Adel)
- 💳 Stripe billing & entitlements
- 📱 Capacitor iOS / Android shells
- 🗄️ Static JSON corpus streamed from `public/data/`

</td></tr>
</table>

### Core Commands

> [!TIP]
> `npm run verify` chains **every** CI gate — `typecheck → lint → format:check → test → build → check:bundle`. A green local `verify` means a green CI.

```bash
npm run verify      # ⭐ Run the full CI gate before every commit
npm run typecheck   # Strict TypeScript (tsc -b --noEmit)
npm run lint        # ESLint
npm run test        # Vitest — calc correctness & i18n parity
npm run test:e2e    # Playwright — smoke & accessibility
npm run build       # Production assets → dist/
npm run preview     # Serve the production build locally
```

### Native Mobile Shells

```bash
npm run cap:sync    # Sync the web payload into the iOS/Android shells
npm run cap:open    # Open the iOS project in Xcode
```

---

## 🌍 Deploy

Firebase Hosting is **canonical**; Vercel, Cloudflare, and Netlify run as mirror fronts that proxy `/api/*`.

<div align="center">

[![Firebase](https://img.shields.io/badge/Firebase-canonical-c8a04a?style=for-the-badge&logo=firebase&logoColor=white&labelColor=0a0e12)](firebase.json)
[![Vercel](https://img.shields.io/badge/Vercel-mirror-2d6e8a?style=for-the-badge&logo=vercel&logoColor=white&labelColor=0a0e12)](vercel.json)
[![Cloudflare](https://img.shields.io/badge/Cloudflare-mirror-2d6e8a?style=for-the-badge&logo=cloudflarepages&logoColor=white&labelColor=0a0e12)](wrangler.toml)
[![Netlify](https://img.shields.io/badge/Netlify-mirror-2d6e8a?style=for-the-badge&logo=netlify&logoColor=white&labelColor=0a0e12)](netlify.toml)

</div>

```bash
# Firebase (canonical)
npm run deploy        # Build, prerender, and deploy to Hosting
npm run deploy:all    # Deploy Hosting, Functions, and Firestore rules

# Mirror fronts
# Vercel       vercel deploy --prod
# Cloudflare   npx wrangler deploy            # Worker + dist/ assets (wrangler.toml)
# Netlify      netlify deploy --build --prod
```

> [!NOTE]
> For CI logic, multi-platform deploy commands, and cutover steps, see the runbooks in `docs/` — `RUNBOOK-deploy.md`, `RUNBOOK-firebase.md`, `RUNBOOK-native.md`, and `RUNBOOK-cutover.md`.

---

## 🤝 Contribute

Join the mission to modernize Saudi general aviation. PRs welcome! 🛫

1. **Fork** the project and create a feature branch — `git checkout -b feature/amazing-feature`.
2. **Build** your change. Adhere to the two enforced conventions: **bilingual keys in both** `en.json` **and** `ar.json`, and **CSS logical properties only** (no hard-coded colours, no physical `left`/`right`).
3. **Verify** with `npm run verify` — this is the same gate CI runs.
4. **Commit** with a semantic message — `feat: add amazing feature`.
5. **Push** and open a Pull Request.

> [!TIP]
> Adding a tool or a guide? Register tools in `src/lib/tools.ts` (the single source of truth) and lift the math into `src/calc/`. Authoring educational content? Run `npm run new:guide` and read [`GUIDE_AUTHORING.md`](GUIDE_AUTHORING.md). New contributors should skim [`CLAUDE.md`](CLAUDE.md) for the enforced conventions and [`ROADMAP.md`](ROADMAP.md) for what's next.

---

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for details.

---

## 📬 Contact

| | |
| :--- | :--- |
| **Author** | Fly GACA |
| **GitHub** | [@FlyGACA](https://github.com/FlyGACA) |
| **Email** | [i@flygaca.com](mailto:i@flygaca.com) |
| **Website** | [flygaca.com](https://flygaca.com) |
| **Project** | [github.com/FlyGACA/FlyGACA-app](https://github.com/FlyGACA/FlyGACA-app) |

---

<div align="center">

<sub>Built for the Saudi GA community · <b>find it · study it · always verify against GACA</b></sub>

<br /><br />

<b>صُنع في السعودية 🇸🇦 · Made in Saudi Arabia</b>

</div>
