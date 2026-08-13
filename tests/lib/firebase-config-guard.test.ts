import { describe, expect, it } from 'vitest';
import { isPlaceholderConfigValue } from '@/lib/services/firebase';

// Guards the trap documented in deploy.yml: `.env.example` placeholders are
// truthy, so a build that missed its real `VITE_FIREBASE_*` env used to boot the
// SDK against a bogus key and render a complete-looking sign-in form where every
// call — Google and email/password alike — failed `auth/api-key-not-valid`.
// `isFirebaseConfigured()` now rejects placeholders, so such a build shows the
// honest "sign-in unavailable" notice instead.

describe('isPlaceholderConfigValue', () => {
  it('rejects the values shipped in .env.example', () => {
    expect(isPlaceholderConfigValue('your-firebase-web-api-key')).toBe(true);
    expect(isPlaceholderConfigValue('your-recaptcha-enterprise-site-key')).toBe(true);
    expect(isPlaceholderConfigValue('pk_test_replace_me')).toBe(true);
  });

  it('rejects missing, empty, and whitespace-only values', () => {
    expect(isPlaceholderConfigValue(undefined)).toBe(true);
    expect(isPlaceholderConfigValue('')).toBe(true);
    expect(isPlaceholderConfigValue('   ')).toBe(true);
  });

  it('rejects other common stand-ins', () => {
    expect(isPlaceholderConfigValue('CHANGEME')).toBe(true);
    expect(isPlaceholderConfigValue('xxxxx')).toBe(true);
    expect(isPlaceholderConfigValue('REPLACE_ME')).toBe(true);
  });

  it('accepts real Firebase web config values', () => {
    expect(isPlaceholderConfigValue('AIzaSyCJUd5OS7GYgNYMQEiadVDEdw4MEQc-yaA')).toBe(false);
    expect(isPlaceholderConfigValue('flygaca-app')).toBe(false);
    expect(isPlaceholderConfigValue('1:123456789:web:abc123def456')).toBe(false);
  });

  it('still accepts the offline mock key that auth.ts keys its mock sign-in off', () => {
    expect(isPlaceholderConfigValue('mock-api-key')).toBe(false);
  });
});
