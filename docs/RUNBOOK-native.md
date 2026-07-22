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

The `ios/` and `android/` folders are **generated on the build machine**, not committed here — the
one exception is the tracked iOS localization resources under `ios/App/App/{en,ar}.lproj/` (see
[Arabic app-name localization](#arabic-app-name-localization)). Capacitor's `add` step needs Xcode +
CocoaPods (iOS) / Android Studio + JDK (Android):

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

## Arabic app-name localization

The WebView content is already fully bilingual + RTL (`src/i18n`), but the **native app name** shown
under the home-screen icon comes from the iOS bundle, not the web layer. To localize it, the shell
carries per-language `InfoPlist.strings` that override `CFBundleDisplayName` / `CFBundleName`:

- `ios/App/App/en.lproj/InfoPlist.strings` → `Fly GACA`
- `ios/App/App/ar.lproj/InfoPlist.strings` → `فلاي جاكا`

Both mirror `common.appName` in the matching `src/i18n/*.json` bundle, so the native name matches the
brand everywhere. **These two files are the localization source of truth and are tracked in git**,
even though the rest of `ios/` is generated. If `npx cap add ios` reports the platform already exists
because these tracked files are present, relocate them first (`mv ios /tmp/ios-l10n`), run
`cap add ios`, then restore the two `.strings` files into `ios/App/App/{en,ar}.lproj/`.

The `.strings` files only take effect once the Xcode project knows about Arabic and links the
localized group. That wiring lives in `ios/App/App.xcodeproj/project.pbxproj` (generated on the Mac).

### Automated (recommended)

Run the setup script **once, on macOS, right after `cap add ios`**:

```bash
npm run cap:localize          # node scripts/native/ios-localize.mjs
```

It parses `project.pbxproj` with Apple's `plutil` (no fragile text munging) and idempotently:

- adds `ar` / `en` / `Base` to the project's `knownRegions`;
- links `InfoPlist.strings` as a localized variant group in the App target's resources — or, if the
  generated project uses Xcode-16 synchronized folder groups, leaves the auto-included `.lproj`
  files alone;
- ensures `Info.plist` carries `CFBundleDisplayName` / `CFBundleName` and declares
  `CFBundleLocalizations = ["en", "ar"]`.

Re-running is safe (it no-ops when already wired). Open the project in Xcode once afterwards so it
normalizes the `pbxproj` formatting before you commit `ios/`.

### Manual (Xcode GUI equivalent)

If you'd rather click through it, the script mirrors these steps:

1. **Register the region** — select the **App** project (blue icon) → **Info** tab →
   **Localizations** → **+** → choose **Arabic (ar)**, accept the default file selection. This adds
   `ar` to the project's `knownRegions`.
2. **Add the base strings file** — in the Project navigator, right-click the **App** group →
   **Add Files to "App"…** → select `ios/App/App/en.lproj/InfoPlist.strings` → **Add**. Xcode
   recognizes the `.lproj` and creates the localized (variant) group.
3. **Link Arabic** — select the added `InfoPlist.strings` → **File inspector** → under
   **Localization**, tick **Arabic**. Because `ar.lproj/InfoPlist.strings` already exists, Xcode
   links it automatically into the same variant group.

Verify by launching on a simulator set to Arabic (**Settings → General → Language & Region →
العربية**): the home-screen label should read **فلاي جاكا**. `npm run cap:sync` does not touch these
files, so the localization survives day-to-day syncs.

## Things the native shell still needs (later stages)

- **Auth / IAP:** native Apple/Google sign-in and RevenueCat IAP are part of Stage 3 (real
  Firebase + billing). `billingChannel()` already returns `revenuecat` on iOS; the plugins
  (`@capacitor-firebase/authentication`, `@revenuecat/purchases-capacitor`) are added in the shell.
- **Deep links:** universal links (`https://flygaca.com/…`) and the `com.flygaca.app://` scheme
  both resolve through `toAppPath()` → the SPA router. Configure the Associated Domains entitlement
  (iOS) / intent filters (Android) when wiring real domains.
- **App icons / splash:** drop source art and run `@capacitor/assets` to generate the sets.
