import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { sendChatStream, type ChatSource, type ChatTurn, type GroundingKind } from '../../lib/api';
import { getIdToken } from '../../lib/auth';
import { getAppCheckToken } from '../../lib/firebase';
import { sessionId } from '../../lib/session';
import { usePageMeta } from '../../lib/usePageMeta';
import { Disclaimer } from '../../components/Disclaimer';
import { GroundingBadge } from '../../components/chat/GroundingBadge';
import styles from './Chat.module.css';

interface Message {
  role: 'user' | 'assistant';
  text: string;
  sources?: ChatSource[];
  kind?: GroundingKind;
  refusalClass?: string;
  pending?: boolean;
  streaming?: boolean;
  error?: boolean;
}

const SUGGESTIONS = ['s1', 's2', 's3', 's4'] as const;
const TRANSCRIPT_KEY = 'flygaca:adel-transcript';

/** Restore the finalized turns from a previous visit (web localStorage). */
function loadTranscript(): Message[] {
  try {
    const raw = localStorage.getItem(TRANSCRIPT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Message[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function Chat() {
  const { t } = useTranslation();
  usePageMeta(t('meta.chat'));
  const [params, setParams] = useSearchParams();
  const [messages, setMessages] = useState<Message[]>(loadTranscript);
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
      { role: 'assistant', text: '', pending: true, streaming: true },
    ]);

    // Replace the trailing (assistant) message as the stream progresses.
    const patchLast = (fn: (m: Message) => Message) =>
      setMessages((prev) => {
        const copy = prev.slice();
        copy[copy.length - 1] = fn(copy[copy.length - 1]);
        return copy;
      });

    try {
      const [token, appCheckToken] = await Promise.all([
        getIdToken().then((t) => t ?? undefined),
        getAppCheckToken().then((t) => t ?? undefined),
      ]);
      for await (const ev of sendChatStream(
        { message: q, history, session: sessionId() },
        token,
        appCheckToken,
      )) {
        if (ev.type === 'token') {
          patchLast((m) => ({ ...m, text: (m.pending ? '' : m.text) + ev.delta, pending: false }));
        } else if (ev.type === 'reset') {
          patchLast((m) => ({ ...m, text: '', pending: false }));
        } else if (ev.type === 'final') {
          patchLast((m) => ({
            ...m,
            text: ev.answer || m.text,
            sources: ev.sources,
            kind: ev.kind,
            refusalClass: ev.refusalClass,
            pending: false,
            streaming: false,
          }));
        } else if (ev.type === 'error') {
          patchLast((m) => ({
            ...m,
            text: t('chat.notReady'),
            error: true,
            pending: false,
            streaming: false,
          }));
        }
      }
      // A stream that closed without ever leaving the pending state → not connected.
      patchLast((m) =>
        m.pending
          ? { ...m, text: t('chat.notReady'), error: true, pending: false, streaming: false }
          : { ...m, streaming: false },
      );
    } catch {
      patchLast((m) => ({
        ...m,
        text: t('chat.notReady'),
        error: true,
        pending: false,
        streaming: false,
      }));
    } finally {
      setBusy(false);
    }
  }

  function clearChat() {
    setMessages([]);
    try {
      localStorage.removeItem(TRANSCRIPT_KEY);
    } catch {
      /* ignore */
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

  // Persist finalized turns once a turn settles (not mid-stream).
  useEffect(() => {
    if (busy) return;
    const keep = messages.filter((m) => !m.pending && !m.error);
    try {
      localStorage.setItem(TRANSCRIPT_KEY, JSON.stringify(keep));
    } catch {
      /* ignore quota / private-mode errors */
    }
  }, [messages, busy]);

  return (
    <section className={`container-narrow ${styles.page}`}>
      <header className={styles.head}>
        <div>
          <h1>{t('chat.title')}</h1>
          <p className={styles.status}>{t('chat.status')}</p>
        </div>
        {messages.length > 0 && (
          <button type="button" className={styles.clear} onClick={clearChat} disabled={busy}>
            {t('chat.clear')}
          </button>
        )}
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
            {m.role === 'assistant' && !m.pending && (
              <GroundingBadge kind={m.kind} refusalClass={m.refusalClass} />
            )}
            <div className={styles.bubble}>
              {m.pending ? t('chat.thinking') : m.text}
              {m.streaming && !m.pending && <span className={styles.caret} aria-hidden="true" />}
            </div>
            {m.sources && m.sources.length > 0 && <SourceList sources={m.sources} />}
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

/** Citation chips; rows with a verbatim passage expand via a native <details>. */
function SourceList({ sources }: { sources: ChatSource[] }) {
  const { t } = useTranslation();
  return (
    <div className={styles.sourcesWrap}>
      <span className={styles.sourcesLabel}>{t('chat.sourcesLabel')}</span>
      <ul className={styles.sources}>
        {sources.map((s, j) => (
          <li key={j} className={styles.srcRow}>
            {s.verbatim ? (
              <details className={styles.srcDetails}>
                <summary className={styles.srcCite}>
                  <bdi dir="ltr" lang="en">
                    {s.citation || s.url}
                  </bdi>
                </summary>
                <p className={styles.srcVerbatim}>{s.verbatim}</p>
                {s.corpusVersion && (
                  <span className={styles.srcVer}>
                    <bdi dir="ltr" lang="en">
                      {s.corpusVersion}
                    </bdi>
                  </span>
                )}
              </details>
            ) : (
              <span className={styles.srcCite}>
                <bdi dir="ltr" lang="en">
                  {s.citation || s.url}
                </bdi>
              </span>
            )}
            {s.url && (
              <a className={styles.srcOpen} href={s.url} target="_blank" rel="noopener">
                {t('chat.open')}
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
