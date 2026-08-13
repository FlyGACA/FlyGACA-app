import { describe, expect, it, afterEach, beforeEach, vi } from 'vitest';
import { screen, cleanup, waitFor } from '@testing-library/react';
import i18n from '@/i18n';
import { renderWithRouter } from '../helpers/render';
import { Checkout } from '@/pages/checkout/Checkout';

/**
 * The client half of the money path, which had no coverage at all while both of its
 * legs were reading auth before it had restored.
 *
 * The load-bearing case is `getReadyAuth`: checkout is always entered by a full
 * document load (`billing.ts` uses `window.location.assign`), so `currentUser` is
 * still null for the first few ms. Reading it too early showed a signed-in buyer
 * "Sign in to check out." on the start leg, and on the return leg fired
 * `confirmPayment` with no ID token — an error screen after a real charge. These
 * tests pin the ordering by resolving auth-readiness only after a tick, with
 * `currentUser` populated at that point and not before.
 */
const h = vi.hoisted(() => ({
  /** null → unconfigured build; otherwise the auth object getReadyAuth resolves to. */
  auth: null as { currentUser: unknown; authStateReady: () => Promise<void> } | null,
  fns: {} as Record<string, unknown> | null,
  confirmResult: { data: { redirectTo: '/account?checkout=success' } } as {
    data?: { redirectTo?: string };
  },
  confirmError: null as Error | null,
  confirmCalls: 0,
  createConfigCalls: 0,
  createConfigError: null as Error | null,
}));

/**
 * Both accessors are stubbed, and the difference between them is the point: the
 * mocked `getFirebaseAuth` hands back auth with `currentUser` still null (what the
 * real SDK does on a cold load), while `getReadyAuth` awaits `authStateReady()` first,
 * mirroring the real implementation in `src/lib/services/firebase.ts`. So a regression
 * that reverts Checkout to `getFirebaseAuth` fails these tests rather than passing
 * them by accident.
 */
vi.mock('@/lib/services/firebase', () => ({
  getFirebaseAuth: () => Promise.resolve(h.auth),
  getReadyAuth: async () => {
    if (!h.auth) return null;
    await h.auth.authStateReady();
    return h.auth;
  },
  getFns: () => Promise.resolve(h.fns),
}));

vi.mock('firebase/functions', () => ({
  httpsCallable: (_fns: unknown, name: string) => () => {
    if (name === 'confirmPayment') {
      h.confirmCalls += 1;
      if (h.confirmError) return Promise.reject(h.confirmError);
      return Promise.resolve(h.confirmResult);
    }
    h.createConfigCalls += 1;
    if (h.createConfigError) return Promise.reject(h.createConfigError);
    return Promise.resolve({ data: { checkoutId: 'co_1', amount: 100, currency: 'SAR' } });
  },
  connectFunctionsEmulator: () => undefined,
}));

/**
 * An auth whose session restores asynchronously, exactly like the real SDK:
 * `currentUser` is null until `authStateReady()` settles.
 */
function lateRestoringAuth(user: unknown) {
  const auth = {
    currentUser: null as unknown,
    authStateReady: () =>
      new Promise<void>((resolve) => {
        setTimeout(() => {
          auth.currentUser = user;
          resolve();
        }, 0);
      }),
  };
  return auth;
}

beforeEach(() => {
  h.auth = lateRestoringAuth({ uid: 'u1' });
  h.fns = {};
  h.confirmResult = { data: { redirectTo: '/account?checkout=success' } };
  h.confirmError = null;
  h.confirmCalls = 0;
  h.createConfigCalls = 0;
  h.createConfigError = null;
  vi.stubEnv('VITE_MOYASAR_PUBLISHABLE_KEY', 'pk_test_dummy');
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  void i18n.changeLanguage('en');
});

describe('<Checkout /> start leg', () => {
  it('does not demand sign-in from a user whose session is still restoring', async () => {
    renderWithRouter(<Checkout />, { route: '/checkout?kind=pass' });

    // Reaching createCheckoutConfig is the proof the auth gate was cleared — the widget
    // itself never mounts here (no CDN in jsdom), so "Preparing…" is not the signal.
    await waitFor(() => expect(h.createConfigCalls).toBe(1));
    expect(screen.queryByText('Sign in to check out.')).toBeNull();
  });

  it('still demands sign-in when the session really is signed out', async () => {
    h.auth = lateRestoringAuth(null);
    renderWithRouter(<Checkout />, { route: '/checkout?kind=pass' });

    expect(await screen.findByText('Sign in to check out.')).toBeInTheDocument();
  });

  it('says billing is unavailable — not "sign in" — when Firebase is unconfigured', async () => {
    // The local/preview build has no Firebase, so getReadyAuth resolves null. Sending
    // that user to a sign-in that does not exist is a dead end; this is the distinction
    // billing.ts's requireCheckoutReady already makes.
    h.auth = null;
    renderWithRouter(<Checkout />, { route: '/checkout?kind=pass' });

    expect(await screen.findByText("Billing isn't connected in this build.")).toBeInTheDocument();
    expect(screen.queryByText('Sign in to check out.')).toBeNull();
  });

  it('reports billing-unavailable when the publishable key is missing from the build', async () => {
    vi.stubEnv('VITE_MOYASAR_PUBLISHABLE_KEY', '');
    renderWithRouter(<Checkout />, { route: '/checkout?kind=pass' });

    expect(await screen.findByText("Billing isn't connected in this build.")).toBeInTheDocument();
  });

  it('maps a server error code onto its translated checkout copy', async () => {
    h.createConfigError = new Error('unknown-pack');
    renderWithRouter(<Checkout />, { route: '/checkout?kind=pack&packId=nope' });

    expect(await screen.findByText("That pack isn't available for purchase.")).toBeInTheDocument();
  });
});

describe('<Checkout /> return leg', () => {
  it('waits for auth to restore before confirming, then follows the server redirect', async () => {
    renderWithRouter(<Checkout />, { route: '/checkout/return?id=pay_1' });

    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent('/account?checkout=success'),
    );
    expect(h.confirmCalls).toBe(1);
  });

  it('never calls confirmPayment unauthenticated — it explains the charge landed instead', async () => {
    h.auth = lateRestoringAuth(null);
    renderWithRouter(<Checkout />, { route: '/checkout/return?id=pay_1' });

    expect(
      await screen.findByText(
        'Your payment was received. Sign in with the same account to activate it.',
      ),
    ).toBeInTheDocument();
    // The important half: no token-less call that would 'unauthenticated' server-side.
    expect(h.confirmCalls).toBe(0);
    // And it must not read as a failed payment.
    expect(screen.queryByText('Confirming your payment…')).toBeNull();
    expect(screen.getByRole('button', { name: 'Go to my account' })).toBeInTheDocument();
  });

  it('surfaces the server payment-not-recognized code with its own copy', async () => {
    h.confirmError = new Error('payment-not-recognized');
    renderWithRouter(<Checkout />, { route: '/checkout/return?id=pay_1' });

    expect(
      await screen.findByText(/couldn't match this payment to your order/i),
    ).toBeInTheDocument();
  });
});
