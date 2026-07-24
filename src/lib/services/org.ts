/**
 * Client for the B2B org-admin callables (`getMyOrgs`, `getCohortReadiness`) that
 * back the `/business/admin` cohort dashboard. The server re-verifies org ownership
 * on every call — this is a thin typed wrapper. Inert in the local-first build (no
 * Firebase configured) and best-effort: a network/permission failure resolves to a
 * safe empty result so the page can render a "no access" state rather than throw.
 */
import { isFirebaseConfigured, getFns } from '@/lib/services/firebase';

/** One cohort member row — seat status + study readiness (mirrors school-core.CohortRow). */
export interface CohortRow {
  email: string;
  status: 'active' | 'expired' | 'invited' | 'none';
  source: string;
  coverage: string; // "covered/total"
  coveredBanks: number;
  totalBanks: number;
  examBest: number;
  ready: boolean;
  hasProgress: boolean;
  lastActive: string;
}

export interface OrgSummary {
  id: string;
  name: string;
  seatLimit: number | null;
  seatsUsed: number;
}

export interface CohortReadiness {
  orgId: string;
  name: string;
  threshold: number;
  banks: string[];
  counts: { total: number; active: number; ready: number };
  rows: CohortRow[];
}

async function call<T>(name: string, payload: Record<string, unknown>): Promise<T | null> {
  if (!isFirebaseConfigured()) return null;
  try {
    const fns = await getFns();
    if (!fns) return null;
    const { httpsCallable } = await import('firebase/functions');
    const fn = httpsCallable<Record<string, unknown>, T>(fns, name);
    const res = await fn(payload);
    return res.data ?? null;
  } catch {
    return null; // not deployed / not authorised / offline — caller shows an empty state
  }
}

/** Orgs the signed-in user owns (empty when none / not signed in / not deployed). */
export async function getMyOrgs(): Promise<OrgSummary[]> {
  const data = await call<{ orgs: OrgSummary[] }>('getMyOrgs', {});
  return data?.orgs ?? [];
}

/** Cohort seat status + readiness for one org the caller owns, or null if not permitted. */
export async function getCohortReadiness(orgId: string): Promise<CohortReadiness | null> {
  return call<CohortReadiness>('getCohortReadiness', { orgId });
}

/** Provision new seats for an org (add email invites). Returns success/error for each email. */
export async function provisionSeats(
  orgId: string,
  emails: string[],
  expiresAt?: string,
): Promise<{ results: Array<{ email: string; success: boolean; error?: string }> } | null> {
  return call('provisionSeats', { orgId, emails, expiresAt });
}
