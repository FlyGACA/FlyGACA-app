import { describe, expect, it } from 'vitest';
import { authErrorInfo, isDomainAuthError } from '@/calc/authError';

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

  it('routes popup failures to the general line with the popup-blocked message', () => {
    expect(authErrorInfo('auth/popup-blocked')).toEqual({
      field: 'general',
      key: 'account.errors.popupBlocked',
    });
    expect(authErrorInfo('auth/popup-closed-by-user').key).toBe('account.errors.popupBlocked');
    expect(authErrorInfo('auth/cancelled-popup-request').key).toBe('account.errors.popupBlocked');
  });

  it('routes unsupported-environment and internal errors to the config line', () => {
    expect(authErrorInfo('auth/operation-not-supported-in-this-environment').key).toBe(
      'account.errors.config',
    );
    expect(authErrorInfo('auth/internal-error').key).toBe('account.errors.config');
    expect(authErrorInfo('auth/missing-app-check-token').key).toBe('account.errors.config');
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

  it('flags domain/config failures whose remedy is the authorized main site', () => {
    expect(isDomainAuthError('auth/unauthorized-domain')).toBe(true);
    expect(isDomainAuthError('auth/requests-from-referer-are-blocked')).toBe(true);
    expect(
      isDomainAuthError('auth/requests-from-referer-https://preview.vercel.app-are-blocked'),
    ).toBe(true);
    expect(isDomainAuthError('auth/api-key-not-valid')).toBe(true);
    expect(isDomainAuthError('auth/missing-app-check-token')).toBe(true);
  });

  it('does not flag credential, provider-disabled, popup, or unknown errors as domain issues', () => {
    expect(isDomainAuthError('auth/wrong-password')).toBe(false);
    expect(isDomainAuthError('auth/invalid-email')).toBe(false);
    expect(isDomainAuthError('auth/operation-not-allowed')).toBe(false);
    expect(isDomainAuthError('auth/popup-blocked')).toBe(false);
    expect(isDomainAuthError('auth/something-new')).toBe(false);
    expect(isDomainAuthError(undefined)).toBe(false);
  });

  it('falls back to a general message for unknown or missing codes', () => {
    const fallback = { field: 'general', key: 'account.authError' };
    expect(authErrorInfo('auth/something-new')).toEqual(fallback);
    expect(authErrorInfo(undefined)).toEqual(fallback);
    expect(authErrorInfo('')).toEqual(fallback);
  });
});
