# Fly GACA iOS App Family — Architecture

The native SwiftUI products: **one shared codebase, one App Store app per module**
(PPL, ELPT, AIP, CPL, IR, ATPL today; FOI, AGI and more as their content lands), sold
together via an App Store **app bundle**. Every app carries the identical core feature
set — Study mode, Quizzing, Flashcards (spaced repetition), Mock/Practice tests,
and timed scored Exam Prep with analytics — and none of it is per-app code.

This document is the blueprint; `README.md` (next to it) is the 10-minute Mac
setup. Everything here is grounded in the web app this repo already ships: the
apps **reuse** its corpus, module catalog and progress semantics — they never
fork them.

---

## 1. Architecture & tech stack

**Stack:** Swift 5.9+, SwiftUI, SwiftData, iOS 17+. MVVM with a light Clean
layering, delivered as **one local Swift package with multiple library targets**
(`FlyGACAKit`) — strict dependency direction without multi-package overhead.

**Storage decision:** SwiftData for user state; content stays read-only JSON
decoded into structs. The full 13-bank corpus is ~158 KB — a database for
content would be pure overhead. Realm is ruled out (MongoDB deprecated the
Realm SDKs); CoreData is the fallback only if the deployment floor ever has to
drop below iOS 17.

### Target graph

```
                 ┌──────────────┐
                 │  CoreModels  │  value types + wire decoding (no deps)
                 └──────┬───────┘
        ┌───────────────┼────────────────┐
 ┌──────┴─────┐  ┌──────┴─────┐  ┌───────┴──────┐
 │StudyEngines│  │ ContentKit │  │ AppServices  │  protocols + mocks
 └──────┬─────┘  └──────┬─────┘  └───────┬──────┘
 ┌──────┴────────┐      │                │
 │PersistenceKit │      │                │
 └──────┬────────┘      │                │
        └───────────────┼────────────────┘
                 ┌──────┴───────┐
                 │  FeatureUI   │  every screen, incl. SingleModuleRootView
                 └──────┬───────┘
              ┌─────────┴──────────┐
              │  app targets (N)   │  ~20-line shells + PlatformLive (Phase 4)
              └────────────────────┘
```

| Target | Responsibility | External deps |
|---|---|---|
| **CoreModels** | `Question`, `Bank`, `QuizFile`, `ModuleManifest`, `ExamConfig`, `SrsEntry`, ground-school/paths types; CodingKeys map the terse web JSON; stable-id hashing | none |
| **StudyEngines** | `StudySession` state machine (practice/mock/exam by config), `Leitner` SRS (srs.ts port), `Streaks`, `QuestionSampler`, `ReadinessAnalytics` | none |
| **ContentKit** | `ContentLoader` (bundled JSON), `ContentStore` (cache-then-bundle; Phase-4 refresher plugs in here) | none |
| **PersistenceKit** | SwiftData `@Model`s + `StudyStore` actor — the single write path for attempts/SRS/streaks | none |
| **AppServices** | Protocol seams (`AuthProviding`, `EntitlementsProviding`, `ProgressSyncing`, `ChatClient`) + offline mocks | none |
| **FeatureUI** | Generic `QuizView`, `FlashcardView`, `ExamTimerView`, `ResultStat`, `Disclaimer`, module home, `SingleModuleRootView`; Falcon tokens from `src/styles/tokens.css` | none |
| **PlatformLive** *(Phase 4)* | Firebase Auth/Firestore/App Check, RevenueCat, `/api/chat` SSE client implementing the AppServices protocols | firebase-ios-sdk, purchases-ios |

Rules that keep this healthy:

- **Engines never do IO.** `StudySession` takes `now: Date` as a parameter (the
  UI passes clock ticks, tests pass fixed dates) and hands its `SessionResult`
  to PersistenceKit. `swift test` needs no simulator and no SDK downloads.
- **Firebase/RevenueCat never leak upstream.** Only PlatformLive (and the app
  target) may import them. That keeps the pure targets' build instant and makes
  every screen previewable with the AppServices mocks.
- **UI talks to protocols.** The app's composition root injects PlatformLive
  implementations; until it exists, the mocks are the (fully offline) product.

### Why adding a module needs no boilerplate

A module is **data, not code** — the same insight as the web's
`src/lib/prepCatalog.ts` pack catalog, which is exactly what a `ModuleManifest`
is: the pack serialized to `module.json`, web field names untouched
(`bankIds`, `moduleIds`, `pathIds`, `sheetSlugs`, `exam`). Shipping the IFR app is:

1. Give the `ir` pack real content on the web side (banks in `quiz.json`,
   pack entry live in `prepCatalog.ts`) — the web product gets it for free too.
2. Add `ir` to `APPS` in `scripts/build-ios-content.mjs`, run it → the app's
   `Content/` folder appears.
3. Duplicate a 6-line xcconfig (module id, bundle id, display name) and a
   ~20-line app target in Xcode pointing at the shared `FlyGACAApp.swift`.

Zero new feature code, zero new views, zero new engine work.

---

## 2. Data & schema

### Content (read-only, shipped per app)

The bundler (`scripts/build-ios-content.mjs`) filters the shared corpus down to
each module's slice and copies records **verbatim** — the wire schema is the
web schema, so corpus and apps can never drift:

```
apple/Apps/PPL/Content/
  module.json        ← the pack manifest + contentVersion stamp
  quiz.json          ← only this module's banks (terse web schema)
  groundschool.json  ← only this module's lessons (when the pack has them)
  paths-index.json   ← only this module's reading paths (when present)
```

`CoreModels` decodes the terse records into rich types and fixes the corpus's
one structural weakness at decode time — **the web has no stable question ids**
(progress is keyed by array index). Every `Question` gets:

- `id` — `sha256("bankID|prompt")` first 16 hex chars: survives reordering,
  reconciles SRS state across content refreshes;
- `index` / `legacyKey` — the web's index key, retained for progress parity.

Decoding also validates every answer index, so a bad corpus fails at load, not
mid-exam.

### User state (SwiftData, App Group container)

Flat models, nested payloads as JSON `Data` blobs (keeps lightweight migration
viable); all in `group.com.flygaca.study` so streaks/SRS/attempts are shared by
every app in the family on the device:

| Model | Keys | Holds |
|---|---|---|
| `ExamAttemptRecord` | moduleID, date | percent, passed, duration, per-bank blob — pruned to the **10 most recent per module** (web parity) |
| `CardSRSRecord` | unique `"bankID\|cardKey"` + `questionID` hash | Leitner `box`, `dueDay` (UTC string) |
| `ModuleProgressRecord` | unique moduleID | quiz-best-per-bank, lessons done, flagged questions (blobs) |
| `StreakRecord` | singleton | day + count |

`StudyStore` (a `@ModelActor`) is the **single write path**; views read value
snapshots (`PastExam`, `SrsEntry`, `Streak`) — SwiftData model objects never
escape the actor, which sidesteps their non-Sendability.

### Cross-platform parity contracts (do not break)

These semantics are shared with the web app; users move between the two:

- **SRS** = literal port of `src/calc/study/srs.ts`: boxes 0–5, intervals
  `[0, 1, 3, 7, 14, 30]` days, correct promotes (capped), wrong resets to 0,
  unseen always due, mastered = box ≥ 3.
- **Due dates are UTC day-strings** (`yyyy-mm-dd`, string compare). The web
  uses `toISOString()`; a `Calendar.current` port would drift a day near
  midnight. `Tests/StudyEnginesTests/LeitnerTests.swift` holds the parity
  vectors — if one fails, the platforms have diverged.
- **Exam scoring** = web mock exam: `percent = round(correct/total × 100)`,
  `passed = percent ≥ passMark`, default 25 q / 30 min / 75 %, per-pack
  overrides, auto-submit at 0:00, unanswered counts wrong.
- **Streak** = web `nextStreak`: same day unchanged, consecutive +1, gap resets.
- **Progress upload** (Phase 4) targets the same Firestore doc as the web
  (`users/{uid}/progress/summary`, upload-only, compact summary) so both
  clients feed the same B2B readiness reports.

### Remote content refresh (Phase 4)

`ContentStore` already resolves cache-then-bundle. The refresher fetches
`https://flygaca.com/data/quiz.json` with `If-None-Match`, double-checks the
`generated` stamp, writes the cache atomically, then reconciles `CardSRSRecord`
rows by `questionID` hash (rewriting `cardKey` when indices shifted).

---

## 3. Xcode project layout

```
apple/
  ARCHITECTURE.md / README.md
  FlyGACAKit/                    ← the shared package (open directly, or add as local pkg)
    Package.swift
    Sources/{CoreModels,StudyEngines,ContentKit,PersistenceKit,AppServices,FeatureUI}/
    Tests/{CoreModelsTests,StudyEnginesTests,ContentKitTests}/
  Apps/
    Shared/
      FlyGACAApp.swift           ← THE app shell, shared by every target
      Info.plist                 ← injects FGModuleID = $(FG_MODULE_ID)
      App-Shared.xcconfig        ← iOS 17 floor, app group, shared keys
    PPL/  { PPL.xcconfig,  Content/ }   ← com.flygaca.ppl,  module ppl-exam
    ELPT/ { ELPT.xcconfig, Content/ }   ← com.flygaca.elpt, module elp
    AIP/  { AIP.xcconfig,  Content/ }   ← com.flygaca.aip,  module aip
    CPL/  { CPL.xcconfig,  Content/ }   ← com.flygaca.cpl,  module cpl
    IR/   { IR.xcconfig,   Content/ }   ← com.flygaca.ir,   module ir
    ATPL/ { ATPL.xcconfig, Content/ }   ← com.flygaca.atpl, module atpl
```

The `xcconfig` + `Content/` folder for CPL/IR/ATPL already exist in this repo; only the
Xcode **target** wiring (the click-path in README.md) remains a Mac-side step.

The Xcode **project** (`apple/FlyGACA.xcodeproj`, one app target per store
product) is created on a Mac — see README.md for the click-path. Reusable UI is
enforced by construction: `QuizView`/`FlashcardView`/`ExamTimerView` live in
FeatureUI and are driven entirely by `SessionConfig` + content, so there is no
place for per-module view code to accumulate.

---

## 4. App Store strategy

- **Paid-up-front apps** (price point mirroring the web's SAR 39 pack), because
  **Apple app bundles only support paid apps or free apps with auto-renewable
  subscriptions** — one-time-IAP unlocks cannot be bundled. Paid-up-front is
  the simplest path to the family bundle, and buying the app *is* the
  entitlement (`FullAccess` in AppServices is the shipping default, not a stub).
- **Wave 1:** PPL, ELPT, AIP (content exists today) → then the first app bundle
  ("Saudi Pilot Study Pack") with completing-the-bundle credit for users who
  already bought one. Apple allows up to 10 apps per bundle.
- **Wave 2:** CPL (`cpl`), IR (`ir`), ATPL (`atpl`) — their packs are now live in
  `prepCatalog.ts` with GACAR-cited draft banks, so the apps inherit them; the
  `Content/` slices are emitted by `scripts/build-ios-content.mjs`. See
  `docs/APPS-FAMILY-ROADMAP.md` for the full lineup.
- **Wave 3+:** FOI (`foi`), AGI (`agi`), Dispatcher, AME and the rest — net-new
  packs that enter `prepCatalog.ts` first, then the apps inherit them.
- **Family continuity:** App Group (shared SwiftData store) + shared Keychain
  group (Firebase auth in Phase 4) make the apps feel like one product on
  device.
- If a free tier per app is ever wanted, the fallback is free apps + one
  auto-renewable subscription (bundles still possible) — entitlement then
  checks the server-owned `users/{uid}.entitlement` / `packEntitlements/{uid}`
  exactly like the web: **read-only; the app never grants.**

---

## 5. Roadmap

| Phase | Scope | Exit criteria |
|---|---|---|
| **1 — Core framework & shared UI** | package scaffold, CoreModels, ContentKit, FeatureUI shells | `swift build` / `swift test` green on a Mac; 13 banks decode with valid answer indices; one app target shows its module home in the simulator |
| **2 — Engines** | session/exam clock wiring, durable SRS + streaks via StudyStore, results → history | SRS parity vectors pass; attempts persist across launches; full offline loop in one app (study → quiz → cards → mock → exam → analytics) |
| **3 — Content & family** | bundler in CI, ELPT + AIP targets, cross-app continuity | PPL mock exam scores identically to the web for the same answer set; a new app ships with zero Swift changes; streak carries across two apps on one device |
| **4 — Platform & store** | PlatformLive (Firebase Auth + App Check, progress upload, Captain Adel SSE), remote refresh + SRS reconcile, readiness dashboard, App Store Connect (3 paid apps + bundle) | bundle purchasable in sandbox; TestFlight builds for all Wave-1 apps |

Known risks the design already absorbs: SwiftData model non-Sendability
(store actor owns all models), migration fragility (flat models + blobs +
versioned schema), Firebase SPM build weight (isolated in PlatformLive),
SRS timezone drift (UTC day-strings + parity tests), corpus index instability
(dual keys + hash reconcile).

---

## 6. First actionable step

Already done in this commit — `FlyGACAKit/Package.swift` plus real code for the
models, engines and loaders, with the test suite as the safety net. On a Mac:

```bash
cd apple/FlyGACAKit
swift build && swift test    # no SDK downloads — pure targets only
```

Then follow README.md to create the PPL app target and run it in the simulator.
