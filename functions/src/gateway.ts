/**
 * HTTP gateway for `/api/chat` (DESIGN §3 D1, §4). An Express app — NOT
 * `onCallGenkit` — so the existing frontend SSE contract is preserved verbatim.
 * It owns auth + App Check, then drives the protocol-agnostic `captainAdelFlow`
 * and translates its stream/result into either the legacy SSE frames or a
 * buffered `ChatResponse`.
 */
import { createHash } from "node:crypto";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import type { NextFunction, Request, Response } from "express";
import { logger } from "firebase-functions";
import { defineBoolean, defineInt } from "firebase-functions/params";
import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getAppCheck } from "firebase-admin/app-check";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { captainAdelFlow } from "./captain-adel.js";
import { createRateLimiter } from "./rate-limit-core.js";
import { isPaidActive, type Entitlement } from "./billing-core.js";
import {
  checkDailyQuota,
  FREE_DAILY_LIMIT,
  ANON_DAILY_LIMIT,
  type DailyUsage,
} from "./chat-quota-core.js";
import { extractApiKey, hashApiKey } from "./api-key-core.js";
import { apiTier, isOverMonthlyQuota, monthKey, remainingThisMonth, API_TIERS } from "./api-tier-core.js";
import {
  anonymousAuthContext,
  extractBearerToken,
  toAuthContext,
  type AuthContext,
} from "./auth-core.js";
import { parseFeedback } from "./feedback-core.js";
import { frame, doneFrame, pingFrame, SSE_HEADERS } from "./sse.js";
import {
  parseCookies,
  parseRequest,
  isAllowedOrigin,
  MESSAGE_MAX_CHARS,
} from "./gateway-core.js";

if (getApps().length === 0) initializeApp();

const ENFORCE_APP_CHECK = defineBoolean("ENFORCE_APP_CHECK", { default: false });

// Free Captain Adel questions per day — a deploy-time param so the free-tier limit
// can be tuned (A/B 3 vs 5/day) without a code change. The client counter stays a
// separate nudge; this is the enforced value.
const FREE_DAILY_LIMIT_PARAM = defineInt("FREE_DAILY_LIMIT", { default: FREE_DAILY_LIMIT });

// Anonymous (not-signed-in) Captain Adel questions per day — a deploy-time param so
// the free-trial allowance can be tuned without a code change. Anonymous turns have
// no uid, so the daily quota is keyed on a hashed client IP (see `anonQuotaKey`).
const ANON_DAILY_LIMIT_PARAM = defineInt("ANON_DAILY_LIMIT", { default: ANON_DAILY_LIMIT });

/** Thrown by `authenticate` when an enforced check fails → mapped to 403. */
export class AuthError extends Error {}

/**
 * Verify the Firebase Session Cookie or ID token (optional → anonymous) and App
 * Check token (enforced in prod). Returns the caller's auth context — `uid` plus
 * the `email`/`emailVerified` claims — when a valid session/token was presented; an
 * anonymous context otherwise. The token-parsing and claim-reading are the pure
 * `auth-core` helpers; only the `verifySessionCookie` / `verifyIdToken` / App Check
 * calls live here.
 *
 * Exported for unit testing; the route handlers below are the only callers.
 */
export async function authenticate(req: Request): Promise<AuthContext> {
  const appCheckToken = req.header("X-Firebase-AppCheck");
  if (ENFORCE_APP_CHECK.value()) {
    if (!appCheckToken) throw new AuthError("missing App Check token");
    try {
      await getAppCheck().verifyToken(appCheckToken);
    } catch {
      throw new AuthError("invalid App Check token");
    }
  }

  // 1. First check HttpOnly Session Cookie (preferred for web clients)
  const cookies = parseCookies(req.headers?.cookie);
  const sessionCookie = cookies.session;
  if (sessionCookie) {
    try {
      const decoded = await getAuth().verifySessionCookie(sessionCookie, true);
      return toAuthContext(decoded);
    } catch {
      // If session cookie is expired/invalid, let it fall through to auth header check
    }
  }

  // 2. Fall back to Authorization Header (used by native apps / client fallbacks)
  const idToken = extractBearerToken(req.header("Authorization"));
  if (idToken) {
    try {
      const decoded = await getAuth().verifyIdToken(idToken);
      return toAuthContext(decoded);
    } catch {
      // An invalid ID token is treated as anonymous, not fatal (mirrors legacy).
    }
  }
  return anonymousAuthContext();
}

const app = express();
// Security middleware
app.use(helmet());
// req.ip = leftmost X-Forwarded-For. Without this the limiter below keys on the
// proxy's address, collapsing every real user into ~one shared bucket (30/min
// sitewide). The proxy-chain depth varies by front (direct function URL = 1 hop,
// Firebase Hosting = 2, Cloudflare Worker → Hosting = 3+), so no fixed hop count
// is right. Leftmost-XFF is client-forgeable, but a forger only shards their own
// bucket — real browsers never send XFF — and the hard cost control is the per-turn
// limiter on /chat below (keyed on uid, or on IP for anonymous callers).
app.set("trust proxy", true);
// Rate limiting: 30 requests per minute per IP — a best-effort backstop in front of
// everything, incl. the metered anonymous chat trial (per-IP daily quota below).
app.use(
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later." },
    // CORS preflights don't burn budget; licensed API traffic (/v1) is governed by
    // the per-key limiter below, not this per-IP app backstop (a partner's calls
    // share one IP).
    skip: (req) =>
      req.method === "OPTIONS" || req.path.startsWith("/v1") || req.path.startsWith("/api/v1"),
    validate: { trustProxy: false }, // permissive trust proxy is deliberate (see above)
  }),
);

// Per-uid chat limit — the hard cost control (DESIGN §8 N4). 20 turns/min is far
// above any human rate; state is per-instance (see rate-limit-core.ts caveat).
const chatLimiter = createRateLimiter({ limit: 20, windowMs: 60 * 1000 });
// Per-API-key limit for the licensed /v1 API (higher than a single human, still a
// cost ceiling; per-instance like chatLimiter).
const apiKeyLimiter = createRateLimiter({ limit: 60, windowMs: 60 * 1000 });

/**
 * Read the server-owned entitlement for `uid` (`users/{uid}.entitlement`). On any
 * Firestore error, resolve to `null` (treated as free) — failing toward the cheap
 * path keeps a transient blip from handing out the Pro model / unlimited chat. The
 * per-uid burst limiter above remains the hard cost backstop either way.
 */
async function readEntitlement(uid: string): Promise<Entitlement | null> {
  try {
    const snap = await getFirestore().collection("users").doc(uid).get();
    const ent = snap.exists
      ? (snap.data()?.entitlement as Entitlement | undefined)
      : undefined;
    return ent ?? null;
  } catch (err) {
    logger.error("entitlement read failed", { uid, err });
    return null;
  }
}

/**
 * The Firestore `chatUsage` doc id for an anonymous caller: `anon:<hash>` where the
 * hash is a truncated SHA-256 of the client IP. We never persist a raw IP (PDPL) —
 * the hash is a stable-per-IP-per-day-ish bucket, enough to cap a not-signed-in
 * visitor's daily allowance without storing personal data. An absent IP collapses to
 * a single shared `anon:none` bucket (conservative — worst case is one shared cap).
 */
function anonQuotaKey(ip: string | undefined): string {
  const hash = createHash("sha256")
    .update(ip || "none")
    .digest("hex")
    .slice(0, 32);
  return `anon:${hash}`;
}

/**
 * Atomically consume one daily question for `key` in a Firestore transaction on
 * `chatUsage/{key}` — durable across instances, unlike the in-memory burst limiter,
 * so the daily allowance can't be reset by clearing localStorage or spreading load
 * across function instances. `key` is the caller's `uid` (signed-in) or an
 * `anon:<ipHash>` bucket (anonymous). On a transaction error it fails open (allowed);
 * the per-uid/per-IP burst limiter is the hard backstop. `chatUsage` is server-only
 * (deny-all in firestore.rules).
 */
async function consumeDailyQuota(
  key: string,
  limit: number,
): Promise<{ allowed: boolean; retryAfterSec: number }> {
  const db = getFirestore();
  const ref = db.collection("chatUsage").doc(key);
  try {
    return await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const raw = snap.exists ? (snap.data() as Partial<DailyUsage>) : null;
      const verdict = checkDailyQuota(raw, new Date(), limit);
      if (verdict.allowed) tx.set(ref, verdict.usage);
      return { allowed: verdict.allowed, retryAfterSec: verdict.retryAfterSec };
    });
  } catch (err) {
    logger.error("chat quota transaction failed", { key, err });
    return { allowed: true, retryAfterSec: 0 };
  }
}

/**
 * Spend one purchased Captain Adel credit for `uid` (transaction on
 * `chatCredits/{uid}`) — used only after the daily free allowance is exhausted.
 * Returns true when a credit was spent, false when the balance is empty. On a
 * transaction error returns false (fail closed): this path is only reached after a
 * successful quota read, so a failure here is rare and the caller just 429s.
 */
async function consumeCredit(uid: string): Promise<boolean> {
  const ref = getFirestore().collection("chatCredits").doc(uid);
  try {
    return await getFirestore().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const balance = snap.exists ? Number(snap.data()?.balance ?? 0) : 0;
      if (!(balance >= 1)) return false;
      tx.set(ref, { balance: Math.floor(balance) - 1 }, { merge: true });
      return true;
    });
  } catch (err) {
    logger.error("chat credit transaction failed", { uid, err });
    return false;
  }
}
// CORS — explicit allowlist (policy in `gateway-core.ts` `isAllowedOrigin`).
app.use((req, res, next) => {
  const origin = req.headers.origin;
  // No Origin → same-origin or non-browser caller: nothing to gate, and the
  // browser needs no CORS headers. Never reflect an empty/absent origin.
  if (!origin) return next();
  if (!isAllowedOrigin(origin)) {
    return res.status(403).json({ error: "CORS not allowed" });
  }
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Firebase-AppCheck");
  res.setHeader("Access-Control-Max-Age", "86400");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  return next();
});

app.post(["/chat", "/api/chat"], async (req: Request, res: Response): Promise<void> => {
  // Auth / App Check. Captain Adel chat is usable WITHOUT an account: an absent or
  // invalid ID token yields an anonymous caller (metered by hashed client IP on a
  // small daily free-trial allowance), not a 401. App Check failures still 403,
  // enforced only when ENFORCE_APP_CHECK is on.
  let uid: string | undefined;
  let emailVerified: boolean;
  try {
    ({ uid, emailVerified } = await authenticate(req));
  } catch (err) {
    if (err instanceof AuthError) {
      res.status(403).json({ error: err.message });
      return;
    }
    throw err;
  }

  // Per-turn burst limiter — the hard cost backstop (DESIGN §8 N4). Keyed on the uid
  // when signed in, else on the client IP so one anonymous visitor can't flood.
  const limiterKey = uid ? `uid:${uid}` : `ip:${req.ip ?? "none"}`;
  const verdict = chatLimiter.check(limiterKey);
  if (!verdict.allowed) {
    res.setHeader("Retry-After", String(verdict.retryAfterSec));
    res.status(429).json({ error: "rate_limited" });
    return;
  }

  const parsed = parseRequest(req.body);
  if (!parsed) {
    res.status(400).json({
      error: `invalid request: 'message' is required (max ${MESSAGE_MAX_CHARS} chars)`,
    });
    return;
  }

  // Quota / plan gate — the server is the source of truth (DESIGN §8). The client's
  // localStorage counter and Pro toggle are only UI nudges. Checked after
  // parseRequest so a malformed turn never burns quota.
  if (!uid) {
    // Anonymous: a small daily free-trial allowance, metered per hashed IP, always on
    // the flash model. No entitlement and no credits — there's no account to bill;
    // when the trial is spent the client nudges the visitor to sign in.
    parsed.provider = undefined; // never the Pro model for an anonymous caller
    const quota = await consumeDailyQuota(anonQuotaKey(req.ip), ANON_DAILY_LIMIT_PARAM.value());
    if (!quota.allowed) {
      logger.info("funnel", { event: "anon_quota_exhausted" });
      res.setHeader("Retry-After", String(quota.retryAfterSec));
      res.status(429).json({ error: "quota_exceeded" });
      return;
    }
  } else {
    // Signed-in: free users are held to the daily free-question allowance and never
    // get the Pro model regardless of what the client sends; paid users bypass both.
    const paid = isPaidActive(await readEntitlement(uid));
    if (!paid) {
      parsed.provider = undefined; // collapse a client-requested 'pro' tier to flash
      const quota = await consumeDailyQuota(uid, FREE_DAILY_LIMIT_PARAM.value());
      // Past the daily free allowance a purchased credit (if any) covers the turn;
      // only 429 when neither free questions nor credits remain.
      if (!quota.allowed) {
        const credit = await consumeCredit(uid);
        // Structured funnel events (Cloud Logging → offline conversion analysis):
        // hitting the wall is the upsell moment; a spent credit is micro-revenue.
        // `emailVerified` lets us segment conversion by verified-vs-unverified sign-up.
        logger.info("funnel", {
          event: credit ? "credit_spent" : "quota_exhausted",
          uid,
          emailVerified,
        });
        if (!credit) {
          res.setHeader("Retry-After", String(quota.retryAfterSec));
          res.status(429).json({ error: "quota_exceeded" });
          return;
        }
      }
    }
  }

  const streaming = req.query.stream === "1";

  if (!streaming) {
    // Buffered path — same flow, single JSON result.
    try {
      const out = await captainAdelFlow(parsed);
      res.json({
        answer: out.answer,
        sources: out.sources,
        kind: out.kind,
        refusalClass: out.refusalClass,
        meta: { provider: out.meta.provider },
      });
    } catch (err) {
      logger.error("chat failed (buffered)", { err });
      res.status(500).json({ error: "chat failed" });
    }
    return;
  }

  // Streaming path — legacy SSE frame protocol.
  res.writeHead(200, SSE_HEADERS);
  res.write(pingFrame()); // open the stream promptly
  let aborted = false;
  req.on("close", () => {
    aborted = true;
  });

  try {
    const { stream, output } = captainAdelFlow.stream(parsed);
    for await (const delta of stream) {
      if (aborted) return; // client gone — stop consuming
      if (delta) res.write(frame({ type: "token", delta }));
    }
    if (aborted) return;
    const out = await output;
    res.write(
      frame({
        type: "final",
        answer: out.answer,
        sources: out.sources,
        kind: out.kind,
        refusalClass: out.refusalClass,
        meta: { provider: out.meta.provider },
      }),
    );
    res.write(doneFrame());
    res.end();
  } catch (err) {
    logger.error("chat failed (stream)", { err });
    if (!aborted) {
      res.write(frame({ type: "error", code: "stream_failed" }));
      res.write(doneFrame());
      res.end();
    }
  }
});

// Licensed Captain Adel API (DESIGN — data/API licensing). External callers (LMS
// vendors, schools' portals) authenticate with a minted API key — not a Firebase
// user or App Check — and receive a plain buffered JSON answer + citations. The key
// is looked up by hash, rate-limited and metered per key. Streaming, history and
// the Pro tier stay app-only; this surface is deliberately minimal.
app.post(["/v1/ask", "/api/v1/ask"], async (req: Request, res: Response): Promise<void> => {
  const key = extractApiKey(req.header("authorization"), req.header("x-api-key"));
  if (!key) {
    res.status(401).json({ error: "api key required" });
    return;
  }
  const hash = hashApiKey(key);

  const verdict = apiKeyLimiter.check(`key:${hash}`);
  if (!verdict.allowed) {
    res.setHeader("Retry-After", String(verdict.retryAfterSec));
    res.status(429).json({ error: "rate_limited" });
    return;
  }

  const db = getFirestore();
  // Key doc (auth + tier) and usage doc (monthly meter) read together.
  const [keyDoc, usageDoc] = await Promise.all([
    db.collection("apiKeys").doc(hash).get(),
    db.collection("apiUsage").doc(hash).get(),
  ]);
  if (!keyDoc.exists || keyDoc.data()?.active === false) {
    res.status(401).json({ error: "invalid api key" });
    return;
  }

  // Tier monthly-quota gate. The plan's answer allowance is the metered value we sell;
  // a key with no `tier` defaults to enterprise (uncapped) so legacy keys aren't
  // throttled. The per-minute rate limiter above is a separate, coarse safety net.
  const tier = apiTier(keyDoc.data()?.tier);
  const month = monthKey(new Date());
  const usedThisMonth =
    (usageDoc.data()?.months as Record<string, number> | undefined)?.[month] ?? 0;
  const quota = API_TIERS[tier].monthlyQuota;
  if (quota !== null) {
    res.setHeader("X-Quota-Limit", String(quota));
    res.setHeader("X-Quota-Used", String(usedThisMonth));
  }
  if (isOverMonthlyQuota(usedThisMonth, tier)) {
    res.status(429).json({ error: "monthly_quota_exceeded", tier, quota });
    return;
  }

  const parsed = parseRequest(req.body);
  if (!parsed) {
    res.status(400).json({
      error: `invalid request: 'message' is required (max ${MESSAGE_MAX_CHARS} chars)`,
    });
    return;
  }

  // Meter per key, bucketed by calendar month (best-effort; the quota gate above reads
  // the month bucket, billing reads it offline). Never blocks the answer on the write.
  void db
    .collection("apiUsage")
    .doc(hash)
    .set(
      {
        count: FieldValue.increment(1),
        lastUsedAt: FieldValue.serverTimestamp(),
        months: { [month]: FieldValue.increment(1) },
      },
      { merge: true },
    )
    .catch((err) => logger.error("api usage metering failed", { err }));

  const remaining = remainingThisMonth(usedThisMonth + 1, tier);
  if (remaining !== null) res.setHeader("X-Quota-Remaining", String(remaining));

  try {
    const out = await captainAdelFlow(parsed);
    res.json({
      answer: out.answer,
      sources: out.sources,
      kind: out.kind,
      refusalClass: out.refusalClass,
      meta: { provider: out.meta.provider },
    });
  } catch (err) {
    logger.error("v1/ask failed", { err });
    res.status(500).json({ error: "ask failed" });
  }
});

// Session Login Endpoint: exchanges a client-validated Firebase ID token for an HttpOnly session cookie
app.post(["/auth/session-login", "/api/auth/session-login"], async (req: Request, res: Response): Promise<void> => {
  const { idToken } = req.body;
  if (!idToken || typeof idToken !== "string") {
    res.status(400).json({ error: "idToken is required" });
    return;
  }

  // Set session expiration: 5 days
  const expiresIn = 5 * 24 * 60 * 60 * 1000;

  try {
    // Verify token to prove authenticity
    const decodedIdToken = await getAuth().verifyIdToken(idToken);
    
    // Create the session cookie
    const sessionCookie = await getAuth().createSessionCookie(idToken, { expiresIn });
    
    // Secure cookie flags
    const isProduction = process.env.NODE_ENV === "production";
    const cookieOptions = {
      maxAge: expiresIn,
      httpOnly: true,
      secure: isProduction || req.secure || req.headers["x-forwarded-proto"] === "https",
      sameSite: "strict" as const,
      path: "/"
    };

    res.cookie("session", sessionCookie, cookieOptions);
    res.status(200).json({ success: true, uid: decodedIdToken.uid });
  } catch (err) {
    logger.error("Failed to create Firebase session cookie", { err });
    res.status(401).json({ error: "unauthorized" });
  }
});

// Session Logout Endpoint: clears the HttpOnly session cookie
app.post(["/auth/session-logout", "/api/auth/session-logout"], (req: Request, res: Response) => {
  res.clearCookie("session", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/"
  });
  res.status(200).json({ success: true });
});

// 👍/👎 on an answer. We log it (structured) for offline quality review — there
// is no feedback datastore yet, so this is intentionally a thin, best-effort sink.
app.post(["/feedback", "/api/feedback"], async (req: Request, res: Response): Promise<void> => {
  let uid: string | undefined;
  try {
    ({ uid } = await authenticate(req));
  } catch (err) {
    if (err instanceof AuthError) {
      res.status(403).json({ error: err.message });
      return;
    }
    throw err;
  }

  const fb = parseFeedback(req.body);
  if (!fb) {
    res.status(400).json({ error: "invalid request: 'rating' must be 'up' or 'down'" });
    return;
  }

  // Structured jsonPayload (was a JSON string inside textPayload) — the sink is
  // read for offline quality review, so filter on jsonPayload fields now.
  logger.info("captain-adel-feedback", { ...fb, uid });
  res.status(204).end();
});

/** JSON 404 for unknown paths (the raw function URL has no SPA fallback). Exported for tests. */
export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: "not found" });
}

/**
 * Final safety net — Express 5 forwards rejected async handlers here (e.g. a
 * non-AuthError rethrow from `authenticate`); the in-route try/catches stay
 * primary. Never leak the error to the client; if headers are already out
 * (mid-SSE) just terminate the stream rather than corrupt it. Exported for tests.
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Express detects error middleware by arity(4)
  _next: NextFunction,
): void {
  logger.error("gateway unhandled error", { path: req.path, err });
  if (res.headersSent) {
    res.end();
    return;
  }
  res.status(500).json({ error: "internal error" });
}

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
