import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Branch coverage for the billing flows. `startProCheckout`/`startPackCheckout`
 * never call a Cloud Function directly any more — they just navigate to the
 * in-app `/checkout` route (which does the pricing + widget-mount work); this
 * file proves the guard branches ('native-billing' · 'sign-in-required' ·
 * 'billing-unavailable') and the exact query string each variant produces.
 * `cancelAutoRenew` is the one function here that still calls a callable.
 * The config-off case for `canCheckout` lives in billing.test.ts.
 */
const h = vi.hoisted(() => ({
  configured: true,
  native: false,
  channel: 'moyasar' as 'moyasar' | 'revenuecat',
  currentUser: null as Record<string, unknown> | null,
  fns: {} as Record<string, unknown> | null,
  result: { data: { ok: true } } as { data?: Record<string, unknown> },
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
// location for a stub (restored in afterEach) to capture the navigation target.
const origLocation = window.location;
function stubAssign(): ReturnType<typeof vi.fn> {
  const assign = vi.fn();
  Object.defineProperty(window, 'location', { configurable: true, value: { assign } });
  return assign;
}

beforeEach(() => {
  h.configured = true;
  h.native = false;
  h.channel = 'moyasar';
  h.currentUser = null;
  h.fns = {};
  h.result = { data: { ok: true } };
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

  it('reports billing-unavailable when Firebase is not configured', async () => {
    h.configured = false;
    await expect((await load()).startProCheckout()).rejects.toThrow('billing-unavailable');
  });

  it('navigates to /checkout with kind=pro and the cadence for monthly/annual', async () => {
    h.currentUser = { uid: 'u1' };
    let assign = stubAssign();
    await (await load()).startProCheckout('monthly');
    expect(assign).toHaveBeenCalledWith('/checkout?kind=pro&cadence=monthly');

    assign = stubAssign();
    await (await load()).startProCheckout('annual');
    expect(assign).toHaveBeenCalledWith('/checkout?kind=pro&cadence=annual');
  });

  it('navigates to /checkout with kind=student and the cadence from opts.annual', async () => {
    h.currentUser = { uid: 'u1' };
    let assign = stubAssign();
    await (await load()).startProCheckout('student');
    expect(assign).toHaveBeenCalledWith('/checkout?kind=student&cadence=monthly');

    assign = stubAssign();
    await (await load()).startProCheckout('student', { annual: true });
    expect(assign).toHaveBeenCalledWith('/checkout?kind=student&cadence=annual');
  });

  it('navigates to /checkout with kind=pass / kind=credits and no cadence', async () => {
    h.currentUser = { uid: 'u1' };
    let assign = stubAssign();
    await (await load()).startProCheckout('pass');
    expect(assign).toHaveBeenCalledWith('/checkout?kind=pass');

    assign = stubAssign();
    await (await load()).startProCheckout('credits');
    expect(assign).toHaveBeenCalledWith('/checkout?kind=credits');
  });

  it('carries a referral code as ?ref=', async () => {
    h.currentUser = { uid: 'u1' };
    const assign = stubAssign();
    await (await load()).startProCheckout('annual', { ref: 'ABCD2345' });
    expect(assign).toHaveBeenCalledWith('/checkout?kind=pro&cadence=annual&ref=ABCD2345');
  });
});

describe('startPackCheckout', () => {
  it('routes to native and requires sign-in just like Pro checkout', async () => {
    h.native = true;
    await expect((await load()).startPackCheckout('medical')).rejects.toThrow('native-billing');

    h.native = false;
    h.currentUser = null;
    await expect((await load()).startPackCheckout('medical')).rejects.toThrow('sign-in-required');
  });

  it('navigates to /checkout with kind=pack and the pack id', async () => {
    h.currentUser = { uid: 'u1' };
    const assign = stubAssign();
    await (await load()).startPackCheckout('medical', { ref: 'ABCD2345' });
    expect(assign).toHaveBeenCalledWith('/checkout?kind=pack&packId=medical&ref=ABCD2345');
  });
});

describe('cancelAutoRenew', () => {
  it('routes to native and requires sign-in just like checkout', async () => {
    h.native = true;
    await expect((await load()).cancelAutoRenew()).rejects.toThrow('native-billing');

    h.native = false;
    h.currentUser = null;
    await expect((await load()).cancelAutoRenew()).rejects.toThrow('sign-in-required');
  });

  it('reports billing-unavailable when the functions client is missing', async () => {
    h.currentUser = { uid: 'u1' };
    h.fns = null;
    await expect((await load()).cancelAutoRenew()).rejects.toThrow('billing-unavailable');
  });

  it('calls the cancelAutoRenew callable', async () => {
    h.currentUser = { uid: 'u1' };
    await (await load()).cancelAutoRenew();
    expect(h.lastCallable).toBe('cancelAutoRenew');
  });
});

afterEach(() => {
  Object.defineProperty(window, 'location', { configurable: true, value: origLocation });
  vi.restoreAllMocks();
});
