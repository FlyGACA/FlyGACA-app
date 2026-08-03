/**
 * Single source of truth for the Cloud Functions deploy region (DESIGN §8 N2).
 *
 * me-central2 (Dammam, Saudi Arabia) is the in-Kingdom region: it co-locates the
 * functions with the Firestore data (firebase.json's firestore.location is already
 * me-central2) and keeps request processing in-Kingdom for the PDPL. firebase.json's
 * Hosting rewrites must name the same region or Hosting refuses to finalize the
 * version (see commit 5aa6451, which repaired exactly that drift). firebase.json
 * cannot import this constant, so every rewrite's "region" field has to be kept in
 * sync by hand whenever this changes (the region.test.ts drift-guard enforces it).
 *
 * Changing this value is a deliberate migration, not just an edit: deploying creates
 * new functions in the new region and STRANDS the live ones (delete them afterward,
 * e.g. `firebase functions:delete chat --region me-central1`). The client's
 * FUNCTIONS_REGION (src/lib/services/firebase.ts) must ship in the same deploy so
 * callables keep resolving. See docs/RUNBOOK-deploy.md for the cutover procedure.
 */
export const REGION = "me-central2";
