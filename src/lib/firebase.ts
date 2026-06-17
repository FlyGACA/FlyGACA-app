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
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';

const env = import.meta.env;

export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  appId: env.VITE_FIREBASE_APP_ID as string | undefined,
};

/** True once the minimal web config (apiKey + projectId + appId) is present. */
export function isFirebaseConfigured(): boolean {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);
}

/** Whether to wire Auth/Firestore to the local emulator (dev + opt-in flag). */
function useEmulator(): boolean {
  return Boolean(import.meta.env.DEV && env.VITE_FIREBASE_EMULATOR === '1');
}

let appPromise: Promise<FirebaseApp | null> | null = null;
function getApp(): Promise<FirebaseApp | null> {
  if (!isFirebaseConfigured()) return Promise.resolve(null);
  appPromise ??= (async () => {
    const { initializeApp } = await import('firebase/app');
    const app = initializeApp({
      apiKey: firebaseConfig.apiKey,
      authDomain: firebaseConfig.authDomain,
      projectId: firebaseConfig.projectId,
      appId: firebaseConfig.appId,
    });
    const siteKey = env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY as string | undefined;
    if (siteKey && !useEmulator()) {
      try {
        const { initializeAppCheck, ReCaptchaEnterpriseProvider } =
          await import('firebase/app-check');
        initializeAppCheck(app, {
          provider: new ReCaptchaEnterpriseProvider(siteKey),
          isTokenAutoRefreshEnabled: true,
        });
      } catch {
        /* App Check is best-effort; never block sign-in on it */
      }
    }
    return app;
  })();
  return appPromise;
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
