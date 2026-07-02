<!-- ════════════════════════════════════════════════════════════════════ -->
<!--  HERO / BRANDING                                                       -->
<!-- ════════════════════════════════════════════════════════════════════ -->

<div align="center">

<img src="public/brand/flygaca-mark.png" alt="Fly GACA logo" width="120" />
<br />
<img src="public/img/og-card.png" alt="Fly GACA — independent educational platform for Saudi civil aviation" width="100%" />

# ✈️ Fly GACA

**The independent flight deck for Saudi civil aviation — *find it · study it · always verify against GACA***

<p align="center">
  <a href="https://github.com/gacafly/FlyGACA-app/actions">
    <img src="https://img.shields.io/github/actions/workflow/status/gacafly/FlyGACA-app/ci.yml?style=for-the-badge&label=CI&labelColor=0a0e12&color=2d6e8a" alt="Build Status" />
  </a>
  <a href="https://github.com/gacafly/FlyGACA-app/releases">
    <img src="https://img.shields.io/badge/version-0.1.0-2d6e8a?style=for-the-badge&labelColor=0a0e12" alt="Version" />
  </a>
  <a href="LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-8fc9a8?style=for-the-badge&labelColor=0a0e12" alt="License" />
  </a>
  <a href="https://flygaca.com">
    <img src="https://img.shields.io/badge/PWA-ready-8fc9a8?style=for-the-badge&logo=pwa&logoColor=white&labelColor=0a0e12" alt="PWA Ready" />
  </a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Vite-6-646CFF?style=flat-square&logo=vite&logoColor=white&labelColor=0a0e12" alt="Vite" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=white&labelColor=0a0e12" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat-square&logo=typescript&logoColor=white&labelColor=0a0e12" alt="TypeScript" />
  <img src="https://img.shields.io/badge/i18n-EN%20%E2%87%84%20AR-8fc9a8?style=flat-square&logo=i18next&logoColor=white&labelColor=0a0e12" alt="i18next" />
  <img src="https://img.shields.io/badge/Capacitor-iOS%20%2F%20Android-119EFF?style=flat-square&logo=capacitor&logoColor=white&labelColor=0a0e12" alt="Capacitor" />
  <img src="https://img.shields.io/badge/Firebase-Hosting-FFCA28?style=flat-square&logo=firebase&logoColor=white&labelColor=0a0e12" alt="Firebase" />
</p>

</div>

> [!IMPORTANT]
> **Not affiliated with GACA.** Fly GACA helps you *find and study* regulation — it never replaces it. Every answer cites the exact Part/section, and every surface reinforces one rule: **verify against the latest official GACA publication.**

---

## 📑 Table of Contents

- [About the Project](#about-the-project)
- [Key Features](#key-features)
- [Get Started in 60 Seconds](#get-started-in-60-seconds)
- [Architecture & Tech Stack](#architecture--tech-stack)
- [Deploy](#deploy)
- [Contribute](#contribute)
- [License](#license)
- [Contact](#contact)

---

## About the Project

**Fly GACA** is a bilingual (EN ⇄ AR), RTL-native open regulatory library and educational platform for the Saudi general-aviation community. We transform the dense world of **GACAR** (General Authority of Civil Aviation Regulations) into an accessible, searchable, and highly reliable resource. 

This repository houses the modern frontend rebuild. We leverage Vite 6, React 18, and Capacitor to deliver a blazing-fast, offline-capable Progressive Web App (PWA) and native shell. Access the full regulatory corpus, utilize over 50 aviation calculators, and learn with **Captain Adel**, our Retrieval-Augmented AI flight instructor.

> [!NOTE]
> The backend gateway (`functions/`, Genkit) proxies `/api/chat` to Captain Adel and handles Stripe billing. The heavy regulatory corpus streams at runtime as static JSON under `public/data/` to keep the JS bundle incredibly light.

---

## Key Features

Explore a powerful suite designed to accelerate study, enhance flight planning, and democratize access to aviation regulations.

| Feature | Benefit |
| :--- | :--- |
| 📚 **Open GACAR Library** | Stream the full regulatory corpus seamlessly at runtime. Your JS bundle remains extremely lightweight. |
| 🤖 **Captain Adel AI** | Ask aviation questions and receive citation-first answers grounded entirely in official regulation. |
| 🧮 **50+ Flight Tools** | Calculate crosswind, density altitude, weight & balance, and more using shareable, unit-tested math modules. |
| 🌦️ **Weather & Ops** | Decode METARs/TAFs, parse NOTAMs, and view the current AIRAC cycle with instant clarity. |
| 🗺️ **Charts & Airspace** | Navigate interactive Leaflet maps equipped with Saudi aerodrome and approach-chart data. |
| 🎓 **Ground School** | Master concepts using spaced-repetition flashcards, mock exams, and structured learning paths. |
| 🌍 **Bilingual & RTL** | Toggle instantly between English and Arabic. CSS logical properties ensure perfect UI mirroring. |
| 📲 **PWA & Native Ready** | Install offline via Workbox, or deploy first-class iOS/Android native shells using Capacitor. |

---

## Get Started in 60 Seconds

Accelerate your workflow. Get a local development environment running in under a minute.

### Prerequisites
- **Node.js** `>= 20` (LTS recommended)
- **npm** `>= 10`

### Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/gacafly/FlyGACA-app.git
cd FlyGACA-app

# 2. Install dependencies
npm install

# 3. (Optional) Configure your local environment
cp .env.example .env.local

# 4. Launch the development server
npm run dev
```
Navigate to **`http://localhost:5173`** to view the app. *(Note: Without VITE_FIREBASE_* variables, the app runs local-first — backend features like Captain Adel AI will be unavailable).*

---

## Architecture & Tech Stack

Engineered for performance, offline reliability, and strict type safety. 

### Core Commands

> [!TIP]  
> Execute all quality gates before committing. CI workflows will enforce these checks strictly.

```bash
npm run typecheck    # Validate strict TypeScript (tsc -b --noEmit)
npm run lint         # Enforce ESLint standards
npm run test         # Run Vitest (calc correctness & i18n parity)
npm run test:e2e     # Run Playwright (smoke & accessibility testing)
npm run build        # Compile production assets to dist/
npm run preview      # Serve the production build locally
```

### Native Mobile Shells

Deploy the web payload seamlessly to native devices.

```bash
npm run cap:sync     # Synchronize the web payload to iOS/Android shells
npm run cap:open     # Launch the iOS project directly in Xcode
```

---

## Deploy

Scale across any edge network. Firebase Hosting is canonical, while Vercel, Cloudflare, and Netlify act as mirror fronts proxying `/api/*`.

<div align="center">

[![Firebase](https://img.shields.io/badge/Firebase-canonical-c8a04a?style=for-the-badge&logo=firebase&logoColor=white&labelColor=0a0e12)](firebase.json)
[![Vercel](https://img.shields.io/badge/Vercel-mirror-2d6e8a?style=for-the-badge&logo=vercel&logoColor=white&labelColor=0a0e12)](vercel.json)
[![Cloudflare](https://img.shields.io/badge/Cloudflare-mirror-2d6e8a?style=for-the-badge&logo=cloudflarepages&logoColor=white&labelColor=0a0e12)](wrangler.toml)
[![Netlify](https://img.shields.io/badge/Netlify-mirror-2d6e8a?style=for-the-badge&logo=netlify&logoColor=white&labelColor=0a0e12)](netlify.toml)

</div>

### Push to Production

```bash
# Firebase (Canonical)
npm run deploy        # Build, prerender, and deploy to Hosting
npm run deploy:all    # Deploy Hosting, Functions, and Firestore rules

# Mirror Fronts
# Vercel       vercel deploy --prod
# Cloudflare   npx wrangler deploy            # Worker + dist/ assets (wrangler.toml)
# Netlify      netlify deploy --build --prod
```

> [!NOTE]  
> For advanced CI logic, multi-platform deployment commands, and production cutover steps, reference the Runbooks in `docs/` (`RUNBOOK-deploy.md`, `RUNBOOK-firebase.md`, `RUNBOOK-cutover.md`).

---

## Contribute

Join the mission to modernize Saudi general aviation. We welcome all PRs! 🛫

1. **Fork** the project and create a feature branch (`git checkout -b feature/amazing-feature`).
2. **Build** your changes. Adhere to our strict bilingual standard (`en.json` & `ar.json`) and use CSS logical properties exclusively.
3. **Verify** stability by running `npm run typecheck && npm run lint && npm run test`.
4. **Commit** with semantic messages (`feat: add amazing feature`).
5. **Push** and open a Pull Request.

> [!TIP]  
> Creating educational content? Run `npm run new:guide` to scaffold guide templates. Read [`GUIDE_AUTHORING.md`](GUIDE_AUTHORING.md) for details.

---

## License

Distributed under the **MIT License**. Reference [`LICENSE`](LICENSE) for more information.

---

## Contact

| | |
| :--- | :--- |
| **Author** | FlyGACA |
| **GitHub** | [@gacafly](https://github.com/gacafly) |
| **Email** | [i@flygaca.com](mailto:i@flygaca.com) |
| **Website** | [flygaca.com](https://flygaca.com) |
| **Project Link** | [github.com/gacafly/FlyGACA-app](https://github.com/gacafly/FlyGACA-app) |

---

<div align="center">

<sub>Built for the Saudi GA community · <b>find it · study it · always verify against GACA</b></sub>

<br /><br />

<b>صُنع في السعودية 🇸🇦 · Made in Saudi Arabia</b>

</div>
