/**
 * School (B2B Multi-Tenant) Cloud Functions for Fly GACA.
 *
 * Provides:
 *  - `claimSchoolSeat`           — Self-serve school seat grant (domain/invite).
 *  - `grantSchoolLicence`        — Admin-allocated school license with atomic seat quota enforcement.
 *  - `revokeSchoolLicence`       — Admin license revocation, seat release, and entitlement demotion.
 *  - `getSchoolAnalyticsSummary` — Pre-aggregated cohort analytics summary retrieval.
 *  - `recomputeSchoolAnalytics`  — Aggregation engine respecting KSA PDPL consent redaction.
 */

import { onCall, HttpsError } from "firebase-functions/https";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { effectivePlan, type Entitlement } from "./billing-core.js";
import {
  isApprovedSchoolDomain,
  inviteKeyForEmail,
  schoolEntitlement,
  isSchoolAdmin,
  isSchoolStaff,
  type SchoolDoc,
  type RosterDoc,
  type SchoolAuditLog,
} from "./school-core.js";
import {
  computeSchoolAnalyticsSummary,
  calculateHealthScore,
  calculatePassProbability,
  type CadetProgressRecord,
  type SchoolInfo,
} from "./analytics-core.js";
import { REGION } from "./region.js";

if (getApps().length === 0) initializeApp();

const CALLABLE_OPTIONS = {
  region: REGION,
  timeoutSeconds: 30,
  memory: "256MiB" as const,
  maxInstances: 10,
  enforceAppCheck: false, // Allows unit testing and direct invocation
};

export const claimSchoolSeat = onCall(CALLABLE_OPTIONS, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "sign-in-required");

  const email = request.auth?.token?.email as string | undefined;
  const emailVerified = request.auth?.token?.email_verified as boolean | undefined;
  if (!emailVerified || !email) return { granted: false as const };

  const db = getFirestore();

  let expiresAt: string | undefined;
  let orgId: string | undefined;
  let eligible = isApprovedSchoolDomain(email, emailVerified);
  if (!eligible) {
    const key = inviteKeyForEmail(email);
    if (key) {
      const invite = await db.collection("schoolInvites").doc(key).get();
      if (invite.exists) {
        eligible = true;
        const e = invite.data()?.expiresAt;
        if (typeof e === "string") expiresAt = e;
        const o = invite.data()?.orgId;
        if (typeof o === "string") orgId = o;
      }
    }
  }
  if (!eligible) return { granted: false as const };

  if (orgId) {
    const orgSnap = await db.collection("orgs").doc(orgId).get();
    const seatLimit = orgSnap.data()?.seatLimit;
    if (typeof seatLimit === "number") {
      const memberSnap = await orgSnap.ref.collection("members").count().get();
      if (memberSnap.data().count >= seatLimit) return { granted: false as const };
    }
  }

  const ref = db.collection("users").doc(uid);
  const snap = await ref.get();
  const current = snap.exists
    ? (snap.data()?.entitlement as Entitlement | undefined)
    : undefined;

  if (effectivePlan(current) !== "school") {
    await ref.set({ entitlement: schoolEntitlement(expiresAt) }, { merge: true });
  }

  if (orgId) {
    await db
      .collection("orgs")
      .doc(orgId)
      .collection("members")
      .doc(uid)
      .set({ email: email.trim().toLowerCase(), claimedAt: new Date().toISOString() }, { merge: true });
  }
  return { granted: true as const, plan: "school" as const };
});

export interface GrantSchoolLicenceInput {
  schoolId: string;
  cadetUid: string;
  cadetEmail: string;
  expiresAt?: string;
  cohortId?: string;
}

export const grantSchoolLicence = onCall(CALLABLE_OPTIONS, async (request) => {
  const callerUid = request.auth?.uid;
  if (!callerUid) throw new HttpsError("unauthenticated", "Authentication required");

  const data = request.data as Partial<GrantSchoolLicenceInput> | undefined;
  const schoolId = data?.schoolId?.trim();
  const cadetUid = data?.cadetUid?.trim();
  const cadetEmail = data?.cadetEmail?.trim().toLowerCase();
  const expiresAt = data?.expiresAt?.trim() || undefined;
  const cohortId = data?.cohortId?.trim() || null;

  if (!schoolId || !cadetUid || !cadetEmail) {
    throw new HttpsError("invalid-argument", "Missing required fields: schoolId, cadetUid, cadetEmail");
  }

  const db = getFirestore();
  const schoolRef = db.collection("schools").doc(schoolId);
  const rosterRef = schoolRef.collection("roster").doc(cadetUid);
  const userRef = db.collection("users").doc(cadetUid);
  const auditRef = schoolRef.collection("auditLogs").doc();

  const now = new Date().toISOString();

  let finalAllocatedSeats = 0;

  await db.runTransaction(async (tx) => {
    const schoolSnap = await tx.get(schoolRef);
    if (!schoolSnap.exists) {
      throw new HttpsError("not-found", `School ${schoolId} not found`);
    }

    const schoolData = schoolSnap.data() as SchoolDoc;
    if (!isSchoolAdmin(schoolData, callerUid)) {
      throw new HttpsError("permission-denied", "Only school owners or administrators can grant licenses");
    }

    const seatLimit = schoolData.seatLimit ?? 0;
    const allocatedSeats = schoolData.allocatedSeats ?? 0;

    const rosterSnap = await tx.get(rosterRef);
    const isAlreadyActive = rosterSnap.exists && (rosterSnap.data() as RosterDoc)?.licenseStatus === "active";

    if (!isAlreadyActive && allocatedSeats >= seatLimit) {
      throw new HttpsError("resource-exhausted", `Seat limit of ${seatLimit} reached. Cannot allocate more seats.`);
    }

    finalAllocatedSeats = isAlreadyActive ? allocatedSeats : allocatedSeats + 1;

    const existingRoster = rosterSnap.exists ? (rosterSnap.data() as RosterDoc) : null;
    const pdplConsent = existingRoster?.pdplConsent ?? {
      consent: false,
      consentedAt: now,
      consentVersion: "v1.0-2026",
    };

    const rosterEntry: RosterDoc = {
      cadetUid,
      cadetEmail,
      cohortId,
      licenseStatus: "active",
      seatAllocated: true,
      grantedBy: callerUid,
      grantedAt: now,
      expiresAt: expiresAt ?? null,
      pdplConsent,
    };

    tx.set(rosterRef, rosterEntry, { merge: true });

    if (!isAlreadyActive) {
      tx.update(schoolRef, {
        allocatedSeats: FieldValue.increment(1),
        updatedAt: now,
      });
    }

    const entitlement: Entitlement = schoolEntitlement(expiresAt);
    tx.set(userRef, { entitlement }, { merge: true });

    const auditEntry: SchoolAuditLog = {
      auditId: auditRef.id,
      action: "GRANT_LICENCE",
      actorUid: callerUid,
      targetCadetUid: cadetUid,
      timestamp: now,
      details: {
        cadetEmail,
        cohortId,
        expiresAt: expiresAt ?? null,
      },
    };
    tx.set(auditRef, auditEntry);
  });

  return {
    success: true as const,
    schoolId,
    cadetUid,
    allocatedSeats: finalAllocatedSeats,
    grantedAt: now,
  };
});

export interface RevokeSchoolLicenceInput {
  schoolId: string;
  cadetUid: string;
  reason?: string;
}

export const revokeSchoolLicence = onCall(CALLABLE_OPTIONS, async (request) => {
  const callerUid = request.auth?.uid;
  if (!callerUid) throw new HttpsError("unauthenticated", "Authentication required");

  const data = request.data as Partial<RevokeSchoolLicenceInput> | undefined;
  const schoolId = data?.schoolId?.trim();
  const cadetUid = data?.cadetUid?.trim();
  const reason = data?.reason?.trim() || "Revoked by school administrator";

  if (!schoolId || !cadetUid) {
    throw new HttpsError("invalid-argument", "Missing required fields: schoolId, cadetUid");
  }

  const db = getFirestore();
  const schoolRef = db.collection("schools").doc(schoolId);
  const rosterRef = schoolRef.collection("roster").doc(cadetUid);
  const userRef = db.collection("users").doc(cadetUid);
  const auditRef = schoolRef.collection("auditLogs").doc();

  const now = new Date().toISOString();

  await db.runTransaction(async (tx) => {
    const schoolSnap = await tx.get(schoolRef);
    if (!schoolSnap.exists) {
      throw new HttpsError("not-found", `School ${schoolId} not found`);
    }

    const schoolData = schoolSnap.data() as SchoolDoc;
    if (!isSchoolAdmin(schoolData, callerUid)) {
      throw new HttpsError("permission-denied", "Only school owners or administrators can revoke licenses");
    }

    const rosterSnap = await tx.get(rosterRef);
    if (!rosterSnap.exists) {
      throw new HttpsError("not-found", `Cadet ${cadetUid} not found in school roster`);
    }

    const rosterData = rosterSnap.data() as RosterDoc;
    const wasAllocated = rosterData.seatAllocated === true || rosterData.licenseStatus === "active";

    tx.update(rosterRef, {
      licenseStatus: "revoked",
      seatAllocated: false,
      revokedAt: now,
      revokedBy: callerUid,
      revokeReason: reason,
    });

    if (wasAllocated) {
      tx.update(schoolRef, {
        allocatedSeats: FieldValue.increment(-1),
        updatedAt: now,
      });
    }

    // Demote user entitlement to free
    const entitlement: Entitlement = { plan: "free" };
    tx.set(userRef, { entitlement }, { merge: true });

    const auditEntry: SchoolAuditLog = {
      auditId: auditRef.id,
      action: "REVOKE_LICENCE",
      actorUid: callerUid,
      targetCadetUid: cadetUid,
      timestamp: now,
      details: {
        reason,
      },
    };
    tx.set(auditRef, auditEntry);
  });

  return {
    success: true as const,
    schoolId,
    cadetUid,
    revokedAt: now,
  };
});

export interface GetSchoolAnalyticsSummaryInput {
  schoolId: string;
}

export const getSchoolAnalyticsSummary = onCall(CALLABLE_OPTIONS, async (request) => {
  const callerUid = request.auth?.uid;
  if (!callerUid) throw new HttpsError("unauthenticated", "Authentication required");

  const data = request.data as Partial<GetSchoolAnalyticsSummaryInput> | undefined;
  const schoolId = data?.schoolId?.trim();
  if (!schoolId) throw new HttpsError("invalid-argument", "Missing schoolId");

  const db = getFirestore();
  const schoolRef = db.collection("schools").doc(schoolId);
  const schoolSnap = await schoolRef.get();
  if (!schoolSnap.exists) throw new HttpsError("not-found", "School not found");

  const schoolData = schoolSnap.data() as SchoolDoc;
  if (!isSchoolStaff(schoolData, callerUid)) {
    throw new HttpsError("permission-denied", "Access restricted to school staff");
  }

  const summaryRef = schoolRef.collection("analytics").doc("summary");
  const summarySnap = await summaryRef.get();

  if (summarySnap.exists) {
    return summarySnap.data();
  }

  // If not yet generated, recompute and return
  return await executeRecomputeAnalytics(schoolId, schoolData, callerUid);
});

export const recomputeSchoolAnalytics = onCall(CALLABLE_OPTIONS, async (request) => {
  const callerUid = request.auth?.uid;
  if (!callerUid) throw new HttpsError("unauthenticated", "Authentication required");

  const data = request.data as Partial<{ schoolId: string }> | undefined;
  const schoolId = data?.schoolId?.trim();
  if (!schoolId) throw new HttpsError("invalid-argument", "Missing schoolId");

  const db = getFirestore();
  const schoolRef = db.collection("schools").doc(schoolId);
  const schoolSnap = await schoolRef.get();
  if (!schoolSnap.exists) throw new HttpsError("not-found", "School not found");

  const schoolData = schoolSnap.data() as SchoolDoc;
  if (!isSchoolStaff(schoolData, callerUid)) {
    throw new HttpsError("permission-denied", "Access restricted to school staff");
  }

  return await executeRecomputeAnalytics(schoolId, schoolData, callerUid);
});

async function executeRecomputeAnalytics(
  schoolId: string,
  schoolData: SchoolDoc,
  actorUid: string,
) {
  const db = getFirestore();
  const schoolRef = db.collection("schools").doc(schoolId);
  const rosterSnap = await schoolRef.collection("roster").get();

  const cadetRecords: CadetProgressRecord[] = [];

  for (const doc of rosterSnap.docs) {
    const r = doc.data() as RosterDoc;
    const cadetUid = r.cadetUid || doc.id;
    const pdplConsented = r.pdplConsent?.consent === true;

    let healthScore: number | null = null;
    let passProbability: number | null = null;
    let examBest: number | null = null;
    let quizCoverageRatio: number | null = null;
    let lastActive: string | null = null;

    // Respect KSA PDPL: only fetch and evaluate progress metrics if cadet consented
    if (pdplConsented) {
      try {
        const progSnap = await db.collection("users").doc(cadetUid).collection("progress").doc("summary").get();
        if (progSnap.exists) {
          const pData = progSnap.data();
          const qBest = (pData?.quizBest ?? {}) as Record<string, number>;
          const eBest = typeof pData?.examBest === "number" ? pData.examBest : (typeof pData?.exam?.pct === "number" ? pData.exam.pct : 0);
          const gsDone = (pData?.gsDone ?? {}) as Record<string, boolean>;
          lastActive = typeof pData?.updatedAt === "string" ? pData.updatedAt : null;

          const quizCount = Object.keys(qBest).length;
          const passCount = Object.values(qBest).filter((s) => s >= 75).length;
          quizCoverageRatio = quizCount > 0 ? passCount / quizCount : 0;
          examBest = eBest;

          const hResult = calculateHealthScore({
            lastActivityDate: lastActive,
            bankPassRatio: quizCoverageRatio,
            groundSchoolProgress: Object.keys(gsDone).length > 0 ? Object.values(gsDone).filter(Boolean).length / Object.keys(gsDone).length : 0,
            bestExamScore: eBest,
            recentAttemptAvg: eBest,
            examCount: pData?.examCount ?? (eBest > 0 ? 1 : 0),
          });
          healthScore = hResult.score;

          const pResult = calculatePassProbability({
            bestScore: eBest,
            bankCoverageRatio: quizCoverageRatio,
          });
          passProbability = pResult.probability;
        }
      } catch {
        // Non-fatal, default to uncalculated
      }
    }

    cadetRecords.push({
      cadetUid,
      cadetEmail: r.cadetEmail,
      licenseStatus: r.licenseStatus,
      seatAllocated: r.seatAllocated,
      cohortId: r.cohortId,
      pdplConsent: r.pdplConsent,
      healthScore,
      passProbability,
      examBest,
      quizCoverageRatio,
      lastActive,
    });
  }

  const schoolInfo: SchoolInfo = {
    schoolId,
    name: schoolData.name,
    seatLimit: schoolData.seatLimit ?? 0,
    allocatedSeats: schoolData.allocatedSeats ?? 0,
  };

  const summary = computeSchoolAnalyticsSummary(cadetRecords, schoolInfo);

  // Write pre-aggregated summary
  const summaryRef = schoolRef.collection("analytics").doc("summary");
  await summaryRef.set(summary, { merge: true });

  // Write audit log
  const auditRef = schoolRef.collection("auditLogs").doc();
  const auditEntry: SchoolAuditLog = {
    auditId: auditRef.id,
    action: "RECOMPUTE_ANALYTICS",
    actorUid,
    timestamp: new Date().toISOString(),
    details: {
      totalCadets: summary.totalCadets,
      activeLicenses: summary.activeLicenses,
      consentedCadetsCount: summary.consentedCadetsCount,
      redactedCadetsCount: summary.redactedCadetsCount,
    },
  };
  await auditRef.set(auditEntry);

  return summary;
}
