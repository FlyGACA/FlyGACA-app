/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {setGlobalOptions} from "firebase-functions";
import {onRequest} from "firebase-functions/https";
import * as logger from "firebase-functions/logger";

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({ maxInstances: 10 });

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
 * Fly GACA Cloud Functions entry point.
 *
 * `chat` is the Captain Adel RAG gateway — a Gemini-powered Genkit flow exposed
 * over the legacy `/api/chat` HTTP + SSE contract via an Express app (see
 * docs/DESIGN-genkit-rag-backend.md). It replaces the legacy `flygaca/flygaca`
 * brain. `functions/api/[[path]].ts` (Cloudflare proxy) forwards same-origin
 * `/api/*` here; Firebase Hosting rewrites `/api/**` to this function.
 *
 * Note: `src/genkit-sample.ts` is the scaffold example only — it is not imported
 * here, so it is not deployed.
 */
import { setGlobalOptions } from "firebase-functions";
import { onRequest } from "firebase-functions/https";
import { defineSecret } from "firebase-functions/params";
import { app } from "./gateway.js";

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
