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
  return onAuthStateChanged(auth, (u) => cb(u ? mapUser(u) : null));
}

function requireAuth(auth: Awaited<ReturnType<typeof getFirebaseAuth>>): NonNullable<typeof auth> {
  if (!auth) throw new Error('auth-unavailable');
  return auth;
}

export async function signInWithGoogle(): Promise<AuthUser> {
  const auth = requireAuth(await getFirebaseAuth());
  const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
  const cred = await signInWithPopup(auth, new GoogleAuthProvider());
  return mapUser(cred.user);
}

export async function signInWithEmail(email: string, password: string): Promise<AuthUser> {
  const auth = requireAuth(await getFirebaseAuth());
  const { signInWithEmailAndPassword } = await import('firebase/auth');
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return mapUser(cred.user);
}

export async function registerWithEmail(
  email: string,
  password: string,
  displayName?: string,
): Promise<AuthUser> {
  const auth = requireAuth(await getFirebaseAuth());
  const { createUserWithEmailAndPassword, updateProfile } = await import('firebase/auth');
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName) await updateProfile(cred.user, { displayName });
  return mapUser(cred.user);
}

export async function signOutUser(): Promise<void> {
  const auth = await getFirebaseAuth();
  if (auth) await auth.signOut();
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
