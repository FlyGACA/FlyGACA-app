/**
 * Maps a Firebase Auth error code to the form field it belongs to and the i18n
 * key for its message. Pure (no DOM / no Firebase import) so the sign-in form can
 * show inline, field-level errors instead of one generic line — and so the
 * mapping is unit-testable. Unknown codes fall back to a general message.
 */

export type AuthField = 'email' | 'password' | 'general';

export interface AuthErrorInfo {
  field: AuthField;
  key: string;
}

const MAP: Record<string, AuthErrorInfo> = {
  'auth/invalid-email': { field: 'email', key: 'account.errors.invalidEmail' },
  'auth/user-not-found': { field: 'email', key: 'account.errors.userNotFound' },
  'auth/email-already-in-use': { field: 'email', key: 'account.errors.emailInUse' },
  'auth/wrong-password': { field: 'password', key: 'account.errors.wrongPassword' },
  // Newer Firebase returns a single opaque code for a bad email/password pair.
  'auth/invalid-credential': { field: 'password', key: 'account.errors.wrongPassword' },
  'auth/weak-password': { field: 'password', key: 'account.errors.weakPassword' },
  'auth/too-many-requests': { field: 'general', key: 'account.errors.tooManyRequests' },
  'auth/network-request-failed': { field: 'general', key: 'account.errors.network' },
};

export function authErrorInfo(code: string | undefined | null): AuthErrorInfo {
  return (code && MAP[code]) || { field: 'general', key: 'account.authError' };
}
