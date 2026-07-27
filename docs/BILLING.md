# Billing (Moyasar) — setup & verification

The app sells **Pro** (auto-renewing), a discounted **student** rate, the **Exam Season Pass** and
**exam-prep packs** (one-time), and Captain Adel **credit packs** (one-time) via Moyasar's hosted
checkout widget (web) / RevenueCat IAP (native iOS). Unlike Stripe, Moyasar has no native
subscription object — Pro/student are "recurring" only because a saved card **token** is
re-charged by a scheduled function; see [Renewal engine](#renewal-engine-no-native-subscriptions)
below. The web flow and the backend functions live in this repo; the entitlement / pack ownership
is granted server-side and read-only on the client.

## Pieces

- **Frontend**:
  - `src/lib/services/billing.ts` — `startProCheckout(plan)` / `startPackCheckout(packId)`
    navigate to the in-app `/checkout` route (no network call yet); `cancelAutoRenew()` calls the
    callable of the same name. `effectivePlan(entitlement)` gates UI; `refreshAccount()` re-reads
    the entitlement after checkout returns.
  - `src/pages/checkout/Checkout.tsx` — the checkout surface itself, handling BOTH legs of a
    purchase:
    - **Start** (`?kind=pro|student|pass|credits|pack&...`): calls `createCheckoutConfig` to price
      the checkout server-side, then mounts Moyasar's hosted JS widget
      (`cdn.moyasar.com/mpf/…/moyasar.{js,css}`). Card/mada/Apple Pay/STC Pay data goes straight
      from the browser to Moyasar — it never touches this app's servers (PCI SAQ‑A scope).
    - **Return** (`?id=<payment_id>`, appended by Moyasar to `callback_url`): calls `confirmPayment`
      to fetch + verify the payment server-to-server and fulfil it, then navigates to wherever that
      purchase belongs.
- **Backend** (`functions/src/billing.ts`, pure logic in `functions/src/billing-core.ts`):
  - `createCheckoutConfig` (callable) — validates the checkout (student email verification, pack-id
    validation), computes the halalas amount from the configured SAR price table, and persists a
    server-trusted `checkoutIntents/{id}` record the browser can't tamper with (the browser only
    ever sees an opaque `checkoutId` in the widget's `metadata`).
  - `confirmPayment` (callable) — the PRIMARY, trusted fulfilment path. Fetches the payment by id
    with the secret key, cross-checks its amount/currency/uid against the stored `checkoutIntent`
    (not the payment's own metadata, which the browser could have altered before submitting to
    Moyasar), then grants.
  - `moyasarWebhook` (HTTP, `/api/moyasar-webhook`) — an async backstop for the same fulfilment
    path (`fulfillPayment`, shared with `confirmPayment`). A `moyasarPayments/{id}` idempotency
    marker means whichever of the two lands first does the actual grant.
  - `cancelAutoRenew` (callable) — turns off the renewal engine for a subscriber; the plan stays
    active until its already-granted `expiresAt`.
  - `renewMoyasarSubscriptions` (scheduled, daily) — the renewal engine; see below.
  - `users/{uid}.entitlement` is written ONLY here (`writeEntitlement`, bypassing `firestore.rules`
    via the Admin SDK) — derived by `billing-core.ts`'s pure functions from a paid checkout/renewal.
    Same for the pass grant, `chatCredits/{uid}` and `packEntitlements/{uid}` (pack ownership).
- **Exam-prep packs**: one flat SAR price (`MOYASAR_PRICE_PREP_PACK_SAR`) shared by every sellable
  pack; the bought pack rides on the checkout intent's `packId`, validated server-side against
  `SELLABLE_PACK_IDS` in `functions/src/billing-core.ts` (which mirrors the paid + live packs in
  `src/lib/prepCatalog.ts`). Ownership is written to `packEntitlements/{uid}` (server-only write,
  owner-readable — same shape as `chatCredits`).
- **Collections** (all server-only; deny-all in `firestore.rules`):
  - `checkoutIntents/{id}` — the price/kind/uid a payment must match, written by
    `createCheckoutConfig`, read by `fulfillPayment`.
  - `moyasarPayments/{id}` — payment-id idempotency markers (parity with the old `stripeEvents`).
  - `moyasarCustomers/{uid}` — the saved card token (`save_card` on a `pro`/`student` checkout),
    used by the renewal engine to charge off-session.
  - `subscriptions/{uid}` — auto-renew state: `cadence`, `autoRenew`, `status`
    (`active`/`past_due`/`canceled`), `failedAttempts`, `nextChargeAt`.

## Renewal engine (no native subscriptions)

Moyasar's core API is payments + invoices + card tokenization — there's no Stripe-style
subscription object with automatic recurring billing. So a `pro`/`student` checkout requests
`save_card: true` (cards/mada only — Apple Pay and STC Pay tokens are single-use and can't be
recharged, so recurring checkouts only ever offer `methods: ['creditcard']`); on a successful
payment the returned card token is stored in `moyasarCustomers/{uid}` and a `subscriptions/{uid}`
doc opens with `nextChargeAt` set `RENEWAL_LEAD_DAYS` (3) days before `expiresAt`.

`renewMoyasarSubscriptions` runs once a day (`onSchedule('every 24 hours')`) and, for every due
subscriber:

1. Charges the saved token for the configured cadence price (`source: { type: 'token', token }`).
2. On success: extends `entitlement.expiresAt` by one cadence period **from the current expiry**
   (not from the charge date, so an early recharge never shaves off paid-for time —
   `extendExpiry`/`cadenceDays` in `billing-core.ts`), and rolls `nextChargeAt` forward.
3. On failure: increments `failedAttempts` and retries on tomorrow's run; after
   `MAX_RENEWAL_ATTEMPTS` (3) consecutive failures, auto-renew gives up (`status: 'canceled'`) and
   the plan simply lapses to `free` at its already-set `expiresAt` — same end state as a lapsed
   Stripe subscription, just without Stripe's dunning emails (there is no dunning UX here yet).

There is no hosted billing portal to "manage" a subscription — `cancelAutoRenew` (surfaced as
**Turn off auto-renew** in the account page's Subscription panel) is the entire self-service
surface; updating a card means running the `pro`/`student` checkout again, which overwrites the
stored token.

## Configure (Moyasar dashboard + Firebase project)

**0. Create a Moyasar account** (sandbox first) at [moyasar.com](https://moyasar.com) and grab the
**Secret key** (`sk_test_…` / `sk_live_…`) and **Publishable key** (`pk_test_…` / `pk_live_…`) from
the dashboard's API keys page.

Secrets (Secret Manager — server-only, never shipped to the client):

```
firebase functions:secrets:set MOYASAR_SECRET_KEY     # sk_live_… / sk_test_…
firebase functions:secrets:set MOYASAR_WEBHOOK_SECRET  # the shared_secret you set when creating the webhook below
```

Params (set in `.env.<project>` for functions, or via the deploy prompt) — **SAR list prices**
(major units, e.g. `"59"` or `"449.00"`), the authoritative source `createCheckoutConfig` derives
the halalas amount from. Keep these in sync with the indicative figures shown on `/pricing`
(`src/pages/pricing/Pricing.tsx`) and `PREP_PACK_PRICE` (`src/lib/prepCatalog.ts`) — there's no
shared build-time constant across the language boundary, so a price change is a two-file edit:

```
MOYASAR_PRICE_PRO_MONTHLY_SAR=59
MOYASAR_PRICE_PRO_ANNUAL_SAR=449
MOYASAR_PRICE_STUDENT_MONTHLY_SAR=39
MOYASAR_PRICE_STUDENT_ANNUAL_SAR=299
MOYASAR_PRICE_PASS_SAR=149            # one-time Exam Season Pass (→ 90 days pro)
MOYASAR_PRICE_CREDITS_SAR=<set me>    # one-time Captain Adel credit pack (→ +50 credits) — no
                                       # default; pick a price before deploy, it's shown nowhere
                                       # else in the app pre-checkout
MOYASAR_PRICE_PREP_PACK_SAR=39        # one-time exam-prep pack, flat (→ pack ownership)
APP_ORIGIN=https://flygaca.com        # used to build Moyasar's callback_url (must be absolute)
```

To sell a pack that is `status: 'soon'` today, flip it to `'live'` in `src/lib/prepCatalog.ts`
**and** add its id to `SELLABLE_PACK_IDS` in `functions/src/billing-core.ts`, then redeploy — no
new Moyasar-side configuration is needed (every pack shares the one flat price).

**Publishable key on the client** (public, non-secret — restricted to card charges, not a
capability to read data):

```
# .env.local / the production build env
VITE_MOYASAR_PUBLISHABLE_KEY=pk_test_…   # pk_live_… in production
```

**1. Create the webhook** — Moyasar dashboard → *Webhooks* → add `https://<host>/api/moyasar-webhook`,
subscribed to `payment_paid` (and, if you want faster renewal-failure visibility, `payment_failed`).
Set a `shared_secret` and copy it into `MOYASAR_WEBHOOK_SECRET`. **Verify the exact signature
recipe against Moyasar's current webhook docs before relying on the webhook alone** —
`verifyMoyasarSignature` in `functions/src/billing-core.ts` implements HMAC‑SHA256 over the raw
body against the `x-moyasar-signature` header per the SDK docs available at authoring time, but
`docs.moyasar.com` blocked automated fetches during this integration so it hasn't been checked
against the live reference page. This is defense-in-depth only: `confirmPayment` (the callable,
which fetches the payment server-to-server with the secret key) is the primary, trusted fulfilment
path, so a wrong recipe here makes the webhook inert rather than insecure — purchases still
fulfil on the redirect back through `/checkout`.

**2. Apple Pay** (only needed if you keep `applepay` in the one-time-purchase methods list):
   1. Moyasar dashboard → *Apple Pay* → add your domain (`flygaca.com`) and download the
      **Merchant Domain Association** file.
   2. Serve it, byte-for-byte, at
      `https://flygaca.com/.well-known/apple-developer-merchantid-domain-association` — **no file
      extension**. Since `public/` ships as-is into `dist/`, drop the downloaded file at
      `public/.well-known/apple-developer-merchantid-domain-association`.
   3. Back in the dashboard, click **Validate** (checks the file is reachable) then **Register**
      (asks Apple to verify + register the domain).
   4. You'll also need an Apple Developer account + Merchant ID linked in the dashboard — see
      Moyasar's *Apple Pay → Apple Developer Account* guide.

**3. STC Pay**: enabled per-account by Moyasar; no extra web integration work — the hosted widget's
`stcpay` method just works once it's turned on for your account.

> Region note: the billing callables, `moyasarWebhook` and `renewMoyasarSubscriptions` deploy to
> **me-central1** (the source of truth is `functions/src/region.ts`; the `/api/moyasar-webhook`
> rewrite in `firebase.json` and the client's `FUNCTIONS_REGION` in
> `src/lib/services/firebase.ts` must all match it). The chat gateway (`/api/chat`) is reached by
> the same-region hosting fetch — it does not use the callable region.

> CSP note: the hosted widget is cross-origin by design (the browser talks to Moyasar directly), so
> `connect-src`/`script-src`/`style-src`/`frame-src` in `firebase.json` (and the mirrored
> `vercel.json`/`netlify.toml`) allowlist `cdn.moyasar.com` and `api.moyasar.com` — the one
> deliberate exception to this app's otherwise same-origin-only CSP.

## Deploy

```
cd functions && npm install        # no extra SDK — a minimal fetch-based REST client
npm run deploy:functions           # firebase deploy --only functions
npm run deploy:rules               # firebase deploy --only firestore:rules
npm run deploy                     # build + deploy hosting (picks up the rewrite)
# …or all three at once:  npm run deploy:all
```

## App Check

`createCheckoutConfig` / `confirmPayment` / `cancelAutoRenew` **already declare
`enforceAppCheck: true`** in `functions/src/billing.ts`, and the client attaches an App Check token
when `VITE_RECAPTCHA_ENTERPRISE_SITE_KEY` is set (`src/lib/services/firebase.ts`). For checkout to
work in production you must therefore have App Check configured end-to-end:

1. Create a reCAPTCHA Enterprise key (Google Cloud console) and register it under Firebase → App Check.
2. Set `VITE_RECAPTCHA_ENTERPRISE_SITE_KEY` in the production build (GitHub Actions secret) and deploy the client.
3. Watch App Check request metrics; verified requests should dominate before you enforce at the
   project level. See `docs/APP-CHECK-BACKEND.md` for the enforcement rollout.

## Verify end-to-end (test mode)

1. Sign in on the web app → **/pricing** → *Go Pro* → lands on `/checkout`, mounts the widget →
   complete a payment with a [Moyasar test card](https://moyasar.com) (sandbox mode; test-mode
   cards are documented on the dashboard).
2. Moyasar redirects to `/checkout?id=<payment_id>&kind=pro&cadence=annual`; the page calls
   `confirmPayment` and redirects to `/account?checkout=success`. The **Subscription** panel flips
   to *Pro* with the renewal date.
3. Confirm `users/{uid}.entitlement` = `{ plan: 'pro', source: 'moyasar', expiresAt }` and
   `moyasarCustomers/{uid}.token` is set (the saved card) in Firestore.
4. **Turn off auto-renew** (Subscription panel) → `subscriptions/{uid}.autoRenew` flips to `false`;
   the plan stays Pro until `expiresAt`.
5. Idempotency: re-POST the same `payment_paid` webhook event (or call `confirmPayment` again with
   the same id) — must not double-grant. `moyasarPayments/{id}` acks the replay and the merge-write
   is a no-op.

### Exam-prep pack purchase

1. Sign in → **/study/packs** → open a paid pack (e.g. *Aviation medical*) → **Buy this pack** →
   lands on `/checkout` → complete a test-mode payment.
2. Redirects to `/checkout?id=…&kind=pack&packId=medical` → confirms → lands on
   `/study/packs/medical?checkout=success`; the pack unlocks (its content + the "Owned" badge
   appear).
3. Confirm `packEntitlements/{uid}` in Firestore = `{ packs: { medical: { purchasedAt, source:
   'moyasar' } } }`.
4. As a **Pro subscriber**, the same pack shows **Included in Pro** with no Buy button (access
   comes from the plan, not ownership).

### Renewal engine (manual test)

Since `renewMoyasarSubscriptions` runs on a schedule, exercise it directly for a fast feedback
loop: `firebase functions:shell` → `renewMoyasarSubscriptions()` (or trigger it via the Cloud
Scheduler console) against a test project with a `subscriptions/{uid}` doc whose `nextChargeAt` is
in the past and a real `moyasarCustomers/{uid}.token` from a prior test-mode `save_card` checkout.
Confirm a successful charge extends `expiresAt` and rolls `nextChargeAt` forward, and that
exhausting `MAX_RENEWAL_ATTEMPTS` (simulate with an expired/invalid token) flips `subscriptions/
{uid}.status` to `'canceled'` without touching `entitlement` (it just lapses naturally).

## Tests

`cd functions && npm test` runs the pure `billing-core` unit tests (SAR→halalas pricing,
cadence/renewal math, signature verification, entitlement derivation) and the `moyasarWebhook`
wiring tests (signature check, idempotency, fulfilment-by-kind, the amount/currency cross-check
against the stored `checkoutIntent`). `createCheckoutConfig`/`confirmPayment`/`cancelAutoRenew`
(thin `onCall` wrappers over the same tested logic) and the live Moyasar flow can only be
exercised against a configured project (not in CI / the sandbox) — see the checklists above.
