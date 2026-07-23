import { describe, expect, it } from 'vitest';
import { canCheckout, startProCheckout } from '@/lib/billing';
import { FUNCTIONS_REGION } from '@/lib/firebase';

// The billing callables (createCheckoutSession / createBillingPortalSession)
// deploy to me-central1 (functions/src/region.ts is the source of truth). The
// httpsCallable client region MUST match or checkout 404s in production.
describe('callable region', () => {
  it('targets me-central1 where the billing functions live', () => {
    expect(FUNCTIONS_REGION).toBe('me-central1');
  });
});

// No Firebase config in tests → billing is unavailable and never reaches a
// network call; the web build keeps the CTA disabled via canCheckout().
describe('billing without config', () => {
  it('cannot check out', () => {
    expect(canCheckout()).toBe(false);
  });

  it('throws billing-unavailable instead of calling a missing function', async () => {
    await expect(startProCheckout('annual')).rejects.toThrow('billing-unavailable');
  });
});
