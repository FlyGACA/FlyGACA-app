/**
 * Fly GACA Cloud Functions entry point.
 *
 * `chat` is the Captain Adel RAG gateway — a Gemini-powered Genkit flow exposed
 * over the legacy `/api/chat` HTTP + SSE contract via an Express app (see
 * docs/DESIGN-genkit-rag-backend.md). It replaces the legacy Fly GACA
 * brain. The Cloudflare Worker (`worker/index.ts`) forwards same-origin `/api/*`
 * here; Firebase Hosting rewrites `/api/**` to this function.
 *
 * Note: `src/genkit-sample.ts` is the scaffold example only — it is not imported
 * here, so it is not deployed.
 */
import { setGlobalOptions } from "firebase-functions";
import { onRequest } from "firebase-functions/https";
import { defineSecret } from "firebase-functions/params";
import app from "./gateway.js";

// Gemini API key — stored in Cloud Secret Manager, bound only to `chat`.
const geminiApiKey = defineSecret("GOOGLE_GENAI_API_KEY");

// Cost control: cap concurrent containers (DESIGN N4).
setGlobalOptions({ maxInstances: 10 });

export const chat = onRequest(
  {
    region: "me-central2",
    secrets: [geminiApiKey],
    // The 18 MB corpus + BM25 index live in memory on warm instances.
    memory: "1GiB",
    // Streamed turns can be long-lived.
    timeoutSeconds: 300,
    invoker: "public", // public edge; auth/App Check enforced in the app
  },
  app,
);

// Stripe billing: checkout + portal callables and the entitlement-writing webhook.
export {
  createCheckoutSession,
  createBillingPortalSession,
  stripeWebhook,
} from "./billing.js";
