/**
 * Firebase bootstrap — config-gated and lazy.
 *
 * The web config comes from `VITE_FIREBASE_*` env (public, non-secret). When it
 * is absent — CI, the preview build, any contributor without secrets — every
 * accessor resolves to `null` and the app stays fully local-first (see
 * `account.ts`). The SDK is pulled in via dynamic `import()` only when config is
 * present AND something actually needs Auth/Firestore, so `firebase/*` never
 * enters the main bundle.
 *
 * In dev, set `VITE_FIREBASE_EMULATOR=1` to point Auth/Firestore at the local
 * Firebase Emulator Suite (see docs/RUNBOOK-firebase.md).
 */
import type { FirebaseApp } from 'firebase/app';
import type { Analytics } from 'firebase/analytics';
import type { AppCheck } from 'firebase/app-check';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type { Functions } from 'firebase/functions';

const env = import.meta.env;

/** Functions region — must match the deployed gateway (functions/region.js). */
export const FUNCTIONS_REGION = 'me-central2';

export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  databaseURL: env.VITE_FIREBASE_DATABASE_URL as string | undefined,
  projectId: env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: env.VITE_FIREBASE_APP_ID as string | undefined,
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID as string | undefined,
};

/** True once the minimal web config (apiKey + projectId + appId) is present. */
export function isFirebaseConfigured(): boolean {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);
}

/** Whether to wire Auth/Firestore to the local emulator (dev + opt-in flag). */
function useEmulator(): boolean {
  return Boolean(import.meta.env.DEV && env.VITE_FIREBASE_EMULATOR === '1');
}

/** The App Check instance, kept so callers can mint tokens for raw fetches. */
let appCheck: AppCheck | null = null;

let appPromise: Promise<FirebaseApp | null> | null = null;
function getApp(): Promise<FirebaseApp | null> {
  if (!isFirebaseConfigured()) return Promise.resolve(null);
  appPromise ??= (async () => {
    const { initializeApp } = await import('firebase/app');
    const app = initializeApp({
      apiKey: firebaseConfig.apiKey,
      authDomain: firebaseConfig.authDomain,
      databaseURL: firebaseConfig.databaseURL,
      projectId: firebaseConfig.projectId,
      storageBucket: firebaseConfig.storageBucket,
      messagingSenderId: firebaseConfig.messagingSenderId,
      appId: firebaseConfig.appId,
      measurementId: firebaseConfig.measurementId,
    });
    const siteKey = env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY as string | undefined;
    if (siteKey && !useEmulator()) {
      try {
        const { initializeAppCheck, ReCaptchaEnterpriseProvider } =
          await import('firebase/app-check');
        appCheck = initializeAppCheck(app, {
          provider: new ReCaptchaEnterpriseProvider(siteKey),
          isTokenAutoRefreshEnabled: true,
        });
      } catch {
        /* App Check is best-effort; never block sign-in on it */
      }
    }
    // Analytics is best-effort, browser-only, and opt-in via measurementId. Never
    // wired to the emulator and never allowed to block app bootstrap.
    if (firebaseConfig.measurementId && !useEmulator() && typeof window !== 'undefined') {
      try {
        const { getAnalytics, isSupported } = await import('firebase/analytics');
        if (await isSupported()) getAnalytics(app);
      } catch {
        /* Analytics is non-essential; ignore environments where it can't load */
      }
    }
    return app;
  })();
  return appPromise;
}

/**
 * Current App Check token, or `null` when App Check isn't active (no site key,
 * emulator, init failure, or unconfigured). Callable functions attach this
 * automatically; raw `fetch`es to the gateway (`/api/*`) must pass it through as
 * the `X-Firebase-AppCheck` header. Best-effort — never throws, so a missing
 * token degrades to an unverified request rather than blocking the call.
 */
export async function getAppCheckToken(): Promise<string | null> {
  await getApp(); // ensures App Check init was attempted (memoized)
  if (!appCheck) return null;
  try {
    const { getToken } = await import('firebase/app-check');
    return (await getToken(appCheck, /* forceRefresh */ false)).token;
  } catch {
    return null;
  }
}

let authPromise: Promise<Auth | null> | null = null;
export function getFirebaseAuth(): Promise<Auth | null> {
  if (!isFirebaseConfigured()) return Promise.resolve(null);
  authPromise ??= (async () => {
    const app = await getApp();
    if (!app) return null;
    const { getAuth, connectAuthEmulator } = await import('firebase/auth');
    const auth = getAuth(app);
    if (useEmulator()) {
      connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    }
    return auth;
  })();
  return authPromise;
}

let dbPromise: Promise<Firestore | null> | null = null;
export function getDb(): Promise<Firestore | null> {
  if (!isFirebaseConfigured()) return Promise.resolve(null);
  dbPromise ??= (async () => {
    const app = await getApp();
    if (!app) return null;
    const { getFirestore, connectFirestoreEmulator } = await import('firebase/firestore');
    const db = getFirestore(app);
    if (useEmulator()) connectFirestoreEmulator(db, '127.0.0.1', 8080);
    return db;
  })();
  return dbPromise;
}

let fnsPromise: Promise<Functions | null> | null = null;
export function getFns(): Promise<Functions | null> {
  if (!isFirebaseConfigured()) return Promise.resolve(null);
  fnsPromise ??= (async () => {
    const app = await getApp();
    if (!app) return null;
    const { getFunctions, connectFunctionsEmulator } = await import('firebase/functions');
    const fns = getFunctions(app, FUNCTIONS_REGION);
    if (useEmulator()) connectFunctionsEmulator(fns, '127.0.0.1', 5001);
    return fns;
  })();
  return fnsPromise;
}

let analyticsPromise: Promise<Analytics | null> | null = null;
/**
 * Lazy GA4 client — resolves to `null` unless config + `measurementId` are
 * present, we're in a real browser, and the SDK reports analytics is supported
 * (so SSR, tests, the emulator, and unsupported native webviews all no-op).
 */
export function getAnalyticsClient(): Promise<Analytics | null> {
  if (!isFirebaseConfigured() || !firebaseConfig.measurementId) return Promise.resolve(null);
  if (typeof window === 'undefined') return Promise.resolve(null);
  analyticsPromise ??= (async () => {
    if (useEmulator()) return null;
    const app = await getApp();
    if (!app) return null;
    const { getAnalytics, isSupported } = await import('firebase/analytics');
    if (!(await isSupported())) return null;
    return getAnalytics(app);
  })();
  return analyticsPromise;
}
