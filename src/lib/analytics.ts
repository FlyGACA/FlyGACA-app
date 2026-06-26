import { inject, track } from '@vercel/analytics';
import { injectSpeedInsights } from '@vercel/speed-insights';
import { isNative } from './native-bridge';

let started = false;

/** Whether analytics should run at all: web only (the native App Store builds
 *  stay free of web beacons) and production only (dev/test never emit). */
function enabled(): boolean {
  return !isNative() && import.meta.env.PROD;
}

/**
 * Boot web product analytics + Core Web Vitals (Vercel). Web-only, prod-only,
 * and idempotent — safe to call once from the app entry. A no-op inside the
 * Capacitor shell and in dev/test, so nothing is shipped where it doesn't belong.
 */
export function initAnalytics(): void {
  if (started || !enabled()) return;
  started = true;
  inject();
  injectSpeedInsights();
}

/**
 * Report a caught client error to the analytics sink. This is the single hook
 * the top-level ErrorBoundary calls, and the natural insertion point for a
 * dedicated error tracker (e.g. Sentry) later. No-op off the web/prod path.
 */
export function reportError(error: unknown, info?: Record<string, string>): void {
  if (!enabled()) return;
  const message = error instanceof Error ? error.message : String(error);
  track('client_error', { message: message.slice(0, 200), ...info });
}
