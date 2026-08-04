/**
 * Remote Config — operational flags the server can flip without a redeploy.
 *
 * This is a **kill-switch channel, not an entitlement channel**. Whether a user
 * may use a paid feature is decided by `features.ts` from the server-written
 * entitlement; whether a surface is available *at all* right now (backend
 * degraded, payment provider down, a rollout being held back) is decided here.
 * Never gate paid access on a flag — a client can't be trusted with that, and
 * the gateway is the real enforcement point either way.
 *
 * The contract:
 *
 * - `REMOTE_FLAG_DEFAULTS` is the source of truth for the flag set, its types
 *   and its **safe baseline**. Every flag defaults to "the app works normally",
 *   so an unconfigured build, a blocked fetch, an offline load, a prerender or a
 *   test all behave exactly as if Remote Config didn't exist.
 * - Values are read from the published template. Keys the template doesn't know
 *   about are ignored, and keys the app doesn't know about are dropped — the
 *   flag set is closed and typed on purpose.
 * - Fetching is lazy: nothing touches the network until something actually reads
 *   a flag, so pages that use none pay nothing.
 *
 * The published template lives in `remoteconfig.template.json` (version
 * controlled — deploy it with `npm run deploy:remoteconfig`).
 *
 * Adding a flag: add it to `REMOTE_FLAG_DEFAULTS` with the value that means
 * "normal", add the matching parameter to `remoteconfig.template.json`, then read
 * it with `useRemoteFlag('my_flag')`.
 */
import { useEffect } from 'react';
import { createPrefStore } from '@/lib/prefs/createPrefStore';
import { getRemoteConfigClient } from '@/lib/services/firebase';

/**
 * The complete flag set, each mapped to its safe baseline (see the module note:
 * every default must mean "behave normally"). Types are inferred from these
 * values — a `boolean` default makes a boolean flag, and so on.
 */
export const REMOTE_FLAG_DEFAULTS = {
  /** Captain Adel chat is accepting questions (off = RAG backend degraded). */
  chat_enabled: true,
  /** Moyasar checkout is open (off = payment provider incident). */
  checkout_enabled: true,
  /** Offline document/AIP downloads are offered (off = corpus bucket trouble). */
  offline_downloads_enabled: true,
} as const;

export type RemoteFlag = keyof typeof REMOTE_FLAG_DEFAULTS;

/** Literal types from `as const` widened back to their primitive. */
type Widen<T> = T extends boolean ? boolean : T extends number ? number : string;

export type RemoteFlags = { [K in RemoteFlag]: Widen<(typeof REMOTE_FLAG_DEFAULTS)[K]> };

const DEFAULTS: RemoteFlags = { ...REMOTE_FLAG_DEFAULTS };

/**
 * The strings Remote Config itself treats as `true` (mirrors the SDK's
 * `Value.asBoolean`), so a template edited in the console reads the same here as
 * it would through `getBoolean`.
 */
const TRUTHY = new Set(['1', 'true', 't', 'yes', 'y', 'on']);

/**
 * Coerce a raw `key → string` map from the template onto the typed flag set.
 *
 * Pure and Firebase-free so the policy is unit-testable. Anything missing,
 * blank, unknown or unparseable falls back to the default rather than throwing —
 * a malformed template must never be able to break the app.
 */
export function coerceFlags(raw: Readonly<Record<string, string | undefined>>): RemoteFlags {
  const out: Record<string, boolean | number | string> = { ...DEFAULTS };
  for (const key of Object.keys(DEFAULTS) as RemoteFlag[]) {
    const value = raw[key]?.trim();
    if (!value) continue;
    const fallback = DEFAULTS[key];
    if (typeof fallback === 'boolean') {
      out[key] = TRUTHY.has(value.toLowerCase());
    } else if (typeof fallback === 'number') {
      const n = Number(value);
      if (Number.isFinite(n)) out[key] = n;
    } else {
      out[key] = value;
    }
  }
  return out as RemoteFlags;
}

const store = createPrefStore<RemoteFlags>(DEFAULTS);

/**
 * Coerce and publish a raw template snapshot to every subscriber. Exported as
 * the seam `initRemoteConfig` and the tests both drive.
 */
export function applyRemoteValues(raw: Readonly<Record<string, string | undefined>>): void {
  store.set(coerceFlags(raw));
}

/** Drop back to the in-app defaults. For tests and sign-out-style resets. */
export function resetRemoteFlags(): void {
  store.set(DEFAULTS);
}

let initPromise: Promise<void> | null = null;

/**
 * Fetch and activate the template, then keep listening for changes.
 *
 * Idempotent, best-effort and never throws: without Firebase config (or in the
 * emulator, tests, or a browser where Remote Config isn't supported) it resolves
 * having done nothing and the defaults stand. `useRemoteFlag` calls this on
 * first use, so React callers need not; call it directly only when reading flags
 * outside React via `getRemoteFlag`.
 *
 * `realtime` keeps a streaming connection open so a flipped kill-switch reaches
 * already-open tabs without a reload — worth it for kill-switches, but pass
 * `false` if you only need the value that was current at load.
 */
export function initRemoteConfig({ realtime = true }: { realtime?: boolean } = {}): Promise<void> {
  initPromise ??= (async () => {
    try {
      const rc = await getRemoteConfigClient();
      if (!rc) return;
      const { activate, fetchAndActivate, getAll, onConfigUpdate } =
        await import('firebase/remote-config');
      // Belt-and-braces: the SDK's own getters fall back to these too, so a
      // partial template can't surface an empty string as a flag value.
      rc.defaultConfig = { ...DEFAULTS };

      const publish = () => {
        const raw: Record<string, string> = {};
        for (const [key, value] of Object.entries(getAll(rc))) raw[key] = value.asString();
        applyRemoteValues(raw);
      };

      await fetchAndActivate(rc);
      publish();

      if (realtime) {
        onConfigUpdate(rc, {
          next: () => {
            void activate(rc)
              .then(publish)
              .catch(() => {
                /* a failed activate just leaves the previous values in place */
              });
          },
          error: () => {
            /* the stream drops on flaky networks; the activated values stand */
          },
          complete: () => {
            /* never called — the ConfigUpdate stream is never-ending */
          },
        });
      }
    } catch {
      /* Remote Config is never load-bearing — fall back to the defaults */
    }
  })();
  return initPromise;
}

/** The whole flag set as currently resolved. Non-reactive. */
export function getRemoteFlags(): RemoteFlags {
  return store.get();
}

/**
 * One flag, non-reactively — for module-level and event-handler reads. Returns
 * the default until `initRemoteConfig()` has resolved a template.
 */
export function getRemoteFlag<K extends RemoteFlag>(key: K): RemoteFlags[K] {
  return store.get()[key];
}

/**
 * React hook: the live value of `key`, kicking off the fetch on first use.
 *
 * The first render always gets the default and re-renders if the template says
 * otherwise — which is why the defaults must be the safe baseline rather than
 * the "off" state.
 */
export function useRemoteFlag<K extends RemoteFlag>(key: K): RemoteFlags[K] {
  useEffect(() => {
    void initRemoteConfig();
  }, []);
  return store.use()[key];
}
