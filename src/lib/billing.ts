/**
 * Billing. Web checkout goes through the existing `createCheckoutSession` Cloud
 * Function (Stripe-hosted page); native iOS uses RevenueCat IAP (App Store rules
 * forbid web checkout in-app). Mirrors the legacy `assets/js/billing.js` and the
 * `billingChannel()` split, and is gated on Firebase config so it no-ops in the
 * local-first build.
 *
 * Errors are thrown as stable codes the UI maps to copy:
 *   'billing-unavailable' · 'sign-in-required' · 'native-billing' · 'no-url'
 */
import { billingChannel, isNative } from './native-bridge';
import { isFirebaseConfigured, getFns, getFirebaseAuth } from './firebase';

// 'monthly' / 'annual' are the standard Pro cadences; 'student' is the verified
// student rate and 'pass' the 90-day Exam Season Pass. 'credits' is a one-time
// Captain Adel question pack. The Cloud Function maps each variant to a Stripe
// price (subscription for the cadences, one-time payment for pass/credits).
export type ProPlan = 'monthly' | 'annual' | 'student' | 'pass' | 'credits';

/** Questions per purchased credit pack. Mirror of functions/src/chat-quota-core.ts. */
export const CREDIT_PACK_SIZE = 50;

/** Whether the web Stripe checkout can run in this runtime. */
export function canCheckout(): boolean {
  return isFirebaseConfigured() && !isNative();
}

/**
 * Begin Pro checkout. On web: requires a signed-in user, then redirects to the
 * Stripe-hosted page. On native: IAP is handled by RevenueCat in the shell, so
 * this throws `native-billing` for the caller to route into the native flow.
 */
export async function startProCheckout(
  plan: ProPlan = 'annual',
  opts?: { annual?: boolean },
): Promise<void> {
  if (billingChannel() === 'revenuecat' || isNative()) {
    // RevenueCat IAP is wired in the native shell (Batch: native IAP).
    throw new Error('native-billing');
  }
  if (!isFirebaseConfigured()) throw new Error('billing-unavailable');

  const auth = await getFirebaseAuth();
  if (!auth?.currentUser) throw new Error('sign-in-required');

  const fns = await getFns();
  if (!fns) throw new Error('billing-unavailable');
  const { httpsCallable } = await import('firebase/functions');
  // `annual` selects the cadence for the student rate; the server ignores it for
  // the cadence-encoded Pro variants.
  const create = httpsCallable<{ plan: ProPlan; annual?: boolean }, { url?: string }>(
    fns,
    'createCheckoutSession',
  );
  const res = await create({ plan, annual: opts?.annual });
  const url = res.data?.url;
  if (!url) throw new Error('no-url');
  window.location.assign(url);
}

/**
 * Open the Stripe customer portal so a subscriber can manage/cancel. Web only
 * (native manages subscriptions through the App Store). Throws the same stable
 * error codes as {@link startProCheckout}.
 */
export async function startBillingPortal(): Promise<void> {
  if (billingChannel() === 'revenuecat' || isNative()) throw new Error('native-billing');
  if (!isFirebaseConfigured()) throw new Error('billing-unavailable');

  const auth = await getFirebaseAuth();
  if (!auth?.currentUser) throw new Error('sign-in-required');

  const fns = await getFns();
  if (!fns) throw new Error('billing-unavailable');
  const { httpsCallable } = await import('firebase/functions');
  const portal = httpsCallable<Record<string, never>, { url?: string }>(
    fns,
    'createBillingPortalSession',
  );
  const res = await portal({});
  const url = res.data?.url;
  if (!url) throw new Error('no-url');
  window.location.assign(url);
}
