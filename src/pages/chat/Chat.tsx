import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { sendChatStream, type ChatSource, type ChatTurn, type GroundingKind } from '../../lib/api';
import { getIdToken } from '../../lib/auth';
import { getAppCheckToken } from '../../lib/firebase';
import { sessionId } from '../../lib/session';
import { usePageMeta } from '../../lib/usePageMeta';
import { useFetchJson } from '../../lib/useFetchJson';
import { useAccount } from '../../lib/account';
import { effectivePlan } from '../../lib/entitlements';
import type { GacarIndex } from '../../lib/content';
import {
  consume,
  currentUsage,
  isExhausted,
  remaining,
  FREE_DAILY_LIMIT,
  type Usage,
} from '../../calc/chatQuota';
import { Disclaimer } from '../../components/Disclaimer';
import { CaptainAvatar } from '../../components/CaptainAvatar';
import { UpsellCard } from '../../components/UpsellCard';
import { GroundingBadge } from '../../components/chat/GroundingBadge';
import { RichText } from '../../components/chat/RichText';
import { MessageActions } from '../../components/chat/MessageActions';
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

/** Topic-grouped starter prompts shown on the empty-state welcome. */
const GROUPS: { id: string; items: string[] }[] = [
  { id: 'airspace', items: ['s1', 's5'] },
  { id: 'licensing', items: ['s2', 's6'] },
  { id: 'operations', items: ['s3', 's4'] },
];
/** Contextual follow-ups offered under the latest grounded answer. */
const FOLLOWUPS = ['section', 'simple', 'example'] as const;

const TRANSCRIPT_KEY = 'flygaca:adel-transcript';
const QUOTA_KEY = 'flygaca:adel-quota';

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

function loadUsage(): Usage {
  try {
    return currentUsage(JSON.parse(localStorage.getItem(QUOTA_KEY) ?? 'null'));
  } catch {
    return currentUsage(null);
  }
}

/** Leading Part number from a citation field, as a Library slug if it exists. */
function partSlug(valid: Set<string>, ...candidates: (string | undefined)[]): string | null {
  for (const c of candidates) {
    if (!c) continue;
    const m = /(\d+)/.exec(c);
    if (!m) continue;
    const slug = `part-${m[1]}`;
    if (valid.has(slug)) return slug;
  }
  return null;
}

export function Chat() {
  const { t } = useTranslation();
  usePageMeta(t('meta.chat'));
  const [params, setParams] = useSearchParams();
  const [messages, setMessages] = useState<Message[]>(loadTranscript);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [usage, setUsage] = useState<Usage>(loadUsage);
  const [atBottom, setAtBottom] = useState(true);
  const logRef = useRef<HTMLDivElement>(null);
  const atBottomRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);
  const sentInitial = useRef(false);

  const { entitlement } = useAccount();
  const isPro = effectivePlan(entitlement) !== 'free';
  const left = remaining(currentUsage(usage));
  const gated = !isPro && isExhausted(currentUsage(usage));

  const gacar = useFetchJson<GacarIndex>('/data/gacar-index.json');
  const validSlugs = useRef<Set<string>>(new Set());
  if (gacar.data && validSlugs.current.size === 0) {
    validSlugs.current = new Set(gacar.data.documents.map((d) => d.slug));
  }

  async function ask(question: string, base: Message[] = messages) {
    const q = question.trim();
    if (!q || busy) return;

    // Free-tier daily gate (UI nudge only; the server is the source of truth).
    if (!isPro) {
      const u = currentUsage(usage);
      if (isExhausted(u)) return;
      const next = consume(u);
      setUsage(next);
      try {
        localStorage.setItem(QUOTA_KEY, JSON.stringify(next));
      } catch {
        /* ignore quota / private-mode errors */
      }
    }

    setBusy(true);
    setInput('');

    const history: ChatTurn[] = base
      .filter((m) => !m.error && !m.pending)
      .map((m) => ({ role: m.role, content: m.text }));

    setMessages([
      ...base,
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

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const [token, appCheckToken] = await Promise.all([
        getIdToken().then((tok) => tok ?? undefined),
        getAppCheckToken().then((tok) => tok ?? undefined),
      ]);
      for await (const ev of sendChatStream(
        { message: q, history, session: sessionId() },
        token,
        appCheckToken,
        controller.signal,
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
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') {
        // User stopped the stream: keep whatever arrived; drop an empty bubble.
        setMessages((prev) => {
          const copy = prev.slice();
          const last = copy[copy.length - 1];
          if (last?.role === 'assistant' && !last.text) copy.pop();
          else if (last) copy[copy.length - 1] = { ...last, pending: false, streaming: false };
          return copy;
        });
      } else {
        patchLast((m) => ({
          ...m,
          text: t('chat.notReady'),
          error: true,
          pending: false,
          streaming: false,
        }));
      }
    } finally {
      abortRef.current = null;
      setBusy(false);
    }
  }

  /** Re-ask the user turn that produced the assistant message at `idx`. */
  function regenerate(idx: number) {
    const userMsg = messages[idx - 1];
    if (!userMsg || userMsg.role !== 'user' || busy) return;
    void ask(userMsg.text, messages.slice(0, idx - 1));
  }

  function stop() {
    abortRef.current?.abort();
  }

  function clearChat() {
    setMessages([]);
    try {
      localStorage.removeItem(TRANSCRIPT_KEY);
    } catch {
      /* ignore */
    }
  }

  function scrollToLatest() {
    const el = logRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
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

  // Auto-scroll only when the reader is already near the bottom.
  useEffect(() => {
    if (atBottomRef.current) {
      logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
    }
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

  const last = messages[messages.length - 1];
  const showFollowups =
    !gated &&
    !busy &&
    last?.role === 'assistant' &&
    !last.pending &&
    !last.error &&
    !last.streaming &&
    last.kind !== 'refusal';

  return (
    <section className={`container-narrow ${styles.page}`}>
      <header className={styles.head}>
        <div>
          <h1>{t('chat.title')}</h1>
          <p className={styles.status}>
            <span className={styles.statusDot} aria-hidden="true" />
            {t('chat.status')}
          </p>
        </div>
        {messages.length > 0 && (
          <button type="button" className={styles.clear} onClick={clearChat} disabled={busy}>
            {t('chat.clear')}
          </button>
        )}
      </header>

      <div className={styles.logWrap}>
        <div
          className={styles.log}
          ref={logRef}
          role="log"
          aria-live="polite"
          onScroll={(e) => {
            const el = e.currentTarget;
            const near = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
            atBottomRef.current = near;
            setAtBottom(near);
          }}
        >
          {messages.length === 0 && (
            <div className={styles.welcome}>
              <CaptainAvatar size="xl" glow pose="wave" className={styles.welcomeAvatar} />
              <p className={styles.welcomeLead}>{t('chat.welcome')}</p>
              <div className={styles.groups}>
                {GROUPS.map((g) => (
                  <div key={g.id} className={styles.group}>
                    <span className={styles.groupLabel}>{t(`chat.groups.${g.id}`)}</span>
                    <div className={styles.suggestions}>
                      {g.items.map((s) => (
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
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => {
            const isAdel = m.role === 'assistant';
            // His expression tracks the reply's state: thinking while pending,
            // a calm "hold" when the answer isn't grounded, neutral otherwise.
            const pose = m.pending ? 'thinking' : m.kind === 'refusal' ? 'hold' : 'default';
            return (
              <div
                key={i}
                className={`${styles.msg} ${isAdel ? styles.adel : styles.user} ${
                  m.pending ? styles.pending : ''
                }`}
              >
                {isAdel && (
                  <CaptainAvatar size="sm" pose={pose} decorative className={styles.msgAvatar} />
                )}
                <div className={styles.msgBody}>
                  {isAdel && !m.pending && (
                    <GroundingBadge kind={m.kind} refusalClass={m.refusalClass} />
                  )}
                  <div className={styles.bubble}>
                    {m.pending ? (
                      <span
                        className={styles.thinkingDots}
                        aria-label={t('chat.thinking')}
                        role="status"
                      >
                        <span aria-hidden="true" />
                        <span aria-hidden="true" />
                        <span aria-hidden="true" />
                      </span>
                    ) : isAdel && !m.streaming && !m.error ? (
                      <RichText text={m.text} />
                    ) : (
                      <>
                        {m.text}
                        {m.streaming && <span className={styles.caret} aria-hidden="true" />}
                      </>
                    )}
                  </div>
                  {m.sources && m.sources.length > 0 && (
                    <SourceList sources={m.sources} valid={validSlugs.current} />
                  )}
                  {isAdel && !m.pending && !m.streaming && (
                    <MessageActions
                      text={m.text}
                      isError={m.error}
                      onRegenerate={() => regenerate(i)}
                    />
                  )}
                </div>
              </div>
            );
          })}

          {showFollowups && (
            <div className={styles.followups}>
              {FOLLOWUPS.map((f) => (
                <button
                  key={f}
                  type="button"
                  className={styles.followup}
                  onClick={() => void ask(t(`chat.followups.${f}`))}
                >
                  {t(`chat.followups.${f}`)}
                </button>
              ))}
            </div>
          )}
        </div>

        {!atBottom && messages.length > 0 && (
          <button
            type="button"
            className={styles.scrollDown}
            onClick={scrollToLatest}
            aria-label={t('chat.scrollToLatest')}
          >
            <span aria-hidden="true">↓</span>
          </button>
        )}
      </div>

      {gated ? (
        <div className={styles.gate}>
          <p className={styles.gateNote}>{t('chat.quota.exhausted')}</p>
          <UpsellCard variant="inline" />
        </div>
      ) : (
        <>
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
            {busy ? (
              <button className="btn btn-primary" type="button" onClick={stop}>
                {t('chat.stop')}
              </button>
            ) : (
              <button className="btn btn-primary" type="submit" disabled={!input.trim()}>
                {t('chat.send')}
              </button>
            )}
          </form>
          {!isPro && (
            <p className={styles.quota}>
              {t('chat.quota.left', { n: left, limit: FREE_DAILY_LIMIT })}
            </p>
          )}
        </>
      )}

      <p className={styles.note}>{t('chat.disclaimer')}</p>
      <Disclaimer compact />
    </section>
  );
}

/** Citation chips; rows with a verbatim passage expand via a native <details>. */
function SourceList({ sources, valid }: { sources: ChatSource[]; valid: Set<string> }) {
  const { t } = useTranslation();
  return (
    <div className={styles.sourcesWrap}>
      <span className={styles.sourcesLabel}>{t('chat.sourcesLabel')}</span>
      <ul className={styles.sources}>
        {sources.map((s, j) => {
          const slug = partSlug(valid, s.part, s.section, s.citation);
          return (
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
              {slug && (
                <Link className={styles.srcOpen} to={`/library/${slug}`}>
                  {t('chat.openInLibrary')}
                </Link>
              )}
              {s.url && (
                <a className={styles.srcOpen} href={s.url} target="_blank" rel="noopener">
                  {t('chat.open')}
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
