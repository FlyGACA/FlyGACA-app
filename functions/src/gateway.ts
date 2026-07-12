/**
 * HTTP gateway for `/api/chat` (DESIGN §3 D1, §4). An Express app — NOT
 * `onCallGenkit` — so the existing frontend SSE contract is preserved verbatim.
 * It owns auth + App Check, then drives the protocol-agnostic `captainAdelFlow`
 * and translates its stream/result into either the legacy SSE frames or a
 * buffered `ChatResponse`.
 */
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import type { NextFunction, Request, Response } from "express";
import { logger } from "firebase-functions";
import { defineBoolean, defineInt } from "firebase-functions/params";
import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getAppCheck } from "firebase-admin/app-check";
import { getFirestore } from "firebase-admin/firestore";
import { captainAdelFlow } from "./captain-adel.js";
import { createRateLimiter } from "./rate-limit-core.js";
import { isPaidActive, type Entitlement } from "./billing-core.js";
import { checkDailyQuota, FREE_DAILY_LIMIT, type DailyUsage } from "./chat-quota-core.js";
import { parseFeedback } from "./feedback-core.js";
import { frame, doneFrame, pingFrame, SSE_HEADERS } from "./sse.js";
import type { ChatRequest, ChatTurn } from "./contract.js";

if (getApps().length === 0) initializeApp();

const ENFORCE_APP_CHECK = defineBoolean("ENFORCE_APP_CHECK", { default: false });

// Free Captain Adel questions per day — a deploy-time param so the free-tier limit
// can be tuned (A/B 3 vs 5/day) without a code change. The client counter stays a
// separate nudge; this is the enforced value.
const FREE_DAILY_LIMIT_PARAM = defineInt("FREE_DAILY_LIMIT", { default: FREE_DAILY_LIMIT });

/** Thrown by `authenticate` when an enforced check fails → mapped to 403. */
export class AuthError extends Error {}

/**
 * Verify the Firebase ID token (optional → anonymous) and App Check token
 * (enforced in prod). Returns the uid when a valid token was presented.
 *
 * Exported for unit testing; the route handlers below are the only callers.
 */
export async function authenticate(req: Request): Promise<{ uid?: string }> {
  const appCheckToken = req.header("X-Firebase-AppCheck");
  if (ENFORCE_APP_CHECK.value()) {
    if (!appCheckToken) throw new AuthError("missing App Check token");
    try {
      await getAppCheck().verifyToken(appCheckToken);
    } catch {
      throw new AuthError("invalid App Check token");
    }
  }

  const authz = req.header("Authorization");
  const idToken = authz?.startsWith("Bearer ") ? authz.slice(7) : undefined;
  if (idToken) {
    try {
      const decoded = await getAuth().verifyIdToken(idToken);
      return { uid: decoded.uid };
    } catch {
      // An invalid ID token is treated as anonymous, not fatal (mirrors legacy).
    }
  }
  return {};
}

/**
 * Hard input caps (cost control, DESIGN N4). History *count* was always capped
 * (12 turns); these bound the *size* of what reaches Gemini. An over-long
 * message is rejected (400) rather than truncated — silent truncation changes
 * the question; an over-long history turn is dropped like any other malformed
 * turn. Exported for unit testing.
 */
export const MESSAGE_MAX_CHARS = 4000;
export const HISTORY_CONTENT_MAX_CHARS = 8000;

/** Coerce a raw request body into a validated `ChatRequest` (or null). Exported for unit testing. */
export function parseRequest(body: unknown): ChatRequest | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  if (typeof b.message !== "string" || b.message.trim() === "") return null;
  if (b.message.length > MESSAGE_MAX_CHARS) return null;

  const history: ChatTurn[] = Array.isArray(b.history)
    ? (b.history as unknown[])
      .filter(
        (t): t is ChatTurn =>
          !!t &&
            typeof t === "object" &&
            (("role" in t &&
              ((t as ChatTurn).role === "user" ||
                (t as ChatTurn).role === "assistant")) as boolean) &&
            typeof (t as ChatTurn).content === "string" &&
            (t as ChatTurn).content.length <= HISTORY_CONTENT_MAX_CHARS,
      )
      .slice(-12) // cap history length (cost control, DESIGN N4)
    : [];

  return {
    message: b.message,
    history,
    product: typeof b.product === "string" ? b.product : "flygaca",
    provider: typeof b.provider === "string" ? b.provider : undefined,
    session: typeof b.session === "string" ? b.session : undefined,
  };
}

const app = express();
// Security middleware
app.use(helmet());
// req.ip = leftmost X-Forwarded-For. Without this the limiter below keys on the
// proxy's address, collapsing every real user into ~one shared bucket (30/min
// sitewide). The proxy-chain depth varies by front (direct function URL = 1 hop,
// Firebase Hosting = 2, Cloudflare Worker → Hosting = 3+), so no fixed hop count
// is right. Leftmost-XFF is client-forgeable, but a forger only shards their own
// bucket — real browsers never send XFF — and the hard cost control is the
// per-uid limiter on /chat below, behind auth.
app.set("trust proxy", true);
// Rate limiting: 30 requests per minute per IP — a best-effort backstop for
// unauthenticated traffic (which otherwise only ever reaches the cheap 401 path).
app.use(
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later." },
    skip: (req) => req.method === "OPTIONS", // CORS preflights don't burn budget
    validate: { trustProxy: false }, // permissive trust proxy is deliberate (see above)
  }),
);

// Per-uid chat limit — the hard cost control (DESIGN §8 N4). 20 turns/min is far
// above any human rate; state is per-instance (see rate-limit-core.ts caveat).
const chatLimiter = createRateLimiter({ limit: 20, windowMs: 60 * 1000 });

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
 * Atomically consume one free-tier question for `uid` in a Firestore transaction on
 * `chatUsage/{uid}` — durable across instances, unlike the in-memory burst limiter,
 * so the daily allowance can't be reset by clearing localStorage or spreading load
 * across function instances. On a transaction error it fails open (allowed); the
 * per-uid burst limiter is the hard backstop. `chatUsage` is server-only (deny-all
 * in firestore.rules).
 */
async function consumeFreeQuota(
  uid: string,
  limit: number,
): Promise<{ allowed: boolean; retryAfterSec: number }> {
  const db = getFirestore();
  const ref = db.collection("chatUsage").doc(uid);
  try {
    return await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const raw = snap.exists ? (snap.data() as Partial<DailyUsage>) : null;
      const verdict = checkDailyQuota(raw, new Date(), limit);
      if (verdict.allowed) tx.set(ref, verdict.usage);
      return { allowed: verdict.allowed, retryAfterSec: verdict.retryAfterSec };
    });
  } catch (err) {
    logger.error("chat quota transaction failed", { uid, err });
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
// CORS — explicit allowlist. Every front serves the SPA same-origin and proxies
// /api/* here, so the Origin we see is the page origin. Production fronts are
// listed exactly; preview/channel deploys match a few project-scoped suffixes.
const ALLOWED_ORIGINS = new Set([
  "https://flygaca.com",
  "https://www.flygaca.com",
  "https://flygaca-app.web.app",
  "https://flygaca-app.firebaseapp.com",
  "https://flygaca-app.vercel.app",
]);
// Project-scoped preview/channel hosts (https only). Add the Netlify / Cloudflare
// mirror origins here if those fronts are ever accessed directly.
const ALLOWED_ORIGIN_SUFFIXES = [
  ".flygaca-app.web.app", // Firebase Hosting preview channels
  ".flygaca-app.firebaseapp.com",
  "-flygaca-app.vercel.app", // Vercel git/preview deploys
];

function isAllowedOrigin(origin: string): boolean {
  if (ALLOWED_ORIGINS.has(origin)) return true;
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true; // local dev
  // The leading '.'/'-' in each suffix prevents look-alikes (e.g.
  // evil-flygaca-app.web.app) from matching a real subdomain we control.
  return (
    origin.startsWith("https://") &&
    ALLOWED_ORIGIN_SUFFIXES.some((suffix) => origin.endsWith(suffix))
  );
}

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
  // Auth / App Check. Captain Adel chat requires a signed-in Firebase user — an
  // absent/invalid ID token (anonymous) is rejected with 401, distinct from the
  // App Check 403 above.
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
  if (!uid) {
    res.status(401).json({ error: "sign-in required" });
    return;
  }

  const verdict = chatLimiter.check(`uid:${uid}`);
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

  // Plan gate — the server is the source of truth (DESIGN §8). Free users are held
  // to the daily free-question allowance and never get the Pro model, regardless of
  // what the client sends; the app's localStorage counter and Pro toggle are only
  // UI nudges. Checked after parseRequest so a malformed turn never burns quota.
  const paid = isPaidActive(await readEntitlement(uid));
  if (!paid) {
    parsed.provider = undefined; // collapse a client-requested 'pro' tier to flash
    const quota = await consumeFreeQuota(uid, FREE_DAILY_LIMIT_PARAM.value());
    // Past the daily free allowance a purchased credit (if any) covers the turn;
    // only 429 when neither free questions nor credits remain.
    if (!quota.allowed) {
      const credit = await consumeCredit(uid);
      // Structured funnel events (Cloud Logging → offline conversion analysis):
      // hitting the wall is the upsell moment; a spent credit is micro-revenue.
      logger.info("funnel", { event: credit ? "credit_spent" : "quota_exhausted", uid });
      if (!credit) {
        res.setHeader("Retry-After", String(quota.retryAfterSec));
        res.status(429).json({ error: "quota_exceeded" });
        return;
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
