# Fly GACA App Family — Roadmap

The plan for Fly GACA's **ASA-Prepware-style family of exam-prep apps**: one focused study
product per Saudi GACA certificate or rating, each shipped on **web** (a pack page on
flygaca.com) and **native iOS** (an App Store app), all built from **one monorepo and one
shared corpus**. This document is the single source of truth for the app lineup; the native
architecture lives in [`../apple/ARCHITECTURE.md`](../apple/ARCHITECTURE.md), the pack model in
[`../src/lib/prepCatalog.ts`](../src/lib/prepCatalog.ts), and billing in [`BILLING.md`](./BILLING.md).

## Principles (do not drift)

- **One pack = one app.** A "product" is a `Pack` entry in `prepCatalog.ts` — a manifest of
  quiz banks, ground-school modules, reading paths and study sheets. The web pack page
  (`/study/packs/:id`) and the native app (`apple/Apps/<App>/`) are two shells over that same
  manifest. Adding an app is a **data + config** change, not new feature code.
- **Sources: GACA, SANS, Fly GACA — only.** Content is grounded in GACA (GACAR regulations,
  GACA Advisory Circulars, the GACARs eBook), SANS (the Saudi AIP, `aimss.sans.com.sa`), and
  Fly-GACA-authored practice material. Bundled reference documents (`librarySlugs`) and study
  sheets must be GACA/SANS/Fly-GACA — enforced mechanically by
  [`tests/pack-sources.test.ts`](../tests/pack-sources.test.ts). Universal-knowledge practice
  questions (weather, navigation, aerodynamics, human factors) may cite Fly-GACA-reproduced
  FAA/ICAO handbooks as *study pointers*, as the shipping PPL app already does.
- **Paid one-time.** Each app is a one-time purchase (App Store paid-up-front; web = the
  SAR-{`PREP_PACK_PRICE`} one-time pack, also included with any active Pro/School plan). Buying
  the app *is* the entitlement on iOS; the App Store **bundle** ("Saudi Pilot Study Pack") sells
  the family together.
- **Not affiliated with GACA.** Every app carries the standard `<Disclaimer />` — an independent
  educational aid that never replaces the official GACAR/AIP. Practice questions are Fly-GACA
  authored and are **not** real GACA exam questions.

## The lineup

Each app maps to a GACA certificate/rating and the GACAR Part(s) that govern it. `pack id` is the
`prepCatalog.ts` id; the native app directory is `apple/Apps/<Dir>/`.

| App | Certificate / rating | Primary GACAR / source | pack id | Web | iOS | Status |
|---|---|---|---|---|---|---|
| **PPL** | Private Pilot Licence | Parts 61, 91, 71, 67 + Saudi AIP | `ppl-exam` | ✅ | ✅ scaffold | **Wave 1 — live** |
| **ELPT** | English Language Proficiency (SAELPT) | ICAO LPR / Annex 1 (Fly GACA authored) | `elp` | ✅ | ✅ scaffold | **Wave 1 — live** |
| **AIP** | Aeronautical Information (Saudi AIP) | SANS eAIP (GEN/ENR) | `aip` | ✅ | ✅ scaffold | **Wave 1 — live** |
| **CPL** | Commercial Pilot Licence | Part 61 (Subpart F), 91, 119, 135 | `cpl` | ✅ | ✅ scaffold | **Wave 2 — draft content** |
| **IR** | Instrument Rating | Part 61 (§61.89), 91 (IFR), 97 + AIP ENR | `ir` | ✅ | ✅ scaffold | **Wave 2 — draft content** |
| **ATPL** | Airline Transport Pilot Licence | Part 61 (Subpart G), 121 | `atpl` | ✅ | ✅ scaffold | **Wave 2 — draft content** |
| Conversion | Foreign-licence conversion | Parts 61, 91 + guidance | `conversion` | ✅ | — | live (web) |
| Medical | Class 1/2/3 medical | Part 67 | `medical` | ✅ | — | live (web, subject) |
| Airspace & VFR | Free sampler | Parts 71, 91 | `airspace-vfr` | ✅ | — | live (free) |

### Wave 3+ candidates (content-gated)

Net-new packs. Each enters `prepCatalog.ts` first (with authored GACAR/AIP-cited banks), then a
native app inherits it. Ordered by audience size / content readiness:

| Future app | Certificate | GACAR Part | Notes |
|---|---|---|---|
| **Flight Instructor (FI)** | Flight Instructor | Part 61, Subpart H | Instructing privileges, endorsements, FOI knowledge. |
| **Ground Instructor (AGI/IGI)** | Ground Instructor | Part 61, Subpart I | Pairs naturally with FI. |
| **Aircraft Dispatcher** | Dispatcher & Cabin Crew | Part 65 | Operational control, flight planning, Part 121/135 ties. |
| **AMT / Mechanic** | Mechanics & Repairmen | Part 66 + Part 43 | Maintenance, airworthiness, return-to-service. |
| **UAS / Drone** | Small UAS (non-recreational) | Parts 101, 107 | Fast-growing audience; distinct rule set. |
| **ATC** | Air Traffic Services Personnel | Part 64 | ATS licensing & ratings. |
| **Sport / Recreational** | Sport Pilot | Part 61, Subpart J | Lower-volume; low content cost. |
| **Flight Engineer** | Flight Engineer | Part 61, Subpart L | Niche; legacy category. |

### Checkride / Oral-prep series (future feature, not just content)

ASA ships a parallel **Checkride** line (oral-exam prep). Fly GACA has no oral-exam simulator
today — this is a **new feature**, not just a new pack: a structured oral-question walkthrough per
certificate (areas of operation → prompts → model answers, all GACAR/AIP-cited). When built, it
reuses the same corpus and would ship as a mode inside each certificate app (or a sibling
"<Cert> Oral" pack). Tracked here so the content model (question banks already carry `cite`/
`citeRef`) stays compatible.

## Content prerequisites

The gating constraint for every app is **authored, cited question banks**, not code. House style
(see [`STUDY-CONTENT-REVIEW.md`](./STUDY-CONTENT-REVIEW.md)): ~18–24 questions/bank, 4 options,
`explain`, and a `cite` (+ `citeRef` to the GACAR Part) — validated by
[`tests/quiz-citations.test.ts`](../tests/quiz-citations.test.ts).

- **Wave 2 (this change):** CPL/IR/ATPL each ship with new GACAR-cited **draft** banks plus reused
  subject banks. Drafts are marked in each bank's `source` field and must clear the
  `STUDY-CONTENT-REVIEW.md` checklist before production sale.
- **Depth over time:** ASA banks run to hundreds of questions. Fly GACA banks start at the
  house-standard depth and grow — new questions append to the same banks, so every surface (web +
  native) and every app sharing a bank benefits at once.

## How to add an app

1. **Content:** author the bank(s) into `public/data/quiz.json` (GACAR/AIP-cited), and give the
   pack real assets. Run `npm test` — `quiz-citations` + `pack-sources` gate correctness/provenance.
2. **Catalog:** fill the pack's `bankIds`/`moduleIds`/`pathIds`/`sheetSlugs` in
   `src/lib/prepCatalog.ts` and set `status: 'live'`.
3. **Sell it:** add the pack id to `SELLABLE_PACK_IDS` in `functions/src/billing-core.ts` (+ tests)
   and deploy functions. The web pack page, mock exam and Stripe checkout then work automatically.
4. **Native:** add the app to `APPS` in `scripts/build-ios-content.mjs`, add a 6-line
   `apple/Apps/<Dir>/<Dir>.xcconfig` (module id, bundle id, display name), and run
   `npm run build:apps-content` to emit `apple/Apps/<Dir>/Content/`.
5. **Mac step (out of band):** create the Xcode target and App Store Connect listing per
   [`../apple/README.md`](../apple/README.md).

## Platforms

- **Web — day one.** Every pack is already a live surface at `/study/packs/:id` with combined
  quiz, flashcards, timed mock exam and mastery tracking; the marketing/SEO for each certificate
  rides the existing pack routes and sitemap.
- **iOS — native SwiftUI.** The `apple/FlyGACAKit` shared package + one thin app target per pack
  (paid-up-front, App Store bundle). Wave 1 targets are scaffolded; Wave 2 `Content/` slices are
  generated. Target creation + submission are Mac-side.
- **Android — Wave 2.5 / 3.** Once the iOS family validates, each app ships on Android by wrapping
  its web pack with **Capacitor** (or a Trusted Web Activity) — the same corpus, the same pack
  manifest, minimal new code. Google Play billing (paid app or one-time IAP) mirrors the iOS model.
  No Android project exists in the repo yet; this is deliberately deferred.

## Open items

- [ ] Human review of the CPL/IR/ATPL draft banks against the official GACAR (see
      `STUDY-CONTENT-REVIEW.md`) before production sale.
- [x] CPL/IR/ATPL are already in `SELLABLE_PACK_IDS` (`functions/src/billing-core.ts`); still
      needs a functions deploy to take effect in production.
- [ ] Grow CPL/IR/ATPL banks toward ASA-scale depth; author Wave 3 packs (FI, dispatcher, UAS…).
- [ ] Mac: create Xcode targets + App Store Connect listings + the "Saudi Pilot Study Pack" bundle.
- [ ] Android wrapping strategy spike (Capacitor vs TWA) once iOS Wave 1 is on the store.
