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

/**
 * Codes that mean "the user dismissed the sign-in popup themselves" — closing the
 * Google window or opening a second one. They are not failures, so the form should
 * clear its busy state silently rather than flash a scary error.
 */
const DISMISS_CODES = new Set([
  'auth/popup-closed-by-user',
  'auth/cancelled-popup-request',
  'auth/user-cancelled',
]);

/** Whether `code` is a user-dismissed popup rather than a real error to surface. */
export function isAuthDismiss(code: string | undefined | null): boolean {
  return !!code && DISMISS_CODES.has(code);
}

const MAP: Record<string, AuthErrorInfo> = {
  'auth/invalid-email': { field: 'email', key: 'account.errors.invalidEmail' },
  'auth/user-not-found': { field: 'email', key: 'account.errors.userNotFound' },
  'auth/email-already-in-use': { field: 'email', key: 'account.errors.emailInUse' },
  'auth/wrong-password': { field: 'password', key: 'account.errors.wrongPassword' },
  // Newer Firebase returns a single opaque code for a bad email/password pair.
  'auth/invalid-credential': { field: 'password', key: 'account.errors.wrongPassword' },
  'auth/invalid-login-credentials': { field: 'password', key: 'account.errors.wrongPassword' },
  'auth/missing-password': { field: 'password', key: 'account.errors.missingPassword' },
  'auth/weak-password': { field: 'password', key: 'account.errors.weakPassword' },
  'auth/user-disabled': { field: 'email', key: 'account.errors.userDisabled' },
  'auth/too-many-requests': { field: 'general', key: 'account.errors.tooManyRequests' },
  // The popup was blocked by the browser (not dismissed) — tell the user why.
  'auth/popup-blocked': { field: 'general', key: 'account.errors.popupBlocked' },
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
