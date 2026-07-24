/**
 * Client trigger for the `claimSchoolSeat` gateway callable. On sign-in — when the
 * user has no active paid plan — the app asks the server to grant a school seat if
 * their VERIFIED email is on an approved school domain or the invite roster, so an
 * invited member unlocks without waiting for the `grant-school-seats.mjs` script to
 * be re-run. The server re-checks everything (email_verified + domain/invite); this
 * is best-effort. Inert in the local-first build. Unlike the staff pre-check there is
 * no cheap client filter for the invite path, so the *caller* gates this on a free
 * plan (see src/lib/account.ts) to avoid calling it for paying/already-granted users.
 */
import { isFirebaseConfigured, getFns } from '@/lib/services/firebase';

/**
 * Ask the gateway to grant a school seat for the signed-in user. Best-effort and
 * idempotent; resolves `true` when a grant was (re)confirmed so the caller can
 * re-hydrate the entitlement. No-ops (resolves `false`) for an unverified email, a
 * local-only build, or when the callable isn't reachable/deployed yet.
 */
export async function claimSchoolSeatIfEligible(
  email: string | null | undefined,
  emailVerified: boolean,
): Promise<boolean> {
  if (!emailVerified || !email || !isFirebaseConfigured()) return false;
  try {
    const fns = await getFns();
    if (!fns) return false;
    const { httpsCallable } = await import('firebase/functions');
    const claim = httpsCallable<Record<string, never>, { granted?: boolean }>(
      fns,
      'claimSchoolSeat',
    );
    const res = await claim({});
    return res.data?.granted === true;
  } catch {
    return false; // offline / not deployed yet — harmless, retried next sign-in
  }
}
