/**
 * HTTP gateway for `/api/chat` (DESIGN §3 D1, §4). An Express app — NOT
 * `onCallGenkit` — so the existing frontend SSE contract is preserved verbatim.
 * It owns auth + App Check, then drives the protocol-agnostic `captainAdelFlow`
 * and translates its stream/result into either the legacy SSE frames or a
 * buffered `ChatResponse`.
 */
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import type { Request, Response } from 'express';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getAppCheck } from 'firebase-admin/app-check';
import { captainAdelFlow } from './captain-adel.js';
import { parseFeedback } from './feedback-core.js';
import { frame, doneFrame, pingFrame, SSE_HEADERS } from './sse.js';
import type { ChatRequest, ChatTurn } from './contract.js';

if (getApps().length === 0) initializeApp();

const ENFORCE_APP_CHECK =
  process.env.ENFORCE_APP_CHECK === '1' || process.env.ENFORCE_APP_CHECK === 'true';

/** Thrown by `authenticate` when an enforced check fails → mapped to 403. */
export class AuthError extends Error {}

/**
 * Verify the Firebase ID token (optional → anonymous) and App Check token
 * (enforced in prod). Returns the uid when a valid token was presented.
 *
 * Exported for unit testing; the route handlers below are the only callers.
 */
export async function authenticate(req: Request): Promise<{ uid?: string }> {
  const appCheckToken = req.header('X-Firebase-AppCheck');
  if (ENFORCE_APP_CHECK) {
    if (!appCheckToken) throw new AuthError('missing App Check token');
    try {
      await getAppCheck().verifyToken(appCheckToken);
    } catch {
      throw new AuthError('invalid App Check token');
    }
  }

  const authz = req.header('Authorization');
  const idToken = authz?.startsWith('Bearer ') ? authz.slice(7) : undefined;
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

/** Coerce a raw request body into a validated `ChatRequest` (or null). Exported for unit testing. */
export function parseRequest(body: unknown): ChatRequest | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  if (typeof b.message !== 'string' || b.message.trim() === '') return null;

  const history: ChatTurn[] = Array.isArray(b.history)
    ? (b.history as unknown[])
        .filter(
          (t): t is ChatTurn =>
            !!t &&
            typeof t === 'object' &&
            (('role' in t &&
              ((t as ChatTurn).role === 'user' ||
                (t as ChatTurn).role === 'assistant')) as boolean) &&
            typeof (t as ChatTurn).content === 'string',
        )
        .slice(-12) // cap history length (cost control, DESIGN N4)
    : [];

  return {
    message: b.message,
    history,
    product: typeof b.product === 'string' ? b.product : 'flygaca',
    provider: typeof b.provider === 'string' ? b.provider : undefined,
    session: typeof b.session === 'string' ? b.session : undefined,
  };
}

const app = express();
// Security middleware
app.use(helmet());
// Rate limiting: 30 requests per minute per IP
app.use(
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
  }),
);
// CORS: restrict to same origin (adjust if needed)
app.use((req, res, next) => {
  const allowedOrigin = req.headers.origin ?? '';
  // Allow requests from the same host (including preview deployments)
  // You can customize this list as needed.
  if (
    allowedOrigin === '' ||
    allowedOrigin.endsWith('.flygaca-app.web.app') ||
    allowedOrigin.endsWith('.flygaca-app.firebaseapp.com') ||
    allowedOrigin.startsWith('http://localhost:') ||
    allowedOrigin.startsWith('http://127.0.0.1:')
  ) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Firebase-AppCheck',
    );
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    return next();
  }
  return res.status(403).json({ error: 'CORS not allowed' });
});

app.post(['/chat', '/api/chat'], async (req: Request, res: Response): Promise<void> => {
  // Auth / App Check.
  try {
    await authenticate(req);
  } catch (err) {
    if (err instanceof AuthError) {
      res.status(403).json({ error: err.message });
      return;
    }
    throw err;
  }

  const parsed = parseRequest(req.body);
  if (!parsed) {
    res.status(400).json({ error: "invalid request: 'message' is required" });
    return;
  }

  const streaming = req.query.stream === '1';

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
      console.error('chat failed (buffered)', err);
      res.status(500).json({ error: 'chat failed' });
    }
    return;
  }

  // Streaming path — legacy SSE frame protocol.
  res.writeHead(200, SSE_HEADERS);
  res.write(pingFrame()); // open the stream promptly
  let aborted = false;
  req.on('close', () => {
    aborted = true;
  });

  try {
    const { stream, output } = captainAdelFlow.stream(parsed);
    for await (const delta of stream) {
      if (aborted) return; // client gone — stop consuming
      if (delta) res.write(frame({ type: 'token', delta }));
    }
    if (aborted) return;
    const out = await output;
    res.write(
      frame({
        type: 'final',
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
    console.error('chat failed (stream)', err);
    if (!aborted) {
      res.write(frame({ type: 'error', code: 'stream_failed' }));
      res.write(doneFrame());
      res.end();
    }
  }
});

// 👍/👎 on an answer. We log it (structured) for offline quality review — there
// is no feedback datastore yet, so this is intentionally a thin, best-effort sink.
app.post(['/feedback', '/api/feedback'], async (req: Request, res: Response): Promise<void> => {
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

  console.info('captain-adel-feedback', JSON.stringify({ ...fb, uid }));
  res.status(204).end();
});

export default app;
