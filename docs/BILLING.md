# Billing (Stripe) — setup & verification

The app sells **Pro** via Stripe Checkout (web) / RevenueCat IAP (native iOS). The web flow and the
backend functions live in this repo; the entitlement is granted server-side and read-only on the client.

## Pieces

- **Frontend** (`src/lib/billing.ts`): `startProCheckout(plan)` and `startBillingPortal()` call the
  callables below and redirect to the Stripe-hosted page. `effectivePlan(entitlement)` gates UI;
  `refreshAccount()` re-reads the entitlement after a checkout returns.
- **Backend** (`functions/src/billing.ts`):
  - `createCheckoutSession` (callable) — creates a subscription Checkout Session.
  - `createBillingPortalSession` (callable) — opens the Stripe customer portal.
  - `stripeWebhook` (HTTP, `/api/stripe-webhook`) — the **only** writer of `users/{uid}.entitlement`,
    derived by `functions/src/billing-core.ts` from the subscription status + price.
- **Mapping**: `stripeCustomers/{uid}` ↔ Stripe customer id (server-only; deny-all in `firestore.rules`).

## Configure (Firebase project)

Secrets (Secret Manager):

```
firebase functions:secrets:set STRIPE_SECRET_KEY        # sk_live_… / sk_test_…
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET    # whsec_… (from the webhook endpoint)
```

Params (set in `.env.<project>` for functions, or via the deploy prompt):

```
STRIPE_PRICE_PRO_MONTHLY=price_…      # recurring monthly price id
STRIPE_PRICE_PRO_ANNUAL=price_…       # recurring annual price id
APP_ORIGIN=https://flygaca.com        # used for checkout success/cancel + portal return URLs
```

In the Stripe Dashboard, create a **webhook endpoint** → `https://<host>/api/stripe-webhook`, subscribed
to `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`; copy
its signing secret into `STRIPE_WEBHOOK_SECRET`.

> Region note: the billing functions deploy to **me-central2** (matching `chat`); the
> `/api/stripe-webhook` rewrite in `firebase.json` points there.

## Deploy

```
cd functions && npm install        # pulls in `stripe`
firebase deploy --only functions:createCheckoutSession,functions:createBillingPortalSession,functions:stripeWebhook
firebase deploy --only firestore:rules
firebase deploy --only hosting     # picks up the new rewrite
```

## Verify end-to-end (test mode)

1. `stripe listen --forward-to https://<host>/api/stripe-webhook` (or use the dashboard endpoint).
2. Sign in on the web app → **/pricing** → *Go Pro* → complete checkout with test card `4242 4242 4242 4242`.
3. Stripe redirects to `/account?checkout=success`; the page polls `refreshAccount()` and the
   **Subscription** panel flips to *Pro* with the renewal date once the webhook lands.
4. Confirm `users/{uid}.entitlement` = `{ plan: 'pro', source: 'stripe', expiresAt }` in Firestore.
5. **Manage subscription** (panel or Pricing) opens the Stripe portal; cancelling there fires
   `customer.subscription.deleted` → the webhook writes `{ plan: 'free' }` and the UI drops Pro.

## Tests

`cd functions && npm test` runs the pure `billing-core` unit tests (price→plan, subscription→entitlement).
The live Stripe flow can only be exercised against a configured project (not in CI / the sandbox).
