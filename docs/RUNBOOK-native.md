# RUNBOOK — native (Capacitor) shell

Fly GACA ships the same Vite build as a native app via Capacitor. **iOS is the primary target**;
Android is a supported scaffold. The web payload in `dist/` is the WebView content — there is no
separate native codebase, only the platform projects Capacitor generates plus the thin
`src/lib/native-bridge.ts` adapter.

## What lives where

- `capacitor.config.ts` — appId `com.flygaca.app`, `webDir: dist`, dark background, manual splash
  hide, keyboard resize. **Edit this, not the generated platform files.**
- `src/lib/native-bridge.ts` — the runtime adapter. `isNative()`/`platform()`/`billingChannel()`
  are safe on the web; `initNative()` (called from `main.tsx`) configures the status bar, hides the
  splash, marks `<html class="is-native platform-…">`, and wires the Android back button + deep
  links. `nativeStore`, `share()`, `openExternal()` fall back to web APIs in a browser. Plugins are
  `import()`-ed lazily so the web bundle ships only `@capacitor/core`.
- `src/styles/native.css` — safe-area insets (notch / home indicator), applied only under
  `html.is-native`; the web is unaffected (`--safe-*` stay `0px`).

## Generating the platform projects (macOS, first time)

The `ios/` and `android/` folders are **generated on the build machine**, not committed here.
Capacitor's `add` step needs Xcode + CocoaPods (iOS) / Android Studio + JDK (Android):

```bash
npm ci
npm run build                 # produce dist/ first — cap copies it
npx cap add ios               # creates ios/ (run on macOS)
npx cap add android           # creates android/

npm run cap:sync              # build + copy web assets + update native deps
npm run cap:open              # open ios/App in Xcode
```

After the first `add`, the day-to-day loop is just **`npm run cap:sync`** then build/run from
Xcode / Android Studio.

## iOS best practices — apply to every generated project

Because `ios/` is regenerated rather than committed, these settings must be re-applied after
every `npx cap add ios`. The per-flavor pipeline scripts them (see "Per-flavor app pipeline"
below); this section is the reference for what they do and why.

- **`WKAppBoundDomains` (required).** `capacitor.config.ts` sets
  `limitsNavigationsToAppBoundDomains: true`, which only takes effect — and, if left unpaired,
  can break in-app navigation — when Info.plist carries a matching `WKAppBoundDomains` array.
  Entries: `localhost` (the Capacitor server origin) and `flygaca.com` (universal-link
  continuity). Keep the list ≤ 10 (WebKit's hard cap).
- **Privacy manifest (required for submission).** Apple requires a `PrivacyInfo.xcprivacy`
  declaring data collection and required-reason API usage. The checked-in template lives at
  `native/ios/PrivacyInfo.xcprivacy`: no tracking, no collected data, UserDefaults reason
  `CA92.1` (from `@capacitor/preferences`). If the Capacitor template already ships a manifest,
  merge declarations rather than duplicating the file. Revisit the declarations before adding
  any data-collecting SDK (Firebase, RevenueCat, analytics).
- **App Transport Security.** Leave ATS at its secure defaults — every endpoint the app talks
  to is HTTPS. Do **not** add `NSAllowsArbitraryLoads` or per-domain exceptions; App Review
  asks for justification and nothing here needs one.
- **Signing.** Use automatic signing with the team account; no manual provisioning profiles.
  Set `ITSAppUsesNonExemptEncryption` to `NO` in Info.plist (the app uses only standard HTTPS)
  so every TestFlight upload skips the export-compliance questionnaire.
- **Deployment target.** Keep the Capacitor default for the installed major (verify with
  `npx cap doctor` after `cap add ios`); do not lower it — plugins are only tested against the
  default floor.
- **Versioning.** `MARKETING_VERSION` tracks `package.json` `version`; bump
  `CURRENT_PROJECT_VERSION` on every TestFlight upload (the pipeline stamps both).

## App icons & splash

Source art lives outside the generated project so it survives regeneration:

- Put a 1024×1024 `icon.png` (no alpha for the App Store icon) plus `splash.png` /
  `splash-dark.png` (2732×2732, artwork centred) under `native/assets/<flavor>/`.
- Generate the sets with `npx @capacitor/assets generate --ios --assetPath native/assets/<flavor>`
  after `cap add ios`. Never hand-edit `Assets.xcassets`.

## TestFlight / App Store checklist

1. `npm run cap:sync` (or the per-flavor pipeline) → open Xcode → select *Any iOS Device* →
   Product ▸ Archive → Distribute App ▸ App Store Connect.
2. App Store Connect → App Privacy: the prep-pack flavor apps truthfully declare
   **"Data Not Collected"** (no accounts, no analytics, no third-party SDKs). The main app's
   answers must instead reflect Firebase Auth/Firestore usage.
3. Screenshots: 6.9" and 6.5" iPhone sets minimum; show the app's actual study content
   (each flavor's own pack — this is also the 4.3 spam-review defense, see
   `docs/STORE-SUITE.md`).
4. Review notes: state that the app is an independent educational tool **not affiliated with
   GACA** (mirroring the in-app disclaimer) and that all content works offline with no login.
5. After approval: keep phased release on; verify the installed app cold-launches offline
   (airplane mode) before releasing to 100%.

## Things the native shell still needs (later stages)

- **Auth / IAP:** native Apple/Google sign-in and RevenueCat IAP are part of Stage 3 (real
  Firebase + billing). `billingChannel()` already returns `revenuecat` on iOS; the plugins
  (`@capacitor-firebase/authentication`, `@revenuecat/purchases-capacitor`) are added in the shell.
- **Deep links:** universal links (`https://flygaca.com/…`) and the `com.flygaca.app://` scheme
  both resolve through `toAppPath()` → the SPA router. Configure the Associated Domains entitlement
  (iOS) / intent filters (Android) when wiring real domains.
- **App icons / splash:** drop source art and run `@capacitor/assets` to generate the sets.
