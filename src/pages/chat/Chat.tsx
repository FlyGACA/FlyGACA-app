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
import { partSlug, conversationParts } from '../../calc/chatSources';
import { crossRefParts } from '../../calc/chatCrossRefs';
import {
  feedbackKey,
  getFeedback,
  recordFeedback,
  normalizeFeedback,
  type FeedbackMap,
  type Rating,
} from '../../calc/chatFeedback';
import { transcriptToMarkdown } from '../../calc/transcript';
import {
  conversationTitle,
  upsertConversation,
  removeConversation,
  renameConversation,
  togglePin,
  normalizeConversations,
  type Conversation,
} from '../../calc/conversations';
import { Disclaimer } from '../../components/Disclaimer';
import { CaptainAvatar } from '../../components/CaptainAvatar';
import { StatusPill } from '../../components/StatusPill';
import { UpsellCard } from '../../components/UpsellCard';
import { GroundingBadge } from '../../components/chat/GroundingBadge';
import { RichText } from '../../components/chat/RichText';
import { MessageActions } from '../../components/chat/MessageActions';
import { ConversationMenu } from '../../components/chat/ConversationMenu';
import { ExportActions } from '../../components/chat/ExportActions';
import { SourcesDigest } from '../../components/chat/SourcesDigest';
import { CrossRefChips } from '../../components/chat/CrossRefChips';
import { VoiceButton } from '../../components/chat/VoiceButton';
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
const SUGGESTION_KEYS = ['s1', 's2', 's3', 's4', 's5', 's6'];
/** Capability chips on the welcome screen (label key → StatusPill tone). */
const CAPABILITIES = [
  { id: 'cites', tone: 'success' as const },
  { id: 'bilingual', tone: 'data' as const },
  { id: 'verify', tone: 'warning' as const },
];
/** Contextual follow-ups offered under the latest grounded answer. */
const FOLLOWUPS = ['section', 'simple', 'example'] as const;

const TRANSCRIPT_KEY = 'flygaca:adel-transcript';
const CONV_KEY = 'flygaca:adel-conversations';
const QUOTA_KEY = 'flygaca:adel-quota';
const FEEDBACK_KEY = 'flygaca:adel-feedback';

function newId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`
  );
}

/**
 * Restore the saved conversation archive. Falls back to a one-time migration of
 * the legacy single transcript (`flygaca:adel-transcript`) into one conversation.
 */
function loadConversations(): Conversation<Message>[] {
  try {
    const raw = localStorage.getItem(CONV_KEY);
    if (raw) return normalizeConversations(JSON.parse(raw)) as Conversation<Message>[];
  } catch {
    /* ignore */
  }
  try {
    const legacy = localStorage.getItem(TRANSCRIPT_KEY);
    if (legacy) {
      const msgs = JSON.parse(legacy) as Message[];
      if (Array.isArray(msgs) && msgs.length > 0) {
        return [
          { id: newId(), title: conversationTitle(msgs), messages: msgs, updatedAt: Date.now() },
        ];
      }
    }
  } catch {
    /* ignore */
  }
  return [];
}

function persistConversations(list: Conversation<Message>[]): void {
  try {
    localStorage.setItem(CONV_KEY, JSON.stringify(list));
  } catch {
    /* ignore quota / private-mode errors */
  }
}

function loadUsage(): Usage {
  try {
    return currentUsage(JSON.parse(localStorage.getItem(QUOTA_KEY) ?? 'null'));
  } catch {
    return currentUsage(null);
  }
}

function loadFeedback(): FeedbackMap {
  try {
    return normalizeFeedback(JSON.parse(localStorage.getItem(FEEDBACK_KEY) ?? 'null'));
  } catch {
    return {};
  }
}

export function Chat() {
  const { t } = useTranslation();
  usePageMeta(t('meta.chat'), t('metaDesc.chat'));
  const [params, setParams] = useSearchParams();
  const [conversations, setConversations] = useState<Conversation<Message>[]>(loadConversations);
  const [activeId, setActiveId] = useState<string>(() => conversations[0]?.id ?? newId());
  const [messages, setMessages] = useState<Message[]>(() => conversations[0]?.messages ?? []);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [usage, setUsage] = useState<Usage>(loadUsage);
  const [feedback, setFeedback] = useState<FeedbackMap>(loadFeedback);
  const [atBottom, setAtBottom] = useState(true);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
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

  /** Resolve a Part number cited in prose to an in-app Library link (or null). */
  function resolveCitation(partNumber: string): string | null {
    const slug = partSlug(validSlugs.current, partNumber);
    return slug ? `/library/${slug}` : null;
  }

  /** Record (or toggle off) a 👍/👎 on the answer at `idx` and persist locally. */
  function rateAnswer(idx: number, rating: Rating) {
    const text = messages[idx]?.text;
    if (!text) return;
    // future: forward to the gateway so weak groundings can be learned from.
    setFeedback((prev) => {
      const next = recordFeedback(prev, feedbackKey(text), rating);
      try {
        localStorage.setItem(FEEDBACK_KEY, JSON.stringify(next));
      } catch {
        /* ignore quota / private-mode errors */
      }
      return next;
    });
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

  /** Start a fresh thread; the current one is already saved in the archive. */
  function newChat() {
    if (busy) return;
    setMessages([]);
    setActiveId(newId());
  }

  /** Load a saved conversation into the composer. */
  function selectConversation(id: string) {
    if (busy) return;
    const c = conversations.find((x) => x.id === id);
    if (!c) return;
    setActiveId(id);
    setMessages(c.messages);
  }

  /** Delete a saved conversation; if it was active, drop into a fresh thread. */
  function deleteConversation(id: string) {
    setConversations((prev) => {
      const next = removeConversation(prev, id);
      persistConversations(next);
      return next;
    });
    if (id === activeId) {
      setMessages([]);
      setActiveId(newId());
    }
  }

  /** Give a saved conversation a hand-typed title. */
  function rename(id: string, title: string) {
    setConversations((prev) => {
      const next = renameConversation(prev, id, title);
      persistConversations(next);
      return next;
    });
  }

  /** Pin/unpin a saved conversation so it floats to the top of History. */
  function pin(id: string) {
    setConversations((prev) => {
      const next = togglePin(prev, id);
      persistConversations(next);
      return next;
    });
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

  // Grow the composer to fit its content (capped), and snap back when cleared.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  // Persist the active thread into the archive once a turn settles (not mid-stream).
  useEffect(() => {
    if (busy) return;
    const keep = messages.filter((m) => !m.pending && !m.error);
    setConversations((prev) => {
      const prior = prev.find((c) => c.id === activeId);
      const next =
        keep.length === 0
          ? removeConversation(prev, activeId)
          : upsertConversation(prev, {
              id: activeId,
              // A hand-typed title wins; otherwise auto-title from the first turn.
              title: prior?.renamed ? prior.title : conversationTitle(keep),
              messages: keep,
              updatedAt: Date.now(),
              ...(prior?.pinned ? { pinned: true } : {}),
              ...(prior?.renamed ? { renamed: true } : {}),
            });
      persistConversations(next);
      return next;
    });
  }, [messages, busy, activeId]);

  const last = messages[messages.length - 1];
  const showFollowups =
    !gated &&
    !busy &&
    last?.role === 'assistant' &&
    !last.pending &&
    !last.error &&
    !last.streaming &&
    last.kind !== 'refusal';

  const digest = conversationParts(messages, validSlugs.current);
  const hasMessages = messages.length > 0;
  const transcriptMd = hasMessages
    ? transcriptToMarkdown(messages, {
        title: t('chat.transcriptTitle'),
        disclaimer: t('chat.disclaimer'),
        you: t('chat.you'),
        adel: t('chat.title'),
        sources: t('chat.sourcesLabel'),
      })
    : '';

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
        <div className={styles.headActions}>
          {hasMessages && (
            <ExportActions markdown={transcriptMd} filename="flygaca-captain-adel.md" />
          )}
          <ConversationMenu
            conversations={conversations}
            activeId={activeId}
            onNew={newChat}
            onSelect={selectConversation}
            onDelete={deleteConversation}
            onRename={rename}
            onTogglePin={pin}
          />
        </div>
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
              <div className={styles.capabilities}>
                {CAPABILITIES.map((c) => (
                  <StatusPill key={c.id} tone={c.tone}>
                    {t(`chat.capabilities.${c.id}`)}
                  </StatusPill>
                ))}
              </div>
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
              <div className={styles.welcomeActions}>
                <button
                  type="button"
                  className={styles.surprise}
                  onClick={() => {
                    const k = SUGGESTION_KEYS[Math.floor(Math.random() * SUGGESTION_KEYS.length)];
                    void ask(t(`chat.suggestions.${k}`));
                  }}
                >
                  {t('chat.surprise')}
                </button>
                <Link to="/library" className={styles.welcomeLink}>
                  {t('chat.exploreLibrary')}
                </Link>
                <Link to="/tools" className={styles.welcomeLink}>
                  {t('chat.exploreTools')}
                </Link>
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
                      <RichText text={m.text} resolveCitation={resolveCitation} />
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
                  {isAdel && !m.pending && !m.streaming && !m.error && (
                    <CrossRefChips refs={crossRefParts(m.text, m.sources, validSlugs.current)} />
                  )}
                  {isAdel && !m.pending && !m.streaming && (
                    <MessageActions
                      text={m.text}
                      isError={m.error}
                      onRegenerate={() => regenerate(i)}
                      shareTitle={t('chat.title')}
                      rating={m.error ? undefined : getFeedback(feedback, feedbackKey(m.text))}
                      onFeedback={m.error ? undefined : (r) => rateAnswer(i, r)}
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

      {hasMessages && <SourcesDigest parts={digest} />}

      {gated ? (
        <div className={styles.gate}>
          <p className={styles.gateNote}>{t('chat.quota.exhausted')}</p>
          <UpsellCard variant="inline" />
        </div>
      ) : (
        <>
          <form
            className={styles.composer}
            aria-label={t('chat.composer')}
            onSubmit={(e) => {
              e.preventDefault();
              void ask(input);
            }}
          >
            <textarea
              ref={inputRef}
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
            <VoiceButton
              onTranscript={(text) => setInput((prev) => (prev ? `${prev} ${text}` : text))}
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
  // Surface the most-relevant rule text up front: open the first verbatim passage.
  const firstVerbatim = sources.findIndex((s) => s.verbatim);
  return (
    <div className={styles.sourcesWrap}>
      <span className={styles.sourcesLabel}>{t('chat.sourcesLabel')}</span>
      <ul className={styles.sources}>
        {sources.map((s, j) => {
          const slug = partSlug(valid, s.part, s.section, s.citation);
          return (
            <li key={j} className={styles.srcRow}>
              {s.verbatim ? (
                <details className={styles.srcDetails} open={j === firstVerbatim}>
                  <summary className={styles.srcCite}>
                    <bdi dir="ltr" lang="en">
                      {s.citation || s.url}
                    </bdi>
                    <span className={styles.srcExact}>{t('chat.exactText')}</span>
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
