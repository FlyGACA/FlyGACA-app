import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Firebase Hosting is the single serving front, so the Content-Security-Policy
 * lives in exactly one place: `firebase.json`. (It used to be hand-copied across
 * four fronts — Firebase, Vercel, Netlify, and `public/_headers` for Cloudflare —
 * and drifted: `public/_headers` never gained the Moyasar entries, and NO front
 * allowed the Cloud Functions host, so every `httpsCallable` was CSP-blocked. Those
 * mirror fronts are gone; this spec now just guards that the one policy keeps
 * allowing the origins the money path depends on.)
 */
const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

/** Pulls the CSP value out of firebase.json's `"value": "default-src …"`. */
function firebaseCsp(): string {
  const match = read('firebase.json').match(/"value":\s*"(default-src[^"]+)"/);
  expect(match, 'no Content-Security-Policy found in firebase.json').toBeTruthy();
  return match![1].trim();
}

const POLICY = firebaseCsp();

describe('firebase.json CSP allows the money-path origins', () => {
  // Directive-level assertions, so a well-meaning tidy-up that removes one of these
  // still fails rather than silently killing checkout.
  const REQUIRED: ReadonlyArray<[directive: string, origin: string, why: string]> = [
    ['script-src', 'https://cdn.moyasar.com', 'Moyasar hosted checkout widget (moyasar.js)'],
    ['style-src', 'https://cdn.moyasar.com', 'Moyasar widget stylesheet'],
    ['connect-src', 'https://api.moyasar.com', 'Apple Pay merchant validation'],
    ['frame-src', 'https://api.moyasar.com', '3-D Secure challenge frame'],
    [
      'connect-src',
      'https://me-central1-flygaca-app.cloudfunctions.net',
      'httpsCallable billing endpoints — NOT covered by *.googleapis.com',
    ],
  ];

  it.each(REQUIRED)('%s allows %s (%s)', (directive, origin) => {
    const section = POLICY.split(';').find((d) => d.trim().startsWith(`${directive} `));
    expect(section, `no ${directive} directive`).toBeTruthy();
    expect(section, `${directive} is missing ${origin}`).toContain(origin);
  });

  it('does not deindex the canonical host', () => {
    // Firebase serves canonical flygaca.com, so it must never carry X-Robots-Tag.
    // (The flygaca-app.web.app duplicate is handled by the canonical tag + the
    // runtime `.web.app` noindex in main.tsx, not by a header here.)
    expect(read('firebase.json')).not.toMatch(/"X-Robots-Tag"/);
  });
});
