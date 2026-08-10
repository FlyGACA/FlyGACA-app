import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The Content-Security-Policy is hand-maintained in FOUR places — one per serving
 * front — because none of them can read another's config: `firebase.json`
 * (Firebase Hosting), `vercel.json`, `netlify.toml`, and `public/_headers` (the
 * Cloudflare Workers static-assets layer, which also serves Netlify).
 *
 * That is exactly how the policy drifted: `public/_headers` was written when
 * Cloudflare was a mirror and never gained the Moyasar entries, so the checkout
 * widget was CSP-blocked there; and NO front allowed the Cloud Functions host, so
 * every `httpsCallable` — createCheckoutConfig, confirmPayment, cancelAutoRenew,
 * getReferralCode, and the staff/school/founding/org claims — was blocked on all
 * of them. This spec is the drift guard: the four strings must stay identical, and
 * must keep allowing the origins the money path depends on.
 */
const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

/** Pulls the CSP value out of each front's own config syntax. */
function cspFrom(file: string, source: string): string {
  const patterns: Record<string, RegExp> = {
    // firebase.json / vercel.json: JSON `"value": "default-src …"`
    json: /"value":\s*"(default-src[^"]+)"/,
    // netlify.toml: `Content-Security-Policy = "default-src …"`
    toml: /Content-Security-Policy\s*=\s*"(default-src[^"]+)"/,
    // _headers: `  Content-Security-Policy: default-src …` (to end of line)
    headers: /^\s*Content-Security-Policy:\s*(default-src.+)$/m,
  };
  const match = source.match(patterns[file]);
  expect(match, `no Content-Security-Policy found (${file} syntax)`).toBeTruthy();
  return match![1].trim();
}

const POLICIES = {
  'firebase.json': cspFrom('json', read('firebase.json')),
  'vercel.json': cspFrom('json', read('vercel.json')),
  'netlify.toml': cspFrom('toml', read('netlify.toml')),
  'public/_headers': cspFrom('headers', read('public/_headers')),
};

describe('CSP parity across the serving fronts', () => {
  it('all four fronts declare an identical policy', () => {
    const [reference, ...rest] = Object.entries(POLICIES);
    for (const [name, policy] of rest) {
      expect(policy, `${name} has drifted from ${reference[0]}`).toBe(reference[1]);
    }
  });

  // Directive-level assertions, so a well-meaning tidy-up that removes one of
  // these from all four at once still fails rather than silently killing checkout.
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
    for (const [name, policy] of Object.entries(POLICIES)) {
      const section = policy.split(';').find((d) => d.trim().startsWith(`${directive} `));
      expect(section, `${name}: no ${directive} directive`).toBeTruthy();
      expect(section, `${name}: ${directive} is missing ${origin}`).toContain(origin);
    }
  });

  it('only the mirror fronts noindex — never public/_headers', () => {
    // _headers is shared with the canonical Cloudflare front, so a noindex there
    // would deindex flygaca.com itself. The mirrors carry their own rule.
    expect(read('public/_headers')).not.toMatch(/^\s*X-Robots-Tag:/m);
    expect(read('netlify.toml')).toMatch(/X-Robots-Tag\s*=\s*"noindex/);
    expect(read('vercel.json')).toMatch(/"X-Robots-Tag"/);
  });
});
