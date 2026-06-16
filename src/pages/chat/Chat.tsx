import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { sendChat, type ChatSource, type ChatTurn } from '../../lib/api';
import { getIdToken } from '../../lib/auth';
import { sessionId } from '../../lib/session';
import { Disclaimer } from '../../components/Disclaimer';
import styles from './Chat.module.css';

interface Message {
  role: 'user' | 'assistant';
  text: string;
  sources?: ChatSource[];
  pending?: boolean;
  error?: boolean;
}

const SUGGESTIONS = ['s1', 's2', 's3', 's4'] as const;

export function Chat() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const sentInitial = useRef(false);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || busy) return;
    setBusy(true);
    setInput('');

    const history: ChatTurn[] = messages
      .filter((m) => !m.error && !m.pending)
      .map((m) => ({ role: m.role, content: m.text }));

    setMessages((prev) => [
      ...prev,
      { role: 'user', text: q },
      { role: 'assistant', text: t('chat.thinking'), pending: true },
    ]);

    try {
      const token = (await getIdToken()) ?? undefined;
      const res = await sendChat({ message: q, history, session: sessionId() }, token);
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: 'assistant', text: res.answer, sources: res.sources },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: 'assistant', text: t('chat.notReady'), error: true },
      ]);
    } finally {
      setBusy(false);
    }
  }

  // Prefill + auto-send from ?q= (e.g. the "Ask Captain Adel" deep link).
  useEffect(() => {
    const q = params.get('q');
    if (q && !sentInitial.current) {
      sentInitial.current = true;
      setParams({}, { replace: true });
      void ask(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [messages]);

  return (
    <section className={`container-narrow ${styles.page}`}>
      <header className={styles.head}>
        <h1>{t('chat.title')}</h1>
        <p className={styles.status}>{t('chat.status')}</p>
      </header>

      <div className={styles.log} ref={logRef} role="log" aria-live="polite">
        {messages.length === 0 && (
          <div className={styles.welcome}>
            <p className={styles.welcomeLead}>{t('chat.welcome')}</p>
            <div className={styles.suggestions}>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={styles.suggestion}
                  onClick={() => void ask(t(`chat.suggestions.${s}`))}
                >
                  {t(`chat.suggestions.${s}`)}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={`${styles.msg} ${m.role === 'user' ? styles.user : styles.adel} ${
              m.pending ? styles.pending : ''
            }`}
          >
            <div className={styles.bubble}>{m.text}</div>
            {m.sources && m.sources.length > 0 && (
              <ul className={styles.sources}>
                {m.sources.map((src, j) => (
                  <li key={j}>
                    <a href={src.url} target="_blank" rel="noopener">
                      {src.citation}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      <form
        className={styles.composer}
        onSubmit={(e) => {
          e.preventDefault();
          void ask(input);
        }}
      >
        <textarea
          className={styles.input}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void ask(input);
            }
          }}
          rows={2}
          placeholder={t('chat.placeholder')}
          aria-label={t('chat.placeholder')}
        />
        <button className="btn btn-primary" type="submit" disabled={busy || !input.trim()}>
          {t('chat.send')}
        </button>
      </form>

      <p className={styles.note}>{t('chat.disclaimer')}</p>
      <Disclaimer compact />
    </section>
  );
}
