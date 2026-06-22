import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ttsSupported, pickTtsLang } from '../../calc/textToSpeech';
import styles from './SpeakButton.module.css';

/**
 * Reads a finalized Captain Adel answer aloud via the Web Speech Synthesis API.
 * Mirrors {@link VoiceButton}: it feature-detects support and renders nothing
 * when unavailable, so it never offers a control that can't work. Speaking
 * language tracks the active app language. Web-only for now — `speechSynthesis`
 * works in modern browsers and inside the native WebView; a Capacitor TTS plugin
 * can be added later behind the same control.
 */
export function SpeakButton({ text }: { text: string }) {
  const { t, i18n } = useTranslation();
  const [supported] = useState(ttsSupported);
  const [speaking, setSpeaking] = useState(false);

  // Cancel any in-flight speech if the bubble unmounts (e.g. on regenerate).
  useEffect(() => {
    return () => {
      if (ttsSupported()) window.speechSynthesis.cancel();
    };
  }, []);

  if (!supported) return null;

  function toggle() {
    const synth = window.speechSynthesis;
    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    synth.cancel(); // clear anything queued from another message
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = pickTtsLang(i18n.language);
    utter.onend = () => setSpeaking(false);
    utter.onerror = () => setSpeaking(false);
    setSpeaking(true);
    synth.speak(utter);
  }

  return (
    <button
      type="button"
      className={`${styles.speak} ${speaking ? styles.active : ''}`}
      onClick={toggle}
      aria-label={speaking ? t('chat.stopSpeaking') : t('chat.speak')}
      aria-pressed={speaking}
    >
      <span aria-hidden="true">{speaking ? '◼' : '🔊'}</span>
      <span className={styles.label}>{speaking ? t('chat.stopSpeaking') : t('chat.speak')}</span>
    </button>
  );
}
