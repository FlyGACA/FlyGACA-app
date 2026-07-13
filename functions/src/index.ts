/**
 * Cloud Functions entry point. Only the triggers exported here are deployed, so
 * this file is the single manifest of the backend's functions:
 *  - `chat`            — the Captain Adel gateway (Express app in ./gateway).
 *  - Stripe billing    — checkout / portal callables + the webhook (./billing).
 *  - `claimStaffAccess`— complimentary staff full-access grant (./staff).
 *
 * Deploy region is pinned in ./region (must match firebase.json's rewrite regions).
 */
import { setGlobalOptions } from "firebase-functions";
import { onRequest } from "firebase-functions/https";
import { defineSecret } from "firebase-functions/params";
import app from "./gateway.js";
import { REGION } from "./region.js";

// Stripe billing — checkout/portal callables, the entitlement webhook, and the
// referral-code callable.
export {
  createCheckoutSession,
  createBillingPortalSession,
  getReferralCode,
  stripeWebhook,
} from "./billing.js";

// Staff / complimentary full-access grant (see ./staff.ts).
export { claimStaffAccess } from "./staff.js";

// The Google GenAI API key the Captain Adel flow (genkit `googleAI()`) reads from
// the environment. Bound as a secret so it is available to the `chat` container.
const geminiApiKey = defineSecret("GOOGLE_GENAI_API_KEY");

export const chat = onRequest(
  {
    region: REGION,
    secrets: [geminiApiKey],
    // The 18 MB corpus + BM25 index live in memory on warm instances.
    memory: "1GiB",
    // Streamed turns can be long-lived.
    timeoutSeconds: 300,
    invoker: "public", // public edge; auth/App Check enforced in the app
  },
  app,
);

// Cap concurrent containers per function as a cost control against traffic spikes.
setGlobalOptions({ maxInstances: 10 });
