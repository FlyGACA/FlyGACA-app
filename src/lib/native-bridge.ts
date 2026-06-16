/**
 * Capacitor native-bridge adapter. On the web this is inert; inside the iOS
 * (or Android) shell it routes auth/IAP/offline-cache through native plugins,
 * mirroring the legacy assets/js/native-bridge.js. Kept dependency-light so the
 * web build does not pull in Capacitor — the plugins are injected by the shell.
 */

interface CapacitorGlobal {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
}

function capacitor(): CapacitorGlobal | undefined {
  return (globalThis as { Capacitor?: CapacitorGlobal }).Capacitor;
}

/** True when running inside the native Capacitor shell. */
export function isNative(): boolean {
  return capacitor()?.isNativePlatform?.() ?? false;
}

/** 'ios' | 'android' | 'web'. */
export function platform(): string {
  return capacitor()?.getPlatform?.() ?? 'web';
}

/** Billing flavour: iOS uses RevenueCat IAP; web uses Stripe Checkout. */
export function billingChannel(): 'revenuecat' | 'stripe' {
  return platform() === 'ios' ? 'revenuecat' : 'stripe';
}
