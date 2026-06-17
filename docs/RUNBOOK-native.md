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

## Things the native shell still needs (later stages)

- **Auth / IAP:** native Apple/Google sign-in and RevenueCat IAP are part of Stage 3 (real
  Firebase + billing). `billingChannel()` already returns `revenuecat` on iOS; the plugins
  (`@capacitor-firebase/authentication`, `@revenuecat/purchases-capacitor`) are added in the shell.
- **Deep links:** universal links (`https://flygaca.com/…`) and the `com.flygaca.app://` scheme
  both resolve through `toAppPath()` → the SPA router. Configure the Associated Domains entitlement
  (iOS) / intent filters (Android) when wiring real domains.
- **App icons / splash:** drop source art and run `@capacitor/assets` to generate the sets.
