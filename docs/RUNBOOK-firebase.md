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
