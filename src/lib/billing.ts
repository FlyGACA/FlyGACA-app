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

export type ProPlan = 'monthly' | 'annual';

/** Whether the web Stripe checkout can run in this runtime. */
export function canCheckout(): boolean {
  return isFirebaseConfigured() && !isNative();
}

/**
 * Begin Pro checkout. On web: requires a signed-in user, then redirects to the
 * Stripe-hosted page. On native: IAP is handled by RevenueCat in the shell, so
 * this throws `native-billing` for the caller to route into the native flow.
 */
export async function startProCheckout(plan: ProPlan = 'annual'): Promise<void> {
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
  const create = httpsCallable<{ plan: ProPlan }, { url?: string }>(fns, 'createCheckoutSession');
  const res = await create({ plan });
  const url = res.data?.url;
  if (!url) throw new Error('no-url');
  window.location.assign(url);
}
