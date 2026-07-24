import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { enabled } from '@/lib/analytics';

/**
 * Vercel Web Analytics + Speed Insights wrapper. Only renders in production
 * on the web build — the native App Store builds stay free of web beacons,
 * and dev/test never emit.
 */
export function AnalyticsProvider() {
  if (!enabled()) return null;

  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  );
}
