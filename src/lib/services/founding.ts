/**
 * Client trigger for the `claimFoundingAccess` gateway callable. On sign-in the app
 * asks the server to grandfather a pre-launch account with a complimentary Pro window
 * (see functions/src/founding.ts). Eligibility (account created before the launch
 * cutoff) is decided SERVER-SIDE from the Admin SDK's creation-time — the client can't
 * check it, so this just makes the call for any verified, still-free user and lets the
 * server grant or decline. Best-effort and idempotent; inert in the local-first build.
 */
import { isFirebaseConfigured, getFns } from '@/lib/services/firebase';

/**
 * Ask the gateway to grant the founding entitlement. Resolves `true` only when a grant
 * was actually written (so the caller re-hydrates the entitlement). No-ops (resolves
 * `false`) for an unverified email, an ineligible/newer account, an already-entitled
 * user, a local-only build, or when the callable isn't reachable/deployed yet.
 */
export async function claimFoundingAccessIfEligible(emailVerified: boolean): Promise<boolean> {
  if (!emailVerified || !isFirebaseConfigured()) return false;
  try {
    const fns = await getFns();
    if (!fns) return false;
    const { httpsCallable } = await import('firebase/functions');
    const claim = httpsCallable<Record<string, never>, { granted?: boolean }>(
      fns,
      'claimFoundingAccess',
    );
    const res = await claim({});
    return res.data?.granted === true;
  } catch {
    return false; // offline / not deployed yet — harmless, retried next sign-in
  }
}
