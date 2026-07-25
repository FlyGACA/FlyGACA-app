/**
 * Cloud Functions entry point. Only the triggers exported here are deployed, so
 * this file is the single manifest of the backend's functions:
 *  - `chat`            — the Captain Adel gateway (Express app in ./gateway).
 *  - Moyasar billing   — checkout/confirm/cancel callables, the webhook, and the
 *                        token-renewal engine (./billing).
 *  - `claimStaffAccess`— complimentary staff full-access grant (./staff).
 *  - `claimSchoolSeat` — self-serve school-seat grant (domain/invite, ./school).
 *
 * Deploy region is pinned in ./region (must match firebase.json's rewrite regions).
 */
import { setGlobalOptions } from "firebase-functions";
import { onRequest } from "firebase-functions/https";
import { defineSecret } from "firebase-functions/params";
import app from "./gateway.js";
import { REGION } from "./region.js";

// Moyasar billing — checkout/confirm/cancel callables, the webhook, the daily
// renewal engine, and the referral-code callable.
export {
  createCheckoutConfig,
  confirmPayment,
  cancelAutoRenew,
  getReferralCode,
  moyasarWebhook,
  renewMoyasarSubscriptions,
} from "./billing.js";

// Staff / complimentary full-access grant (see ./staff.ts).
export { claimStaffAccess } from "./staff.js";

// Self-serve school-seat grant — verified email on an approved domain or the invite
// roster self-unlocks the `school` entitlement (see ./school.ts).
export { claimSchoolSeat } from "./school.js";

// B2B org admin — owner-verified cohort read + provisioning for the /business/admin
// dashboard (see ./org.ts). Callables: read-only path (getMyOrgs, getCohortReadiness)
// and self-serve provisioning (provisionSeats).
export { getMyOrgs, getCohortReadiness, provisionSeats } from "./org.js";

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
