/**
 * Validates and resolves post-auth redirect URLs.
 * Pure (no DOM / no router) so it is unit-testable. Ensures redirect targets
 * are strictly safe relative paths starting with a single slash `/` to prevent
 * Open Redirect vulnerabilities (e.g. `//evil.com` or `https://evil.com`).
 */

export function getSafeRedirectUrl(
  target: string | null | undefined,
  fallback = '/account',
): string {
  if (!target || typeof target !== 'string') {
    return fallback;
  }

  const trimmed = target.trim();
  if (!trimmed) {
    return fallback;
  }

  // Must start with a single `/` and NOT `//` or `/\` (protocol-relative URLs)
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.startsWith('/\\')) {
    return fallback;
  }

  // Must not contain scheme specs (e.g. `/http:`, `/javascript:`, `/data:`)
  if (/^\/[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
    return fallback;
  }

  return trimmed;
}
