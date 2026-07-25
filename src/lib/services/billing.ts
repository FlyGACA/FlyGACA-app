/**
 * Billing. Web checkout navigates to the in-app `/checkout` route, which mounts
 * Moyasar's hosted JS widget (see src/pages/checkout/Checkout.tsx) — card data
 * never touches this app's own servers, only Moyasar's. Native iOS uses RevenueCat
 * IAP (App Store rules forbid web checkout in-app). Mirrors the `billingChannel()`
 * split and is gated on Firebase config so it no-ops in the local-first build.
 *
 * Errors are thrown as stable codes the UI maps to copy:
 *   'billing-unavailable' · 'sign-in-required' · 'native-billing'
 */
import { billingChannel, isNative } from '@/lib/native/nativeBridge';
import { isFirebaseConfigured, getFns, getFirebaseAuth } from '@/lib/services/firebase';

// 'monthly' / 'annual' are the standard Pro cadences; 'student' is the verified
// student rate and 'pass' the 90-day Exam Season Pass. 'credits' is a one-time
// Captain Adel question pack. The checkout page maps each variant to a Moyasar
// checkout kind — 'pro' (subsuming monthly/annual) for the cadence variants,
// unchanged for the rest — and a cadence for the recurring ones.
export type ProPlan = 'monthly' | 'annual' | 'student' | 'pass' | 'credits';

/** Questions per purchased credit pack. Mirror of functions/src/chat-quota-core.ts. */
export const CREDIT_PACK_SIZE = 50;

/** Whether the web Moyasar checkout can run in this runtime. */
export function canCheckout(): boolean {
  return isFirebaseConfigured() && !isNative();
}

/** Shared guards for every billing entry point: native routes to store IAP,
 * everything else requires a configured + signed-in web session. */
async function requireCheckoutReady(): Promise<void> {
  if (billingChannel() === 'revenuecat' || isNative()) {
    // RevenueCat IAP is wired in the native shell (Batch: native IAP).
    throw new Error('native-billing');
  }
  if (!isFirebaseConfigured()) throw new Error('billing-unavailable');

  const auth = await getFirebaseAuth();
  if (!auth?.currentUser) throw new Error('sign-in-required');
}

/**
 * Begin Pro (or the discounted student rate / Exam Season Pass / a credit pack)
 * checkout. On web: requires a signed-in user, then navigates to `/checkout` with
 * the kind/cadence/ref carried as query params — the checkout page fetches the
 * actual price server-side (createCheckoutConfig) before mounting the widget. On
 * native: IAP is handled by RevenueCat in the shell, so this throws
 * `native-billing` for the caller to route into the native flow.
 */
export async function startProCheckout(
  plan: ProPlan = 'annual',
  opts?: { annual?: boolean; ref?: string },
): Promise<void> {
  await requireCheckoutReady();
  const kind = plan === 'monthly' || plan === 'annual' ? 'pro' : plan;
  const cadence =
    kind === 'pro' ? plan : kind === 'student' ? (opts?.annual ? 'annual' : 'monthly') : undefined;
  const qs = new URLSearchParams({ kind });
  if (cadence) qs.set('cadence', cadence);
  if (opts?.ref) qs.set('ref', opts.ref);
  window.location.assign(`/checkout?${qs.toString()}`);
}

/**
 * Begin a one-time exam-prep pack purchase. Same guards + flow as
 * {@link startProCheckout} (web-only; native routes through store IAP), navigating
 * to `/checkout` with the pack id the server re-validates against the sellable list.
 */
export async function startPackCheckout(packId: string, opts?: { ref?: string }): Promise<void> {
  await requireCheckoutReady();
  const qs = new URLSearchParams({ kind: 'pack', packId });
  if (opts?.ref) qs.set('ref', opts.ref);
  window.location.assign(`/checkout?${qs.toString()}`);
}

/**
 * Turn off the auto-renewal engine for a Pro/student subscriber — Moyasar has no
 * hosted billing portal, so "manage subscription" is this callable plus the
 * account page's own renewal/card-on-file display. The plan stays active until its
 * already-granted `expiresAt`; it just won't be recharged. Throws the same stable
 * error codes as {@link startProCheckout}.
 */
export async function cancelAutoRenew(): Promise<void> {
  await requireCheckoutReady();
  const fns = await getFns();
  if (!fns) throw new Error('billing-unavailable');
  const { httpsCallable } = await import('firebase/functions');
  const cancel = httpsCallable<Record<string, never>, { ok?: boolean }>(fns, 'cancelAutoRenew');
  await cancel({});
}
