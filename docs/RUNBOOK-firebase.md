# RUNBOOK — Firebase (emulator-first)

Stage 3 wires the app to Firebase **Auth + Firestore** without requiring production secrets: the
whole layer is gated on `VITE_FIREBASE_*` config. With no config the app runs fully local-first
(localStorage); with config it uses Firebase. Develop and verify against the **Local Emulator Suite**
first; injecting real keys is the only remaining production step.

## What's wired

- `src/lib/services/firebase.ts` — config-gated, lazy bootstrap of App/Auth/Firestore (+ App Check + GA4
  Analytics). The SDK is dynamic-`import()`ed, so `firebase/*` never enters the main bundle. The
  full public web config for `flygaca-app` ships as real values in `.env.example`;
  `cp .env.example .env.local` initializes Firebase against the live project. Analytics is
  browser-only and opt-in via `measurementId` (off under SSR, tests, and the emulator).
- `src/lib/services/auth.ts` — `getIdToken` (sent to `/api/chat`), `onAuthChange`, Google/email sign-in,
  register, `signOutUser`.
- `src/lib/services/account.ts` — on Firebase sign-in, adopts the uid and hydrates profile/logbook/entitlement
  from Firestore (`src/lib/services/sync.ts`), then write-throughs profile/logbook mutations. Local cache is
  the offline fallback. The `entitlement` field is **read-only** here (server-written; the client
  never serializes it — enforced by `firestore.rules` and `profileToDoc`).
- The Account page shows real sign-in (Google + email/password) when configured, the local form
  otherwise. The Dashboard shows the effective plan via the pure `isActive`/`effectivePlan`.

## Verify against the emulator (dev machine)

Prereqs: Java 21+ and `firebase-tools` (`npm i -g firebase-tools`).

```bash
# 1) Point the app at the emulators. `.env.example` already carries the real
#    public web config, so a copy is enough to turn Firebase on.
cp .env.example .env.local
#   set VITE_FIREBASE_EMULATOR=1 (keys can stay as-is; the emulator stubs them)

# 2) Start Auth + Firestore emulators (rules are applied from firestore.rules).
firebase emulators:start --only auth,firestore

# 3) Run the app against them.
npm run dev
```

Then check:

- **Auth:** register + sign in (email/password) and Google (the emulator stubs the popup). The header
  reflects the signed-in user; `getIdToken()` returns a token (DevTools → Network → `/api/chat`).
- **Firestore round-trip:** edit the profile and add a logbook flight → confirm `users/{uid}` and
  `users/{uid}/logbook/*` in the Emulator UI; reload and confirm hydration.
- **Rules invariant:** attempt to write `entitlement` from the client (emulator UI rules playground or
  a console snippet) → must be **denied**. `npm run test` covers `entitlementFromDoc`/`profileToDoc`
  never round-tripping it.

## Going to production (final flip)

1. Put the real Firebase web config in the host's `VITE_FIREBASE_*` build env (public, non-secret) —
   the same values shipped in `.env.example`.
2. Set `VITE_RECAPTCHA_ENTERPRISE_SITE_KEY` to enable App Check. The client then attaches its
   token to gateway calls — `X-Firebase-AppCheck` on `/api/chat` (`src/lib/api.ts` via
   `getAppCheckToken`), and `httpsCallable` auto-attaches it for `createCheckoutSession`. Once
   tokens are observed flowing (App Check → Requests), enforce App Check on the Functions; see
   `docs/APP-CHECK-BACKEND.md` for the backend (`FlyGACA/flygaca`) changes and rollout order.
3. Deploy `firestore.rules` (`npm run deploy:rules`). Leave `VITE_FIREBASE_EMULATOR` unset.

Stripe/RevenueCat billing is Batch 3c (`src/lib/services/billing.ts`).

## Authorizing a domain (preview deploys & new hosts)

Sign-in (Google popup **and** email/password) fails on any origin the Firebase project doesn't
recognise — most commonly a **Firebase Hosting preview channel** URL
(`…--<channel>-<hash>.web.app`). The symptom is a sign-in that fails with a Firebase error code the app
now surfaces on the Account page (`auth/unauthorized-domain`,
`auth/requests-from-referer-…-are-blocked`, `auth/operation-not-allowed`, or an App Check rejection —
see the `MAP` in `src/calc/app/authError.ts`). It is **not** a bad-credentials problem; the fix is to add
the domain to every allowlist below:

1. **Firebase Console → Authentication → Settings → Authorized domains** — add the exact host.
   Wildcards are **not** accepted, so each ephemeral preview hash would need its own entry; prefer
   testing on the production/custom domain instead. (`web.app` / `firebaseapp.com` are allow-listed
   by default, so most Hosting preview channels already work.)
2. **Google Cloud Console → Security → reCAPTCHA Enterprise → the site key** matching
   `VITE_RECAPTCHA_ENTERPRISE_SITE_KEY` → add the domain to the key's **Domains** list. The key is
   domain-scoped, so App Check can't mint a token on an unregistered origin.
3. **Google Cloud Console → APIs & Services → Credentials → the Browser API key** → if it has
   **HTTP-referrer** restrictions, add the domain there too, otherwise Identity Toolkit returns
   `requests-from-referer-…-are-blocked`.

Stable custom domains are the reliable target; ephemeral preview hashes change on every deploy and
are impractical to keep allowlisted.

## Triage: ALL sign-in fails (Google **and** email/password) on **every** domain

When _both_ Google and email/password register/sign-in fail on the production domain too — not just an
ephemeral preview — the cause is almost never the app code (the whole flow is a few SDK calls, covered
by tests). It's a **project/Console setting** that gates every auth call at once. The Account page now
appends the raw Firebase code to the on-screen error (e.g. `(code: auth/…)`); read it and match it to
the step below. Work top-down — these are ordered by how often they cause a total outage.

0. **Did the fix ever ship?** Before touching any Console setting, confirm production is actually
   running the code you think it is. A merged fix that never deployed looks exactly like a fix that
   didn't work, and this project has hit that: in Aug 2026 every GitHub Actions run began failing
   instantly (no runner assigned, no logs) across repos, so `deploy.yml` stopped running and
   production sat on a build that was days old while auth fix after auth fix landed on `main`.
   - Check the Actions tab: is the latest **Deploy (Firebase Hosting + rules)** run on `main` green?
     If runs fail in seconds with **no logs**, that's an account-level Actions problem (billing /
     org Actions policy), not a code bug — no amount of Console tuning will help until it's cleared.
   - Check what's live: `firebase hosting:releases:list --project flygaca-app` (or Console →
     Hosting → Release history) and compare the release timestamp to your merge.
   - Confirm the live bundle carries real config — open the site, DevTools → Network → the
     `assets/index-*.js` chunk, and search it for `AIzaSy`. No match means `VITE_FIREBASE_*` never
     reached the build (see step 5); a match that isn't the current key means a stale deploy.
   - **Beware manual deploys.** A local `firebase deploy` bakes in whatever `.env.local` is on that
     machine, bypassing `deploy.yml`'s "Verify build env" guard entirely. If production was last
     shipped by hand, that is the first thing to re-check.

1. **Providers enabled** — Console → Authentication → **Sign-in method**: confirm **Email/Password**
   _and_ **Google** are both _Enabled_. A disabled provider returns `auth/operation-not-allowed`
   (shown as "this sign-in method is turned off").
2. **reCAPTCHA Enterprise for Firebase Auth enforcement** — Console → Authentication → **Settings**:
   if bot/abuse protection (reCAPTCHA Enterprise) is set to **Enforce**, every auth call needs a valid
   reCAPTCHA token, which the SDK can only mint on an origin registered on the key
   (`VITE_RECAPTCHA_ENTERPRISE_SITE_KEY`, currently `6Lc84Vgt…`). If your serving domains aren't on the
   key's **Domains** list (Google Cloud → Security → reCAPTCHA Enterprise), _all_ auth fails. Fix:
   add every serving origin to the key (see list below), or switch enforcement to **Audit** until the
   domains are registered. Surfaces as `auth/firebase-app-check-token-is-invalid` /
   `auth/missing-app-check-token` / `auth/internal-error`. **This is the most common cause of a total
   outage on this project**, because every host build ships the key (`cp .env.example .env.local`).
3. **Authorized domains** — Console → Authentication → **Settings → Authorized domains**: every
   serving host must be listed. Missing → `auth/unauthorized-domain` (Google) — email/password is
   unaffected by this one, so if email _also_ fails it's step 2 or 4, not this.
4. **Browser API key** (`AIzaSyCJUd5…`) — Google Cloud → APIs & Services → **Credentials**: the key
   must be enabled, have the **Identity Toolkit API** allowed, and — if it has **HTTP-referrer**
   restrictions — list every serving host, else Identity Toolkit returns
   `requests-from-referer-…-are-blocked` for _all_ auth.
5. **Config actually shipped** — if the Account page shows the "temporarily unavailable" card with
   **no form or Google button at all**, the deployed bundle is missing `VITE_FIREBASE_*`
   (`isFirebaseConfigured()` is false). Production gets them from the **Actions variables** injected
   by `deploy.yml`'s Build step (`FIREBASE_API_KEY`, `FIREBASE_PROJECT_ID`, `FIREBASE_APP_ID`, …) —
   `.env.example` is never read by Vite, so it cannot rescue a build that's missing them. Check
   Settings → Secrets and variables → Actions → **Variables**, and note that `deploy.yml` only grew
   the `VITE_FIREBASE_*` injection in Aug 2026: any release built before that has **no** Firebase
   config at all.

   `isFirebaseConfigured()` also rejects unfilled placeholders (`your-…`, `…replace_me`), so this
   same card — not a dead-but-complete form — is what a placeholder build now shows. If instead you
   see a **full sign-in form where every attempt fails**, the config shipped but is *wrong*
   (`auth/api-key-not-valid`) or is being rejected by steps 1–4.

Serving origins to register in steps 2–4: `flygaca.com`, `www.flygaca.com`, `flygaca-app.web.app`,
`flygaca-app.firebaseapp.com`. (The Vercel/Netlify/Cloudflare mirror fronts were removed in Aug 2026
— Firebase Hosting is the only serving front, so there are no `*.vercel.app` / `*.netlify.app`
aliases left to authorize.)
