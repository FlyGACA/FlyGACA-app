/**
 * Auth surface. Backed by Firebase Auth when configured (web popup / native
 * channel); a no-op when not — every method degrades gracefully so the
 * local-first account store (`account.ts`) keeps working without a backend.
 */
import type { User } from 'firebase/auth';
import { isNative } from '@/lib/native/nativeBridge';
import { isFirebaseConfigured, getFirebaseAuth } from '@/lib/services/firebase';
import { getSafeRedirectUrl } from '@/calc/app/redirectUrl';
import { AUTH_REDIRECT_FAILED_CODE, shouldRetryAsRedirect } from '@/calc/app/authError';

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

/** Tab-scoped marker: a `signInWithRedirect` is in flight, set just before we go. */
const REDIRECT_PENDING_KEY = 'flygaca:auth:redirect-pending';
/** Tab-scoped marker: that redirect came back with no credential. */
const REDIRECT_FAILED_KEY = 'flygaca:auth:redirect-failed';
/** Where to land after the redirect resolves, when the caller asked for one. */
const REDIRECT_TARGET_KEY = 'flygaca:auth:redirect-target';
/** A pending marker older than this is stale (an abandoned tab), not a failure. */
const REDIRECT_PENDING_TTL_MS = 10 * 60 * 1000;

/** sessionStorage, or null where it is unavailable (SSR, blocked storage). */
function tabStore(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.sessionStorage : null;
  } catch {
    return null; // Safari private mode / storage disabled
  }
}

function getSessionUrl(path: string): string {
  const base = typeof window !== 'undefined' ? window.location.origin : '';
  if (base && base.startsWith('http')) {
    return new URL(path, base).toString();
  }
  return path;
}

/** True in the unit-test/CI runtime, where the gateway fetches must not fire. */
function isTestRuntime(): boolean {
  const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  if (typeof proc !== 'undefined' && proc.env?.NODE_ENV === 'test') return true;
  return Boolean(import.meta.env?.VITEST);
}

/**
 * Exchange the fresh ID token for the gateway's HttpOnly session cookie
 * (`/api/auth/session-login`, verified by `functions/src/gateway.ts`).
 * Best-effort: the Authorization-header path still authenticates every request,
 * so a failure here degrades rather than blocking sign-in.
 */
async function syncSession(user: User): Promise<void> {
  if (isTestRuntime()) return;
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
 * Hand off to the full-page redirect flow, remembering (for this tab) that one is
 * in flight and where the user wanted to end up. `completeRedirectSignIn` reads
 * both back when the browser returns.
 */
async function startRedirectSignIn(
  auth: NonNullable<Awaited<ReturnType<typeof getFirebaseAuth>>>,
  provider: Parameters<typeof import('firebase/auth').signInWithRedirect>[1],
): Promise<null> {
  const store = tabStore();
  if (store) {
    store.setItem(REDIRECT_PENDING_KEY, String(Date.now()));
    store.removeItem(REDIRECT_FAILED_KEY);
    const target = getSafeRedirectUrl(
      new URLSearchParams(window.location.search).get('redirect'),
      '',
    );
    if (target) store.setItem(REDIRECT_TARGET_KEY, target);
  }
  const { signInWithRedirect } = await import('firebase/auth');
  await signInWithRedirect(auth, provider);
  return null;
}

/**
 * Whether the last `signInWithRedirect` in this tab came back empty-handed —
 * read-and-clear, so the sign-in form can turn a silent round trip into a visible
 * error exactly once. See `AUTH_REDIRECT_FAILED_CODE` for why this happens.
 */
export function consumeRedirectFailure(): boolean {
  const store = tabStore();
  if (!store) return false;
  const failed = store.getItem(REDIRECT_FAILED_KEY) !== null;
  if (failed) store.removeItem(REDIRECT_FAILED_KEY);
  return failed;
}

/** The synthetic error code the sign-in form reports for that failure. */
export const REDIRECT_FAILED_CODE = AUTH_REDIRECT_FAILED_CODE;

/**
 * When a Google sign-in returns via `signInWithRedirect`, this resolves the
 * pending result on the next page load, syncs the session cookie and honours the
 * saved `?redirect=` target. When a redirect *was* in flight and the result is
 * empty, it records the failure for `consumeRedirectFailure` instead of leaving
 * the user staring at an unchanged signed-out page. Best-effort otherwise: no
 * pending redirect (the common case) no-ops, and errors never break bootstrap.
 * Invoked once from `onAuthChange`.
 */
async function completeRedirectSignIn(
  auth: NonNullable<Awaited<ReturnType<typeof getFirebaseAuth>>>,
) {
  const store = tabStore();
  const startedAt = Number(store?.getItem(REDIRECT_PENDING_KEY) ?? NaN);
  const wasPending = Number.isFinite(startedAt) && Date.now() - startedAt < REDIRECT_PENDING_TTL_MS;
  store?.removeItem(REDIRECT_PENDING_KEY);
  try {
    const { getRedirectResult } = await import('firebase/auth');
    const cred = await getRedirectResult(auth);
    if (cred?.user) {
      await syncSession(cred.user);
      const target = store?.getItem(REDIRECT_TARGET_KEY);
      store?.removeItem(REDIRECT_TARGET_KEY);
      if (target && typeof window !== 'undefined') {
        const safeTarget = getSafeRedirectUrl(target, '');
        if (safeTarget && window.location.pathname !== safeTarget) {
          window.location.replace(safeTarget);
        }
      }
      return;
    }
    // Sent the user through the handler and got nothing back — see
    // AUTH_REDIRECT_FAILED_CODE. Surface it rather than failing silently.
    if (wasPending) store?.setItem(REDIRECT_FAILED_KEY, '1');
  } catch (err) {
    if (wasPending) store?.setItem(REDIRECT_FAILED_KEY, '1');
    console.error('Failed to complete Google redirect sign-in:', err);
  } finally {
    store?.removeItem(REDIRECT_TARGET_KEY);
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
    const { signIn } = await import('@/lib/services/account');
    signIn(mockUser.email || '', mockUser.displayName || '');
    return mockUser;
  }
  const auth = requireAuth(await getFirebaseAuth());
  const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
  const provider = new GoogleAuthProvider();
  // Always show the chooser: without it a browser signed into several Google
  // accounts silently reuses the last one, which reads as "the button did nothing".
  provider.setCustomParameters({ prompt: 'select_account' });

  // Native webviews (Capacitor) can't host the popup at all — go straight to the
  // redirect flow. The page navigates away and `completeRedirectSignIn` finishes
  // the sign-in on return, so this resolves to `null` here (no user to map yet).
  if (isNative()) return startRedirectSignIn(auth, provider);

  try {
    const cred = await signInWithPopup(auth, provider);
    await syncSession(cred.user);
    return mapUser(cred.user);
  } catch (err) {
    const code = (err as { code?: string }).code;
    // Only when the popup could not open at all. A popup the *user* closed is a
    // deliberate cancel and is re-thrown for the form to swallow quietly — sending
    // them on a full-page round trip they didn't ask for is the behaviour that made
    // this flow feel broken.
    if (shouldRetryAsRedirect(code)) return startRedirectSignIn(auth, provider);
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
    const { signIn } = await import('@/lib/services/account');
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
    const { signIn } = await import('@/lib/services/account');
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
  if (isTestRuntime()) return;
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
