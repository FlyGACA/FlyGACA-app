import { track } from '@vercel/analytics';
import type { Metric } from 'web-vitals';
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

export interface WebVitalPayload {
  name: string;
  value: number;
  rating: string;
  id: string;
}

/**
 * Shape a web-vitals `Metric` into a flat analytics payload. CLS is a unitless
 * ratio (kept to 3 dp); the timing metrics (LCP/INP/FCP/TTFB) are milliseconds,
 * rounded to whole numbers. Pure, so the mapping is unit-testable without the
 * browser performance APIs.
 */
export function webVitalPayload(metric: Metric): WebVitalPayload {
  return {
    name: metric.name,
    value:
      metric.name === 'CLS' ? Math.round(metric.value * 1000) / 1000 : Math.round(metric.value),
    rating: metric.rating,
    id: metric.id,
  };
}

/**
 * Field-measure Core Web Vitals and report each to the analytics sink. The
 * `web-vitals` library is **dynamically imported** so its code lands in its own
 * async chunk and never enters the initial JS bundle (the check:bundle budget is
 * untouched). LCP/INP/CLS are the three Google ranks on; FCP/TTFB round out the
 * diagnostic picture. Best-effort telemetry — a failed chunk load never throws
 * into the app. No-op off the web/prod path.
 */
export function reportWebVitals(): void {
  if (!enabled()) return;
  void import('web-vitals')
    .then(({ onCLS, onINP, onLCP, onFCP, onTTFB }) => {
      const report = (metric: Metric) => track('web_vital', { ...webVitalPayload(metric) });
      onCLS(report);
      onINP(report);
      onLCP(report);
      onFCP(report);
      onTTFB(report);
    })
    .catch(() => {
      /* best-effort telemetry — never break the app if the chunk fails to load */
    });
}
