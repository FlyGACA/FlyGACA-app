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
  // Deployment/config failures — these have nothing to do with the user's
  // credentials, so they must NOT read as "check your details". They typically
  // surface on an unauthorized origin (e.g. a preview domain not registered in
  // Firebase Auth authorized domains / the reCAPTCHA Enterprise key / the API
  // key's HTTP-referrer allowlist). See docs/RUNBOOK-firebase.md.
  'auth/operation-not-allowed': { field: 'general', key: 'account.errors.providerDisabled' },
  'auth/unauthorized-domain': { field: 'general', key: 'account.errors.unauthorizedDomain' },
  'auth/requests-from-referer-are-blocked': {
    field: 'general',
    key: 'account.errors.unauthorizedDomain',
  },
  'auth/api-key-not-valid': { field: 'general', key: 'account.errors.config' },
  'auth/invalid-api-key': { field: 'general', key: 'account.errors.config' },
  'auth/firebase-app-check-token-is-invalid': { field: 'general', key: 'account.errors.config' },
};

export function authErrorInfo(code: string | undefined | null): AuthErrorInfo {
  if (!code) return { field: 'general', key: 'account.authError' };
  if (MAP[code]) return MAP[code];
  // The referrer-blocked code embeds the offending URL, e.g.
  // `auth/requests-from-referer-https://…-are-blocked`, so it never matches the
  // exact key above — fold every variant onto the unauthorized-domain message.
  if (code.startsWith('auth/requests-from-referer')) {
    return { field: 'general', key: 'account.errors.unauthorizedDomain' };
  }
  return { field: 'general', key: 'account.authError' };
}
