# Fly GACA iOS — getting started (Mac + Xcode 15+)

One shared Swift package (`FlyGACAKit`), one App Store app per study module.
Read `ARCHITECTURE.md` for the why; this is the how.

## 1. Build and test the package (no Xcode project needed)

```bash
cd apple/FlyGACAKit
swift build
swift test
```

The package has zero external dependencies, so this is fast and needs no
simulator. The test suite includes the web-parity vectors for spaced repetition
and exam scoring — keep it green.

## 2. Refresh the per-app content

From the repo root (content comes verbatim from `public/data/` + the pack
catalog in `src/lib/prepCatalog.ts`):

```bash
node scripts/build-ios-content.mjs          # PPL, ELPT and AIP
node scripts/build-ios-content.mjs --app ppl
```

## 3. Create the Xcode project and the first app target

1. Xcode → **File → New → Project… → iOS App**. Product name `PPL`,
   organization identifier `com.flygaca`, interface SwiftUI. Save it as
   `apple/FlyGACA.xcodeproj` (don't create a git repo; don't add tests).
2. Delete the template's generated `PPLApp.swift`/`ContentView.swift`, then add
   these to the target:
   - `Apps/Shared/FlyGACAApp.swift` (the shared shell — add by reference),
   - `Apps/PPL/Content` as a **folder reference** (blue folder, not a group),
     so it ships as a `Content/` directory in the bundle.
3. **Add the package:** File → Add Package Dependencies → **Add Local…** →
   select `apple/FlyGACAKit`; link the `FeatureUI` product to the target.
4. **Apply the xcconfig:** project → Info → Configurations → set the PPL
   target's Debug/Release to `Apps/PPL/PPL.xcconfig`. This pins the module
   (`FG_MODULE_ID = ppl-exam`), bundle id, display name and the shared
   `Apps/Shared/Info.plist` (which forwards `FGModuleID` into the app).
5. **Capabilities** (Signing & Capabilities): add **App Groups** with
   `group.com.flygaca.study` — the family-shared progress store. (Keychain
   Sharing and Sign in with Apple join in Phase 4 with Firebase.)
6. Run. You should land on the PPL module home: 13 topic banks, ground school,
   flashcards, mock and timed exam — all offline.

## 4. Add the next app (ELPT, AIP, …)

Duplicate the target, then change exactly three things: its xcconfig
(`Apps/ELPT/ELPT.xcconfig`), its `Content` folder reference (`Apps/ELPT/Content`),
and its app icon. `FlyGACAApp.swift` is shared — never edit it per app.

## What is deliberately NOT here yet

- `FlyGACA.xcodeproj` — generated on your Mac (step 3), not committed until it
  exists; after that, commit it like any source file.
- `GoogleService-Info.plist`, Firebase/RevenueCat SDKs, the `PlatformLive`
  target — Phase 4 (see ARCHITECTURE.md §5). Until then the apps run fully
  offline by design, and `AppServices` mocks stand in for the platform.
