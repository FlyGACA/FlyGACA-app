/**
 * Auth surface. Backed by Firebase Auth when configured (web popup / native
 * channel); a no-op when not — every method degrades gracefully so the
 * local-first account store (`account.ts`) keeps working without a backend.
 */
import type { User } from 'firebase/auth';
import { isNative } from './native-bridge';
import { isFirebaseConfigured, getFirebaseAuth } from './firebase';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  emailVerified: boolean;
}

/** Where sign-in is handled for the current runtime. */
export function authChannel(): 'native' | 'web' {
  return isNative() ? 'native' : 'web';
}

/** True when real Firebase auth is available (config present). */
export function isAuthAvailable(): boolean {
  return isFirebaseConfigured();
}

function mapUser(u: User): AuthUser {
  return {
    uid: u.uid,
    email: u.email,
    displayName: u.displayName,
    emailVerified: u.emailVerified,
  };
}

/** The Firebase ID token for the signed-in user, or null. Sent to /api/chat. */
export async function getIdToken(): Promise<string | null> {
  const auth = await getFirebaseAuth();
  return auth?.currentUser ? auth.currentUser.getIdToken() : null;
}

/** Subscribe to auth changes. Calls back with null immediately when unconfigured. */
export async function onAuthChange(cb: (user: AuthUser | null) => void): Promise<() => void> {
  const auth = await getFirebaseAuth();
  if (!auth) {
    cb(null);
    return () => {};
  }
  const { onAuthStateChanged } = await import('firebase/auth');
  const unsub = onAuthStateChanged(auth, (u) => cb(u ? mapUser(u) : null));
  // Resolve any pending Google redirect (mobile / native webview flow). Fire and
  // forget — onAuthStateChanged above will then emit the signed-in user.
  void completeRedirectSignIn(auth);
  return unsub;
}

function requireAuth(auth: Awaited<ReturnType<typeof getFirebaseAuth>>): NonNullable<typeof auth> {
  if (!auth) throw new Error('auth-unavailable');
  return auth;
}

function getSessionUrl(path: string): string {
  const base = typeof window !== 'undefined' ? window.location.origin : '';
  if (base && base.startsWith('http')) {
    return new URL(path, base).toString();
  }
  return path;
}

async function syncSession(user: User): Promise<void> {
  const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  const isTest = typeof proc !== 'undefined' && proc.env?.NODE_ENV === 'test';
  if (isTest) {
    return;
  }
  if (import.meta.env?.VITEST) {
    return;
  }
  try {
    const idToken = await user.getIdToken();
    await fetch(getSessionUrl('/api/auth/session-login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
  } catch (err) {
    console.error('Failed to sync session cookie with gateway:', err);
  }
}

/**
 * Popup failures that mean "this environment can't do a popup" — a blocked/closed
 * popup or a webview that doesn't support one. We retry these as a full-page
 * redirect rather than surfacing them as an error (in-app browsers and the
 * Capacitor native webview routinely block popups). A real config problem
 * (unauthorized domain, App Check) is NOT in this set, so it still surfaces.
 */
const POPUP_FALLBACK_CODES = new Set([
  'auth/popup-blocked',
  'auth/popup-closed-by-user',
  'auth/cancelled-popup-request',
  'auth/operation-not-supported-in-this-environment',
]);

/**
 * When a Google sign-in returns via `signInWithRedirect`, this resolves the
 * pending result on the next page load and syncs the session cookie. Best-effort:
 * no pending redirect (the common case) resolves to `null` and no-ops, and any
 * error is swallowed so bootstrap never breaks. Invoked once from `onAuthChange`.
 */
async function completeRedirectSignIn(
  auth: NonNullable<Awaited<ReturnType<typeof getFirebaseAuth>>>,
) {
  try {
    const { getRedirectResult } = await import('firebase/auth');
    const cred = await getRedirectResult(auth);
    if (cred?.user) await syncSession(cred.user);
  } catch (err) {
    console.error('Failed to complete Google redirect sign-in:', err);
  }
}

export async function signInWithGoogle(): Promise<AuthUser | null> {
  const isMock =
    import.meta.env.VITE_FIREBASE_API_KEY === 'mock-api-key' && !import.meta.env.VITEST;
  if (isMock) {
    const mockUser: AuthUser = {
      uid: 'mock-google-uid',
      email: 'google-user@flygaca.com',
      displayName: 'Mock Google Pilot',
      emailVerified: true,
    };
    const { signIn } = await import('./account');
    signIn(mockUser.email || '', mockUser.displayName || '');
    return mockUser;
  }
  const auth = requireAuth(await getFirebaseAuth());
  const { GoogleAuthProvider, signInWithPopup, signInWithRedirect } = await import('firebase/auth');
  const provider = new GoogleAuthProvider();

  // Native webviews (Capacitor) can't host the popup at all — go straight to the
  // redirect flow. The page navigates away and `completeRedirectSignIn` finishes
  // the sign-in on return, so this resolves to `null` here (no user to map yet).
  if (isNative()) {
    await signInWithRedirect(auth, provider);
    return null;
  }

  try {
    const cred = await signInWithPopup(auth, provider);
    await syncSession(cred.user);
    return mapUser(cred.user);
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code && POPUP_FALLBACK_CODES.has(code)) {
      // Popup unavailable in this browser — fall back to a full-page redirect.
      await signInWithRedirect(auth, provider);
      return null;
    }
    throw err;
  }
}

export async function signInWithEmail(email: string, password: string): Promise<AuthUser> {
  const isMock =
    import.meta.env.VITE_FIREBASE_API_KEY === 'mock-api-key' && !import.meta.env.VITEST;
  if (isMock) {
    const mockUser: AuthUser = {
      uid: 'mock-email-uid',
      email: email,
      displayName: email.split('@')[0],
      emailVerified: true,
    };
    const { signIn } = await import('./account');
    signIn(mockUser.email || '', mockUser.displayName || '');
    return mockUser;
  }
  const auth = requireAuth(await getFirebaseAuth());
  const { signInWithEmailAndPassword } = await import('firebase/auth');
  const cred = await signInWithEmailAndPassword(auth, email, password);
  await syncSession(cred.user);
  return mapUser(cred.user);
}

export async function registerWithEmail(
  email: string,
  password: string,
  displayName?: string,
): Promise<AuthUser> {
  const isMock =
    import.meta.env.VITE_FIREBASE_API_KEY === 'mock-api-key' && !import.meta.env.VITEST;
  if (isMock) {
    const mockUser: AuthUser = {
      uid: 'mock-register-uid',
      email: email,
      displayName: displayName || email.split('@')[0],
      emailVerified: true,
    };
    const { signIn } = await import('./account');
    signIn(mockUser.email || '', mockUser.displayName || '');
    return mockUser;
  }
  const auth = requireAuth(await getFirebaseAuth());
  const { createUserWithEmailAndPassword, updateProfile } = await import('firebase/auth');
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName) await updateProfile(cred.user, { displayName });
  await syncSession(cred.user);
  return mapUser(cred.user);
}

export async function signOutUser(): Promise<void> {
  const auth = await getFirebaseAuth();
  if (auth) await auth.signOut();
  const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  const isTest = typeof proc !== 'undefined' && proc.env?.NODE_ENV === 'test';
  if (isTest) {
    return;
  }
  if (import.meta.env?.VITEST) {
    return;
  }
  try {
    await fetch(getSessionUrl('/api/auth/session-logout'), { method: 'POST' });
  } catch (err) {
    console.error('Failed to clear session cookie:', err);
  }
}

/** Email the user a password-reset link. Throws `auth-unavailable` when unconfigured. */
export async function sendPasswordReset(email: string): Promise<void> {
  const auth = requireAuth(await getFirebaseAuth());
  const { sendPasswordResetEmail } = await import('firebase/auth');
  await sendPasswordResetEmail(auth, email);
}

/** Re-send the verification email to the current user (no-op when none). */
export async function resendEmailVerification(): Promise<void> {
  const auth = requireAuth(await getFirebaseAuth());
  if (!auth.currentUser) return;
  const { sendEmailVerification } = await import('firebase/auth');
  await sendEmailVerification(auth.currentUser);
}
