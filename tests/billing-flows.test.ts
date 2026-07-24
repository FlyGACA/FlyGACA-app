import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Branch coverage for the billing flows. The happy path and the deeper error
 * codes ('native-billing' · 'sign-in-required' · 'no-url' · success redirect)
 * are reached by mocking the runtime split (native-bridge), the Firebase gate
 * (firebase), and the callable layer (firebase/functions). The config-off case
 * lives in billing.test.ts; this file drives the configured paths.
 */
const h = vi.hoisted(() => ({
  configured: true,
  native: false,
  channel: 'stripe' as 'stripe' | 'revenuecat',
  currentUser: null as Record<string, unknown> | null,
  fns: {} as Record<string, unknown> | null,
  result: { data: { url: 'https://stripe.test/session' } } as { data?: { url?: string } },
  lastCallable: null as string | null,
  lastArg: null as unknown,
}));

vi.mock('@/lib/native/nativeBridge', () => ({
  isNative: () => h.native,
  billingChannel: () => h.channel,
}));

vi.mock('@/lib/services/firebase', () => ({
  isFirebaseConfigured: () => h.configured,
  getFirebaseAuth: () => Promise.resolve({ currentUser: h.currentUser }),
  getFns: () => Promise.resolve(h.fns),
}));

vi.mock('firebase/functions', () => ({
  httpsCallable: (_fns: unknown, name: string) => {
    h.lastCallable = name;
    return (arg: unknown) => {
      h.lastArg = arg;
      return Promise.resolve(h.result);
    };
  },
}));

type BillingModule = typeof import('@/lib/services/billing');
async function load(): Promise<BillingModule> {
  vi.resetModules();
  return import('@/lib/services/billing');
}

// jsdom's window.location.assign is non-configurable, so swap the whole
// location for a stub (restored in afterEach) to capture the redirect target.
const origLocation = window.location;
function stubAssign(): ReturnType<typeof vi.fn> {
  const assign = vi.fn();
  Object.defineProperty(window, 'location', { configurable: true, value: { assign } });
  return assign;
}

beforeEach(() => {
  h.configured = true;
  h.native = false;
  h.channel = 'stripe';
  h.currentUser = null;
  h.fns = {};
  h.result = { data: { url: 'https://stripe.test/session' } };
  h.lastCallable = null;
  h.lastArg = null;
});

describe('canCheckout', () => {
  it('is true only when Firebase is configured and not native', async () => {
    const b = await load();
    expect(b.canCheckout()).toBe(true);

    h.native = true;
    expect((await load()).canCheckout()).toBe(false);

    h.native = false;
    h.configured = false;
    expect((await load()).canCheckout()).toBe(false);
  });
});

describe('startProCheckout', () => {
  it('routes to native IAP when the billing channel is RevenueCat', async () => {
    h.channel = 'revenuecat';
    await expect((await load()).startProCheckout('annual')).rejects.toThrow('native-billing');
  });

  it('routes to native IAP inside the native shell', async () => {
    h.native = true;
    await expect((await load()).startProCheckout()).rejects.toThrow('native-billing');
  });

  it('requires a signed-in user on web', async () => {
    h.currentUser = null;
    await expect((await load()).startProCheckout()).rejects.toThrow('sign-in-required');
  });

  it('reports billing-unavailable when the functions client is missing', async () => {
    h.currentUser = { uid: 'u1' };
    h.fns = null;
    await expect((await load()).startProCheckout()).rejects.toThrow('billing-unavailable');
  });

  it('throws no-url when the checkout session has no redirect url', async () => {
    h.currentUser = { uid: 'u1' };
    h.result = { data: {} };
    await expect((await load()).startProCheckout()).rejects.toThrow('no-url');
  });

  it('calls createCheckoutSession with the plan and redirects to the Stripe url', async () => {
    h.currentUser = { uid: 'u1' };
    const assign = stubAssign();
    await (await load()).startProCheckout('student');
    expect(h.lastCallable).toBe('createCheckoutSession');
    expect(h.lastArg).toEqual({ plan: 'student' });
    expect(assign).toHaveBeenCalledWith('https://stripe.test/session');
  });
});

describe('startBillingPortal', () => {
  it('routes to native and requires sign-in just like checkout', async () => {
    h.native = true;
    await expect((await load()).startBillingPortal()).rejects.toThrow('native-billing');

    h.native = false;
    h.currentUser = null;
    await expect((await load()).startBillingPortal()).rejects.toThrow('sign-in-required');
  });

  it('opens the customer portal session url', async () => {
    h.currentUser = { uid: 'u1' };
    h.result = { data: { url: 'https://stripe.test/portal' } };
    const assign = stubAssign();
    await (await load()).startBillingPortal();
    expect(h.lastCallable).toBe('createBillingPortalSession');
    expect(assign).toHaveBeenCalledWith('https://stripe.test/portal');
  });
});

afterEach(() => {
  Object.defineProperty(window, 'location', { configurable: true, value: origLocation });
  vi.restoreAllMocks();
});
