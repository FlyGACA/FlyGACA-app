import { track } from '@vercel/analytics';
import { isNative } from '@/lib/native/nativeBridge';

/** Whether analytics should run at all: web only (the native App Store builds
 *  stay free of web beacons) and production only (dev/test never emit). */
export function enabled(): boolean {
  return !isNative() && import.meta.env.PROD;
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
