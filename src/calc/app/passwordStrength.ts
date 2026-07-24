/**
 * Password strength scoring for the sign-up form. Pure (no DOM / no i18n) so the
 * meter is unit-testable and the same rule can be reused anywhere. The score is a
 * coarse 0–4 signal for a visual meter — it is NOT a security control (Firebase
 * enforces the real minimum server-side); it only nudges users toward a stronger
 * secret. The four non-empty buckets map 1→weak … 4→strong.
 */

export type PasswordStrength = 'weak' | 'fair' | 'good' | 'strong';

export interface PasswordScore {
  /** 0 for empty, else 1–4 for the meter (segments filled). */
  score: 0 | 1 | 2 | 3 | 4;
  /** Bucket label; the i18n key is `account.pw.<label>`. */
  label: PasswordStrength;
}

const LABELS: Record<1 | 2 | 3 | 4, PasswordStrength> = {
  1: 'weak',
  2: 'fair',
  3: 'good',
  4: 'strong',
};

/** The minimum Firebase Auth accepts — mirror it so the client can pre-empt the round-trip. */
export const MIN_PASSWORD_LENGTH = 6;

/**
 * Score a password on length and character-class variety. Empty → {0,'weak'}.
 * A too-short password (below the Firebase minimum) is always the weakest bucket
 * regardless of variety, so the meter can't read "good" on something that will be
 * rejected on submit.
 */
export function passwordStrength(pw: string): PasswordScore {
  if (!pw) return { score: 0, label: 'weak' };
  if (pw.length < MIN_PASSWORD_LENGTH) return { score: 1, label: 'weak' };

  let points = 1; // meets the minimum length
  if (pw.length >= 10) points++;
  if (pw.length >= 14) points++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) points++;
  if (/\d/.test(pw)) points++;
  if (/[^A-Za-z0-9]/.test(pw)) points++;

  const score = Math.min(4, points) as 1 | 2 | 3 | 4;
  return { score, label: LABELS[score] };
}
