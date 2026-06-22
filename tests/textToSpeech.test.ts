import { describe, expect, it, afterEach, vi } from 'vitest';
import { ttsSupported, pickTtsLang } from '../src/calc/textToSpeech';

afterEach(() => vi.unstubAllGlobals());

describe('pickTtsLang', () => {
  it('mirrors the voice-input language mapping', () => {
    expect(pickTtsLang('ar')).toBe('ar-SA');
    expect(pickTtsLang('en')).toBe('en-US');
  });
});

describe('ttsSupported', () => {
  it('is true when speechSynthesis is present', () => {
    vi.stubGlobal('window', { speechSynthesis: {} });
    expect(ttsSupported()).toBe(true);
  });

  it('is false when the engine is absent', () => {
    vi.stubGlobal('window', {});
    expect(ttsSupported()).toBe(false);
  });
});
