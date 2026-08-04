import { afterEach, describe, expect, it } from 'vitest';
import {
  applyRemoteValues,
  coerceFlags,
  getRemoteFlag,
  getRemoteFlags,
  REMOTE_FLAG_DEFAULTS,
  resetRemoteFlags,
  type RemoteFlag,
} from '@/lib/services/remoteConfig';

// Remote Config flags are kill-switches: the app must behave normally whenever
// the template is absent, blocked, stale or malformed, and only ever leave that
// baseline on an explicit, well-formed value. These branches are that contract —
// a coercion bug here is an outage, not a cosmetic issue.

const FLAGS = Object.keys(REMOTE_FLAG_DEFAULTS) as RemoteFlag[];

afterEach(() => {
  resetRemoteFlags();
});

describe('REMOTE_FLAG_DEFAULTS', () => {
  it('defaults every flag to the "app works normally" baseline', () => {
    // Every flag today is an availability switch, so the safe baseline is `true`.
    // A future non-boolean flag should be added to this assertion deliberately.
    for (const flag of FLAGS) {
      expect(REMOTE_FLAG_DEFAULTS[flag]).toBe(true);
    }
  });
});

describe('coerceFlags', () => {
  it('falls back to the defaults for an empty template', () => {
    expect(coerceFlags({})).toEqual(REMOTE_FLAG_DEFAULTS);
  });

  it('ignores missing, blank and whitespace-only values', () => {
    expect(coerceFlags({ chat_enabled: undefined })).toEqual(REMOTE_FLAG_DEFAULTS);
    expect(coerceFlags({ chat_enabled: '' })).toEqual(REMOTE_FLAG_DEFAULTS);
    expect(coerceFlags({ chat_enabled: '   ' })).toEqual(REMOTE_FLAG_DEFAULTS);
  });

  it('reads every string Remote Config itself treats as true', () => {
    for (const truthy of ['1', 'true', 't', 'yes', 'y', 'on', 'TRUE', ' True ']) {
      expect(coerceFlags({ chat_enabled: truthy }).chat_enabled).toBe(true);
    }
  });

  it('treats anything else as false, so an off switch is never misread as on', () => {
    for (const falsy of ['0', 'false', 'no', 'off', 'nope', '2']) {
      expect(coerceFlags({ chat_enabled: falsy }).chat_enabled).toBe(false);
    }
  });

  it('coerces each flag independently', () => {
    const flags = coerceFlags({ chat_enabled: 'false', checkout_enabled: 'true' });
    expect(flags.chat_enabled).toBe(false);
    expect(flags.checkout_enabled).toBe(true);
    expect(flags.offline_downloads_enabled).toBe(REMOTE_FLAG_DEFAULTS.offline_downloads_enabled);
  });

  it('drops keys the app does not declare — the flag set is closed', () => {
    const flags = coerceFlags({ chat_enabled: 'false', surprise_flag: 'true' });
    expect(Object.keys(flags).sort()).toEqual([...FLAGS].sort());
    expect(flags).not.toHaveProperty('surprise_flag');
  });

  it('returns a fresh object rather than mutating the defaults', () => {
    const flags = coerceFlags({ chat_enabled: 'false' });
    expect(flags).not.toBe(REMOTE_FLAG_DEFAULTS);
    expect(REMOTE_FLAG_DEFAULTS.chat_enabled).toBe(true);
  });
});

describe('the flag store', () => {
  it('serves the defaults before any template is applied', () => {
    expect(getRemoteFlags()).toEqual(REMOTE_FLAG_DEFAULTS);
    expect(getRemoteFlag('chat_enabled')).toBe(true);
  });

  it('publishes an applied template', () => {
    applyRemoteValues({ chat_enabled: 'false' });
    expect(getRemoteFlag('chat_enabled')).toBe(false);
    expect(getRemoteFlag('checkout_enabled')).toBe(true);
  });

  it('restores the safe baseline on reset', () => {
    applyRemoteValues({ chat_enabled: 'false', checkout_enabled: 'false' });
    resetRemoteFlags();
    expect(getRemoteFlags()).toEqual(REMOTE_FLAG_DEFAULTS);
  });
});
