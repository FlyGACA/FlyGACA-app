import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { RemoteConfig } from 'firebase/remote-config';

// The Firebase-connected path of the flag store. We mock the lazy client
// accessor and the `firebase/remote-config` SDK, then drive fetch + the realtime
// observer by hand. What matters here is that the app never breaks on the
// unhappy paths: no client, a throwing fetch, a failed re-activate — each must
// leave the safe defaults standing rather than surface an error.
//
// `initRemoteConfig` memoizes per module instance, so every test re-imports the
// module after `vi.resetModules()` to get a fresh one.

const h = vi.hoisted(() => ({
  client: null as RemoteConfig | null,
  values: {} as Record<string, string>,
  observer: null as null | { next: () => void; error: (e: unknown) => void; complete: () => void },
  fetchError: null as unknown,
  fetchAndActivate: vi.fn(),
  activate: vi.fn(),
}));

vi.mock('@/lib/services/firebase', () => ({
  getRemoteConfigClient: () => Promise.resolve(h.client),
}));

vi.mock('firebase/remote-config', () => ({
  fetchAndActivate: (rc: RemoteConfig) => {
    h.fetchAndActivate(rc);
    return h.fetchError ? Promise.reject(h.fetchError) : Promise.resolve(true);
  },
  activate: (rc: RemoteConfig) => {
    h.activate(rc);
    return Promise.resolve(true);
  },
  getAll: () =>
    Object.fromEntries(Object.entries(h.values).map(([k, v]) => [k, { asString: () => v }])),
  onConfigUpdate: (_rc: RemoteConfig, observer: typeof h.observer) => {
    h.observer = observer;
    return () => {};
  },
}));

/** A stand-in for the SDK's RemoteConfig handle — only `defaultConfig` is read back. */
function fakeClient(): RemoteConfig {
  return { defaultConfig: {} } as RemoteConfig;
}

async function loadModule() {
  vi.resetModules();
  return import('@/lib/services/remoteConfig');
}

beforeEach(() => {
  h.client = fakeClient();
  h.values = {};
  h.observer = null;
  h.fetchError = null;
  h.fetchAndActivate.mockClear();
  h.activate.mockClear();
});

describe('initRemoteConfig', () => {
  it('no-ops when the client is unavailable (unconfigured, emulator, unsupported)', async () => {
    h.client = null;
    const { initRemoteConfig, getRemoteFlags, REMOTE_FLAG_DEFAULTS } = await loadModule();

    await expect(initRemoteConfig()).resolves.toBeUndefined();
    expect(h.fetchAndActivate).not.toHaveBeenCalled();
    expect(getRemoteFlags()).toEqual(REMOTE_FLAG_DEFAULTS);
  });

  it('publishes the fetched template and seeds the SDK defaults', async () => {
    h.values = { chat_enabled: 'false', checkout_enabled: 'true' };
    const { initRemoteConfig, getRemoteFlag, REMOTE_FLAG_DEFAULTS } = await loadModule();

    await initRemoteConfig();

    expect(getRemoteFlag('chat_enabled')).toBe(false);
    expect(getRemoteFlag('checkout_enabled')).toBe(true);
    expect(h.client?.defaultConfig).toEqual(REMOTE_FLAG_DEFAULTS);
  });

  it('keeps the defaults when the fetch fails, without throwing', async () => {
    h.fetchError = new Error('offline');
    h.values = { chat_enabled: 'false' };
    const { initRemoteConfig, getRemoteFlags, REMOTE_FLAG_DEFAULTS } = await loadModule();

    await expect(initRemoteConfig()).resolves.toBeUndefined();
    expect(getRemoteFlags()).toEqual(REMOTE_FLAG_DEFAULTS);
  });

  it('fetches once however many callers ask', async () => {
    const { initRemoteConfig } = await loadModule();

    await Promise.all([initRemoteConfig(), initRemoteConfig()]);
    await initRemoteConfig();

    expect(h.fetchAndActivate).toHaveBeenCalledTimes(1);
  });

  it('applies a realtime update to already-open tabs', async () => {
    const { initRemoteConfig, getRemoteFlag } = await loadModule();
    await initRemoteConfig();
    expect(getRemoteFlag('chat_enabled')).toBe(true);

    // The backend flips the kill-switch and pushes an invalidation.
    h.values = { chat_enabled: 'false' };
    h.observer?.next();

    await waitFor(() => expect(getRemoteFlag('chat_enabled')).toBe(false));
    expect(h.activate).toHaveBeenCalledTimes(1);
  });

  it('swallows a realtime stream error', async () => {
    const { initRemoteConfig, getRemoteFlags, REMOTE_FLAG_DEFAULTS } = await loadModule();
    await initRemoteConfig();

    expect(() => h.observer?.error(new Error('stream dropped'))).not.toThrow();
    expect(getRemoteFlags()).toEqual(REMOTE_FLAG_DEFAULTS);
  });

  it('skips the streaming connection when realtime is off', async () => {
    const { initRemoteConfig } = await loadModule();

    await initRemoteConfig({ realtime: false });

    expect(h.fetchAndActivate).toHaveBeenCalledTimes(1);
    expect(h.observer).toBeNull();
  });
});

describe('useRemoteFlag', () => {
  it('renders the default first, then the fetched value', async () => {
    h.values = { chat_enabled: 'false' };
    const { useRemoteFlag } = await loadModule();

    const { result } = renderHook(() => useRemoteFlag('chat_enabled'));

    expect(result.current).toBe(true); // safe baseline on the first paint
    await waitFor(() => expect(result.current).toBe(false));
  });

  it('starts the fetch on first use without any explicit bootstrap', async () => {
    const { useRemoteFlag } = await loadModule();

    renderHook(() => useRemoteFlag('checkout_enabled'));

    await waitFor(() => expect(h.fetchAndActivate).toHaveBeenCalledTimes(1));
  });
});
