/**
 * Single source of truth for the Cloud Functions deploy region (DESIGN §8 N2).
 *
 * The deployed functions run in me-central1 — firebase.json's Hosting rewrites
 * must name the same region or Hosting refuses to finalize the version (see
 * commit 5aa6451, which repaired exactly that drift). firebase.json cannot
 * import this constant, so every rewrite's "region" field has to be kept in
 * sync by hand whenever this changes. Moving to me-central2 (in-Kingdom, PDPL —
 * Firestore already lives there) is a deliberate migration, not a one-line
 * edit: deploy the functions to me-central2 FIRST, flip this config LAST, then
 * delete the stranded me-central1 functions. See docs/RUNBOOK-deploy.md for the
 * cutover procedure.
 */
export const REGION = "me-central1";
