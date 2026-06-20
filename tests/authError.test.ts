import { describe, expect, it } from 'vitest';
import { authErrorInfo } from '../src/calc/authError';

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

  it('falls back to a general message for unknown or missing codes', () => {
    const fallback = { field: 'general', key: 'account.authError' };
    expect(authErrorInfo('auth/something-new')).toEqual(fallback);
    expect(authErrorInfo(undefined)).toEqual(fallback);
    expect(authErrorInfo('')).toEqual(fallback);
  });
});
