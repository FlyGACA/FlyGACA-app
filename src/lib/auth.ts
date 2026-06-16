/**
 * Auth surface (stub). The legacy app uses Firebase Auth on web and native
 * Apple/Google sign-in inside the Capacitor shell (via native-bridge). This
 * module defines the typed contract the UI depends on; the Firebase wiring is
 * added when the Account/Chat pages are ported (see MIGRATION.md).
 */
import { isNative } from './native-bridge';

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

// Placeholder until Firebase Auth is wired in the Account/Chat slice.
export async function getIdToken(): Promise<string | null> {
  return null;
}
