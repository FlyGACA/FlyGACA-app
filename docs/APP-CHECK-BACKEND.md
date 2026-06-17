# Enforcing App Check on the backend functions (`FlyGACA/flygaca`)

This repo (`gacafly/flygaca-app`) is **frontend only** — it has no Cloud Function
definitions. The functions referenced by the app live in the separate **`FlyGACA/flygaca`**
backend repo and are unchanged by this repo's deploys. This doc is the exact patch + checklist
to **enforce Firebase App Check** on them. Apply it in the backend repo.

The frontend is already enforcement-ready: it initializes App Check
(`ReCaptchaEnterpriseProvider`, gated on `VITE_RECAPTCHA_ENTERPRISE_SITE_KEY`) and attaches the
App Check token to every gateway call — `X-Firebase-AppCheck` on `/api/chat`
(`src/lib/api.ts`), and `httpsCallable` auto-attaches it for `createCheckoutSession`.

## Functions in scope

| Function | Kind | Invoked from app | How it's reached |
| --- | --- | --- | --- |
| `createCheckoutSession` | **Callable** (`onCall`) | `src/lib/billing.ts` (`httpsCallable`) | Firebase callable protocol |
| `chat` | **HTTP** (`onRequest`) | `src/lib/api.ts` (`fetch`) | rewrite `/api/chat` → `chat` |
| `protectedContent` | **HTTP** (`onRequest`) | `/api/content` (gated assets) | rewrite `/api/content` → `protectedContent` |

All are deployed in region `me-central2` (matches `FUNCTIONS_REGION` in `src/lib/firebase.ts`).

## 1. Callable function — `createCheckoutSession`

For callables, App Check is enforced by the framework via a single option. Match whichever
generation the backend uses.

**Cloud Functions v2** (`firebase-functions/v2/https`):

```ts
import { onCall } from 'firebase-functions/v2/https';

export const createCheckoutSession = onCall(
  { region: 'me-central2', enforceAppCheck: true }, // reject missing/invalid tokens
  (request) => {
    // request.app is populated when the App Check token is valid
    // ...existing checkout logic...
  },
);
```

**Cloud Functions v1** (`firebase-functions`):

```ts
const functions = require('firebase-functions');

exports.createCheckoutSession = functions
  .region('me-central2')
  .runWith({ enforceAppCheck: true })
  .https.onCall((data, context) => {
    // context.app is present when the App Check token is valid
    // ...existing checkout logic...
  });
```

No client change is needed for this one — the callable SDK attaches the token automatically once
App Check is initialized.

## 2. HTTP functions — `chat`, `protectedContent`

`enforceAppCheck` is **not** auto-applied to `onRequest`/HTTP functions. Verify the token
manually with the Admin SDK and reject on failure. This is why the client attaches the
`X-Firebase-AppCheck` header to `/api/chat`.

```ts
import { getAppCheck } from 'firebase-admin/app-check';

// At the top of each HTTP handler (chat, protectedContent), before doing work:
const appCheckToken = req.header('X-Firebase-AppCheck');
if (!appCheckToken) {
  res.status(401).send('Missing App Check token');
  return;
}
try {
  await getAppCheck().verifyToken(appCheckToken);
} catch {
  res.status(401).send('Invalid App Check token');
  return;
}
// ...existing handler logic...
```

(If replay protection is wanted, mint a limited-use token on the client with
`getLimitedUseToken` and verify with `verifyToken(token, { consume: true })`. The current client
uses standard `getToken`; switch both sides together if you adopt consumption.)

## 3. IAM (required for verification to work)

Grant the **Firebase App Check Token Verifier** role to the service account the functions run as:

- **v2**: the **Default compute service account**
  (`<project-number>-compute@developer.gserviceaccount.com`).
- **v1**: the **App Engine default service account**
  (`<project-id>@appspot.gserviceaccount.com`).

Project: `flygaca-app` (project number `30479965011`). Set via
Google Cloud Console → IAM, or `gcloud projects add-iam-policy-binding`.

## 4. Rollout order (load-bearing — do not skip)

Enforcing before clients send tokens will lock out existing users.

1. **Ship the token-attaching client first.** The changes in this repo (frontend) plus
   `VITE_RECAPTCHA_ENTERPRISE_SITE_KEY` set in the production build env. Confirm it's live.
2. **Register the reCAPTCHA Enterprise provider** for the Web app in the Firebase console
   (App Check) and grant the IAM role above.
3. **Watch, don't enforce.** In App Check → Requests, confirm a healthy share of **verified**
   requests for each function before flipping the switch.
4. **Enforce** once verified traffic dominates: deploy the function changes above (callable) and
   enable enforcement for the HTTP functions / set the App Check enforcement state in the console.
5. Keep an eye on error rates immediately after; be ready to roll back enforcement if a wave of
   older clients (without tokens) is still active.
