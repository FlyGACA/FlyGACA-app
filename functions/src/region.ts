/**
 * Single source of truth for the Cloud Functions deploy region (DESIGN §8 N2).
 *
 * The deployed functions run in me-central1 — firebase.json's Hosting rewrites
 * must name the same region or Hosting refuses to finalize the version (see
 * commit 5aa6451, which repaired exactly that drift). firebase.json cannot
 * import this constant, so every rewrite's "region" field has to be kept in
 * sync by hand whenever this changes. Moving to me-central2 (closer to the
 * Firestore location) is a deliberate migration, not a one-line edit: it
 * creates new functions and strands the live ones.
 */
export const REGION = "me-central1";
