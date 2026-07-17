# RUNBOOK — Firebase (emulator-first)

Stage 3 wires the app to Firebase **Auth + Firestore** without requiring production secrets: the
whole layer is gated on `VITE_FIREBASE_*` config. With no config the app runs fully local-first
(localStorage); with config it uses Firebase. Develop and verify against the **Local Emulator Suite**
first; injecting real keys is the only remaining production step.

## What's wired

- `src/lib/firebase.ts` — config-gated, lazy bootstrap of App/Auth/Firestore (+ App Check + GA4
  Analytics). The SDK is dynamic-`import()`ed, so `firebase/*` never enters the main bundle. The
  full public web config for `flygaca-app` ships as real values in `.env.example`;
  `cp .env.example .env.local` initializes Firebase against the live project. Analytics is
  browser-only and opt-in via `measurementId` (off under SSR, tests, and the emulator).
- `src/lib/auth.ts` — `getIdToken` (sent to `/api/chat`), `onAuthChange`, Google/email sign-in,
  register, `signOutUser`.
- `src/lib/account.ts` — on Firebase sign-in, adopts the uid and hydrates profile/logbook/entitlement
  from Firestore (`src/lib/sync.ts`), then write-throughs profile/logbook mutations. Local cache is
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

Stripe/RevenueCat billing is Batch 3c (`src/lib/billing.ts`).

## Authorizing a domain (preview deploys & new hosts)

Sign-in (Google popup **and** email/password) fails on any origin the Firebase project doesn't
recognise — most commonly an ephemeral **Vercel/preview** domain
(`…-flygaca-app.vercel.app`). The symptom is a sign-in that fails with a Firebase error code the app
now surfaces on the Account page (`auth/unauthorized-domain`,
`auth/requests-from-referer-…-are-blocked`, `auth/operation-not-allowed`, or an App Check rejection —
see the `MAP` in `src/calc/authError.ts`). It is **not** a bad-credentials problem; the fix is to add
the domain to every allowlist below:

1. **Firebase Console → Authentication → Settings → Authorized domains** — add the exact host.
   Wildcards like `*.vercel.app` are **not** accepted, so each ephemeral preview hash would need its
   own entry; prefer testing on the production/custom domain (or a stable Vercel alias) instead.
2. **Google Cloud Console → Security → reCAPTCHA Enterprise → the site key** matching
   `VITE_RECAPTCHA_ENTERPRISE_SITE_KEY` → add the domain to the key's **Domains** list. The key is
   domain-scoped, so App Check can't mint a token on an unregistered origin.
3. **Google Cloud Console → APIs & Services → Credentials → the Browser API key** → if it has
   **HTTP-referrer** restrictions, add the domain there too, otherwise Identity Toolkit returns
   `requests-from-referer-…-are-blocked`.

Stable custom domains are the reliable target; ephemeral preview hashes change on every deploy and
are impractical to keep allowlisted.
