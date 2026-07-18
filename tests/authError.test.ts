import { describe, expect, it } from 'vitest';
import { authErrorInfo, isAuthDismiss } from '../src/calc/authError';

describe('authErrorInfo', () => {
  it('routes credential errors to the password field', () => {
    expect(authErrorInfo('auth/wrong-password').field).toBe('password');
    expect(authErrorInfo('auth/invalid-credential')).toEqual({
      field: 'password',
      key: 'account.errors.wrongPassword',
    });
    expect(authErrorInfo('auth/weak-password').field).toBe('password');
  });

  it('routes email errors to the email field', () => {
    expect(authErrorInfo('auth/invalid-email').field).toBe('email');
    expect(authErrorInfo('auth/user-not-found').field).toBe('email');
    expect(authErrorInfo('auth/email-already-in-use').key).toBe('account.errors.emailInUse');
  });

  it('routes rate-limit and network errors to the general line', () => {
    expect(authErrorInfo('auth/too-many-requests').field).toBe('general');
    expect(authErrorInfo('auth/network-request-failed').field).toBe('general');
  });

  it('routes deployment/config errors to the general line with their own message', () => {
    expect(authErrorInfo('auth/operation-not-allowed')).toEqual({
      field: 'general',
      key: 'account.errors.providerDisabled',
    });
    expect(authErrorInfo('auth/unauthorized-domain')).toEqual({
      field: 'general',
      key: 'account.errors.unauthorizedDomain',
    });
    expect(authErrorInfo('auth/api-key-not-valid').key).toBe('account.errors.config');
    expect(authErrorInfo('auth/invalid-api-key').key).toBe('account.errors.config');
    expect(authErrorInfo('auth/firebase-app-check-token-is-invalid').key).toBe(
      'account.errors.config',
    );
  });

  it('folds the URL-embedded referrer-blocked code onto unauthorized-domain', () => {
    expect(authErrorInfo('auth/requests-from-referer-are-blocked')).toEqual({
      field: 'general',
      key: 'account.errors.unauthorizedDomain',
    });
    expect(
      authErrorInfo('auth/requests-from-referer-https://preview.vercel.app-are-blocked'),
    ).toEqual({ field: 'general', key: 'account.errors.unauthorizedDomain' });
  });

  it('maps the newer opaque credential and disabled-account codes', () => {
    expect(authErrorInfo('auth/invalid-login-credentials').key).toBe('account.errors.wrongPassword');
    expect(authErrorInfo('auth/missing-password')).toEqual({
      field: 'password',
      key: 'account.errors.missingPassword',
    });
    expect(authErrorInfo('auth/user-disabled')).toEqual({
      field: 'email',
      key: 'account.errors.userDisabled',
    });
  });

  it('routes a blocked (not dismissed) popup to the general line', () => {
    expect(authErrorInfo('auth/popup-blocked')).toEqual({
      field: 'general',
      key: 'account.errors.popupBlocked',
    });
  });

  it('falls back to a general message for unknown or missing codes', () => {
    const fallback = { field: 'general', key: 'account.authError' };
    expect(authErrorInfo('auth/something-new')).toEqual(fallback);
    expect(authErrorInfo(undefined)).toEqual(fallback);
    expect(authErrorInfo('')).toEqual(fallback);
  });
});

describe('isAuthDismiss', () => {
  it('flags user-dismissed popup codes', () => {
    expect(isAuthDismiss('auth/popup-closed-by-user')).toBe(true);
    expect(isAuthDismiss('auth/cancelled-popup-request')).toBe(true);
    expect(isAuthDismiss('auth/user-cancelled')).toBe(true);
  });

  it('does not flag a genuinely blocked popup or other errors', () => {
    expect(isAuthDismiss('auth/popup-blocked')).toBe(false);
    expect(isAuthDismiss('auth/wrong-password')).toBe(false);
    expect(isAuthDismiss(undefined)).toBe(false);
    expect(isAuthDismiss('')).toBe(false);
  });
});
