# Billing (Stripe) — setup & verification

The app sells **Pro** (recurring), the **Exam Season Pass** and **exam-prep packs** (one-time) via
Stripe Checkout (web) / RevenueCat IAP (native iOS). The web flow and the backend functions live in
this repo; the entitlement / pack ownership is granted server-side and read-only on the client.

## Pieces

- **Frontend** (`src/lib/billing.ts`): `startProCheckout(plan)` and `startBillingPortal()` call the
  callables below and redirect to the Stripe-hosted page. `effectivePlan(entitlement)` gates UI;
  `refreshAccount()` re-reads the entitlement after a checkout returns.
- **Backend** (`functions/src/billing.ts`):
  - `createCheckoutSession` (callable) — creates a Checkout Session. Subscription mode for the Pro/
    student cadences; **one-time payment** mode for the Exam Season Pass (`kind: 'pass'`), Captain
    Adel credit packs (`kind: 'credits'`) and exam-prep packs (`kind: 'pack'`, `packId`), tagged via
    the session `metadata` so the webhook knows how to fulfil each.
  - `createBillingPortalSession` (callable) — opens the Stripe customer portal.
  - `stripeWebhook` (HTTP, `/api/stripe-webhook`) — the **only** writer of `users/{uid}.entitlement`
    (derived by `functions/src/billing-core.ts` from the subscription status + price), of the pass
    grant, of `chatCredits/{uid}`, and of `packEntitlements/{uid}` (pack ownership).
- **Exam-prep packs**: one Stripe Product with **one flat SAR-39 one-time price** shared by every
  sellable pack; the bought pack rides on `metadata.packId`, validated server-side against
  `SELLABLE_PACK_IDS` in `functions/src/billing-core.ts` (which mirrors the paid + live packs in
  `src/lib/prepCatalog.ts`). Per-pack revenue attribution comes from the Checkout Session metadata
  (Stripe Sigma / exports) rather than separate products. Ownership is written to
  `packEntitlements/{uid}` (server-only write, owner-readable — same shape as `chatCredits`).
- **Mapping**: `stripeCustomers/{uid}` ↔ Stripe customer id (server-only; deny-all in `firestore.rules`).

## Configure (Firebase project)

**0. Create the product + prices in Stripe** (live mode for production). In the Stripe Dashboard →
*Products* → create **Fly GACA Pro**, then add two recurring prices: one **monthly** and one **annual**
(in SAR, to match the indicative figures on `/pricing`). Copy each `price_…` id — they become
`STRIPE_PRICE_PRO_MONTHLY` / `STRIPE_PRICE_PRO_ANNUAL` below. Grab the secret key from *Developers → API keys*
(`sk_live_…`).

Secrets (Secret Manager):

```
firebase functions:secrets:set STRIPE_SECRET_KEY        # sk_live_… / sk_test_…
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET    # whsec_… (from the webhook endpoint)
```

For the **exam-prep packs**, create one more Product — **Fly GACA Exam Prep Pack** — with a single
**one-time** price of **SAR 39**; copy its id into `STRIPE_PRICE_PREP_PACK`. The same price is reused
for every pack (the pack id travels in the session metadata). To sell a pack that is `status: 'soon'`
today, flip it to `'live'` in `src/lib/prepCatalog.ts` **and** add its id to `SELLABLE_PACK_IDS` in
`functions/src/billing-core.ts`, then redeploy the functions — no new Stripe price is needed.

Params (set in `.env.<project>` for functions, or via the deploy prompt):

```
STRIPE_PRICE_PRO_MONTHLY=price_…      # recurring monthly price id (→ pro)
STRIPE_PRICE_PRO_ANNUAL=price_…       # recurring annual price id (→ pro)
STRIPE_PRICE_STUDENT_MONTHLY=price_…  # discounted student monthly (→ pro; verified academic email)
STRIPE_PRICE_STUDENT_ANNUAL=price_…   # discounted student annual (→ pro; verified academic email)
STRIPE_PRICE_PASS=price_…             # one-time Exam Season Pass (→ 90 days pro)
STRIPE_PRICE_CREDITS=price_…          # one-time Captain Adel credit pack (→ +50 credits)
STRIPE_PRICE_PREP_PACK=price_…        # one-time exam-prep pack, flat SAR 39 (→ pack ownership)
APP_ORIGIN=https://flygaca.com        # used for checkout success/cancel + portal return URLs
```

In the Stripe Dashboard, create a **webhook endpoint** → `https://<host>/api/stripe-webhook`, subscribed
to `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`; copy
its signing secret into `STRIPE_WEBHOOK_SECRET`.

> Region note: the billing callables and the `stripeWebhook` deploy to **me-central1** (the source
> of truth is `functions/src/region.ts`; the `/api/stripe-webhook` rewrite in `firebase.json` and
> the client's `FUNCTIONS_REGION` in `src/lib/firebase.ts` must all match it). The chat gateway
> (`/api/chat`) is reached by the same-region hosting fetch — it does not use the callable region.

## Deploy

```
cd functions && npm install        # pulls in `stripe`
npm run deploy:functions           # firebase deploy --only functions
npm run deploy:rules               # firebase deploy --only firestore:rules
npm run deploy                     # build + deploy hosting (picks up the rewrite)
# …or all three at once:  npm run deploy:all
```

## App Check

The billing callables (`createCheckoutSession` / `createBillingPortalSession`) **already declare
`enforceAppCheck: true`** in `functions/src/billing.ts`, and the client attaches an App Check token
when `VITE_RECAPTCHA_ENTERPRISE_SITE_KEY` is set (`src/lib/firebase.ts`). For checkout to work in
production you must therefore have App Check configured end-to-end:

1. Create a reCAPTCHA Enterprise key (Google Cloud console) and register it under Firebase → App Check.
2. Set `VITE_RECAPTCHA_ENTERPRISE_SITE_KEY` in the production build (GitHub Actions secret) and deploy the client.
3. Watch App Check request metrics; verified requests should dominate before you enforce at the
   project level. See `docs/APP-CHECK-BACKEND.md` for the enforcement rollout.

## Verify end-to-end (test mode)

1. `stripe listen --forward-to https://<host>/api/stripe-webhook` (or use the dashboard endpoint).
2. Sign in on the web app → **/pricing** → *Go Pro* → complete checkout with test card `4242 4242 4242 4242`.
3. Stripe redirects to `/account?checkout=success`; the page polls `refreshAccount()` and the
   **Subscription** panel flips to *Pro* with the renewal date once the webhook lands.
4. Confirm `users/{uid}.entitlement` = `{ plan: 'pro', source: 'stripe', expiresAt }` in Firestore.
5. **Manage subscription** (panel or Pricing) opens the Stripe portal; cancelling there fires
   `customer.subscription.deleted` → the webhook writes `{ plan: 'free' }` and the UI drops Pro.

### Exam-prep pack purchase

1. Sign in → **/study/packs** → open a paid pack (e.g. *Aviation medical*) → **Buy this pack** →
   complete checkout with test card `4242 4242 4242 4242`.
2. Stripe redirects to `/study/packs/<id>?checkout=success`; the page polls `refreshAccount()` and
   the pack unlocks (its content + the "Owned" badge appear) once the webhook lands.
3. Confirm `packEntitlements/{uid}` in Firestore = `{ packs: { <id>: { purchasedAt, source: 'stripe' } } }`.
4. As a **Pro subscriber**, the same pack shows **Included in Pro** with no Buy button (access comes
   from the plan, not ownership).
5. Idempotency: `stripe events resend <evt_id>` for the pack's `checkout.session.completed` must not
   create a duplicate or error — the `stripeEvents/{id}` marker acks the replay and the merge-write
   is a no-op.

## Tests

`cd functions && npm test` runs the pure `billing-core` unit tests (price→plan, subscription→entitlement).
The live Stripe flow can only be exercised against a configured project (not in CI / the sandbox).
