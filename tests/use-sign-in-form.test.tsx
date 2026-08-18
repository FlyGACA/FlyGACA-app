import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { AUTH_TIMEOUT_MS, useSignInForm } from '@/hooks/useSignInForm';
import {
  consumeRedirectFailure,
  registerWithEmail,
  sendPasswordReset,
  signInWithEmail,
  signInWithGoogle,
} from '@/lib/services/auth';
import { isMirrorHost } from '@/lib/seo/seo';

vi.mock('@/lib/services/auth', () => ({
  signInWithEmail: vi.fn(),
  registerWithEmail: vi.fn(),
  signInWithGoogle: vi.fn(),
  sendPasswordReset: vi.fn(),
  consumeRedirectFailure: vi.fn(() => false),
}));
vi.mock('@/lib/seo/seo', () => ({
  SITE_ORIGIN: 'https://flygaca.com',
  isMirrorHost: vi.fn(() => false),
}));

/** Reject the mocked Google sign-in with a Firebase-shaped error code. */
function rejectGoogle(code: string) {
  vi.mocked(signInWithGoogle).mockRejectedValueOnce({ code });
}

/**
 * The hook reads `?mode=`/`?redirect=` and navigates, so every render needs a
 * router. `at` seeds the URL for the mode/redirect cases.
 */
function renderSignInForm(at = '/account') {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[at]}>{children}</MemoryRouter>
  );
  return renderHook(() => useSignInForm(), { wrapper });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(isMirrorHost).mockReturnValue(false);
  vi.mocked(consumeRedirectFailure).mockReturnValue(false);
});
afterEach(cleanup);

describe('useSignInForm', () => {
  it('runs Google sign-in and clears busy with no error on success', async () => {
    vi.mocked(signInWithGoogle).mockResolvedValueOnce(undefined as never);
    const { result } = renderSignInForm();
    await act(async () => {
      result.current.runGoogle();
    });
    expect(signInWithGoogle).toHaveBeenCalled();
    expect(result.current.busy).toBe(false);
    expect(result.current.errors.general).toBeUndefined();
  });

  it('surfaces a timeout error and clears busy when a non-interactive call never settles', async () => {
    vi.useFakeTimers();
    // The App Check / reCAPTCHA hang: the SDK promise never resolves or rejects.
    vi.mocked(signInWithEmail).mockReturnValueOnce(new Promise(() => {}));
    const { result } = renderSignInForm();
    act(() => {
      result.current.loginForm.setFieldValue('email', 'you@example.com');
      result.current.loginForm.setFieldValue('password', 'secret');
    });
    await act(async () => {
      void result.current.loginForm.handleSubmit();
    });
    expect(result.current.busy).toBe(true);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(AUTH_TIMEOUT_MS);
    });
    expect(result.current.busy).toBe(false);
    expect(result.current.errors.general).toBeTruthy();
    vi.useRealTimers();
  });

  it('never times out the Google popup — the clock would be timing the user', async () => {
    vi.useFakeTimers();
    // A real account chooser + password + 2FA easily outlives the watchdog.
    vi.mocked(signInWithGoogle).mockReturnValueOnce(new Promise(() => {}));
    const { result } = renderSignInForm();
    act(() => {
      result.current.runGoogle();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(AUTH_TIMEOUT_MS * 3);
    });
    expect(result.current.busy).toBe(true);
    expect(result.current.errors.general).toBeUndefined();
    vi.useRealTimers();
  });

  it('reports a redirect that came back without a session', async () => {
    vi.mocked(consumeRedirectFailure).mockReturnValue(true);
    const { result } = renderSignInForm();
    await waitFor(() => expect(result.current.errors.general).toBeTruthy());
    expect(result.current.errors.general).toContain('auth/redirect-no-result');
  });

  it('bails silently when the user dismisses the popup', async () => {
    rejectGoogle('auth/popup-closed-by-user');
    const { result } = renderSignInForm();
    await act(async () => {
      result.current.runGoogle();
    });
    expect(result.current.errors.general).toBeUndefined();
    expect(result.current.busy).toBe(false);
  });

  it('surfaces a general error (and logs) for an unknown code', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    rejectGoogle('auth/something-unmapped');
    const { result } = renderSignInForm();
    await act(async () => {
      result.current.runGoogle();
    });
    expect(result.current.errors.general).toBeTruthy();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('routes a field-mapped code to that field, not the general band', async () => {
    rejectGoogle('auth/user-not-found'); // maps to the email field
    const { result } = renderSignInForm();
    await act(async () => {
      result.current.runGoogle();
    });
    expect(result.current.errors.email).toBeTruthy();
    expect(result.current.errors.general).toBeUndefined();
  });

  it('offers the main-site link only on a domain error from a mirror host', async () => {
    vi.mocked(isMirrorHost).mockReturnValue(true);
    rejectGoogle('auth/unauthorized-domain');
    const { result } = renderSignInForm();
    await act(async () => {
      result.current.runGoogle();
    });
    expect(result.current.mainSiteHref).toMatch(/^https:\/\/flygaca\.com/);
    expect(result.current.errors.general).toBeTruthy();
  });

  it('does not offer the main-site link on a non-mirror host', async () => {
    vi.mocked(isMirrorHost).mockReturnValue(false);
    rejectGoogle('auth/unauthorized-domain');
    const { result } = renderSignInForm();
    await act(async () => {
      result.current.runGoogle();
    });
    expect(result.current.mainSiteHref).toBeNull();
  });

  it('derives the mode from ?mode= so /signup and the tabs are addressable', () => {
    expect(renderSignInForm('/account').result.current.mode).toBe('in');
    cleanup();
    expect(renderSignInForm('/account?mode=up').result.current.mode).toBe('up');
  });

  it('toggleMode rewrites ?mode= rather than holding it in state', async () => {
    const { result } = renderSignInForm('/account');
    act(() => result.current.toggleMode());
    await waitFor(() => expect(result.current.mode).toBe('up'));
    act(() => result.current.toggleMode());
    await waitFor(() => expect(result.current.mode).toBe('in'));
  });

  it('forgotPassword needs an email first, then sends the reset', async () => {
    const { result } = renderSignInForm();

    // No email entered → a field error, no reset call.
    act(() => result.current.forgotPassword());
    expect(sendPasswordReset).not.toHaveBeenCalled();
    expect(result.current.loginForm.errors.email).toBeTruthy();

    // With an email → the reset is sent and a notice shown.
    vi.mocked(sendPasswordReset).mockResolvedValueOnce(undefined as never);
    act(() => result.current.loginForm.setFieldValue('email', 'you@example.com'));
    await act(async () => {
      result.current.forgotPassword();
    });
    expect(sendPasswordReset).toHaveBeenCalledWith('you@example.com');
    await waitFor(() => expect(result.current.notice).toBeTruthy());
  });

  it('submits a valid sign-in to signInWithEmail', async () => {
    vi.mocked(signInWithEmail).mockResolvedValueOnce(undefined as never);
    const { result } = renderSignInForm();
    act(() => {
      result.current.loginForm.setFieldValue('email', 'you@example.com');
      result.current.loginForm.setFieldValue('password', 'secret');
    });
    await act(async () => {
      await result.current.loginForm.handleSubmit();
    });
    expect(signInWithEmail).toHaveBeenCalledWith('you@example.com', 'secret');
  });

  it('submits a valid sign-up to registerWithEmail (trimmed name)', async () => {
    vi.mocked(registerWithEmail).mockResolvedValueOnce(undefined as never);
    const { result } = renderSignInForm();
    act(() => {
      result.current.signupForm.setFieldValue('name', ' Sam ');
      result.current.signupForm.setFieldValue('email', 'sam@example.com');
      result.current.signupForm.setFieldValue('password', 'Abcdef1!');
      result.current.signupForm.setFieldValue('confirmPassword', 'Abcdef1!');
    });
    await act(async () => {
      await result.current.signupForm.handleSubmit();
    });
    expect(registerWithEmail).toHaveBeenCalledWith('sam@example.com', 'Abcdef1!', 'Sam');
  });

  it('blocks a weak-password sign-up and a mismatched confirm before submitting', async () => {
    const { result } = renderSignInForm();
    act(() => {
      result.current.signupForm.setFieldValue('name', 'Sam');
      result.current.signupForm.setFieldValue('email', 'sam@example.com');
      result.current.signupForm.setFieldValue('password', 'weakpass');
      result.current.signupForm.setFieldValue('confirmPassword', 'different');
    });
    await act(async () => {
      await result.current.signupForm.handleSubmit();
    });
    expect(result.current.signupForm.errors.password).toBeTruthy();
    expect(result.current.signupForm.errors.confirmPassword).toBeTruthy();
    expect(registerWithEmail).not.toHaveBeenCalled();
  });
});
