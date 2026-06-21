import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFetchJson } from '../../lib/useFetchJson';
import type { QuizBank, QuizData, QuizQuestion } from '../../lib/content';
import { useStudyProgress, gradeCard } from '../../lib/studyProgress';
import { dueKeys, masteredCount } from '../../calc/srs';
import { usePageMeta } from '../../lib/usePageMeta';
import { ProgressBar } from '../../components/ProgressBar';
import { Disclaimer } from '../../components/Disclaimer';
import styles from './Study.module.css';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function Flashcards() {
  const { t } = useTranslation();
  usePageMeta(t('meta.flashcards'));
  const [reload, setReload] = useState(0);
  const { data, error, loading } = useFetchJson<QuizData>('/data/quiz.json', reload);
  const { fcSrs } = useStudyProgress();
  const [bank, setBank] = useState<QuizBank | null>(null);

  if (loading)
    return <section className={`container-narrow ${styles.page}`}>{t('common.loading')}</section>;
  if (error || !data)
    return (
      <section className={`container-narrow ${styles.page}`}>
        <div className={styles.errorBox} role="alert">
          <p>{t('common.loadError')}</p>
          <button type="button" className={styles.primary} onClick={() => setReload((r) => r + 1)}>
            {t('library.retry')}
          </button>
        </div>
      </section>
    );

  if (!bank) {
    return (
      <section className={`container-narrow ${styles.page}`}>
        <h1>{t('study.flashcards')}</h1>
        <p className={styles.subtitle}>{t('study.pickBank')}</p>
        <ul className={styles.banks}>
          {data.banks.map((b) => {
            const srs = fcSrs[b.id] ?? {};
            const keys = b.questions.map((_, i) => String(i));
            const due = dueKeys(srs, keys, new Date()).length;
            const mastered = masteredCount(srs);
            return (
              <li key={b.id}>
                <button type="button" className={styles.bank} onClick={() => setBank(b)}>
                  <span className={styles.bankTitle}>{b.title}</span>
                  <span className={styles.bankMeta}>
                    {t('study.questions', { n: b.questions.length })}
                    {due > 0 ? ` · ${t('study.dueCount', { n: due })}` : ''}
                    {mastered > 0 ? ` · ${t('study.masteredCount', { n: mastered })}` : ''}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <Disclaimer compact />
      </section>
    );
  }

  return <Deck bank={bank} onBack={() => setBank(null)} />;
}

type Card = QuizQuestion & { key: string };

function Deck({ bank, onBack }: { bank: QuizBank; onBack: () => void }) {
  const { t } = useTranslation();
  const { fcSrs } = useStudyProgress();

  const allCards: Card[] = useMemo(
    () => bank.questions.map((c, idx) => ({ ...c, key: String(idx) })),
    [bank],
  );

  // Build the session from the cards due now (fall back to the whole deck).
  const initial = useMemo(() => {
    const srs = fcSrs[bank.id] ?? {};
    const keys = dueKeys(
      srs,
      allCards.map((c) => c.key),
      new Date(),
    );
    const due = allCards.filter((c) => keys.includes(c.key));
    return shuffle(due.length ? due : allCards);
    // Snapshot once on mount — grading mutates the store but shouldn't reshuffle mid-session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bank]);

  const [queue] = useState<Card[]>(initial);
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [got, setGot] = useState(0);
  const [again, setAgain] = useState<Card[]>([]);
  const [extra, setExtra] = useState<Card[] | null>(null);
  const card = queue[i];
  const done = i >= queue.length;

  function grade(correct: boolean) {
    gradeCard(bank.id, card.key, correct);
    if (correct) setGot((n) => n + 1);
    else setAgain((r) => [...r, card]);
    setFlipped(false);
    setI((n) => n + 1);
  }

  // Keyboard: Space/Enter flips; once flipped ←/→ grade again/got-it.
  useEffect(() => {
    if (done) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        setFlipped((f) => !f);
      } else if (flipped && (e.key === 'ArrowRight' || e.key === '1')) {
        e.preventDefault();
        grade(true);
      } else if (flipped && (e.key === 'ArrowLeft' || e.key === '2')) {
        e.preventDefault();
        grade(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flipped, done, i]);

  function restart(cards: Card[]) {
    setExtra(shuffle(cards));
  }

  // Switch into a follow-up "review the missed ones" session.
  if (extra) {
    return <DeckSession bank={bank} cards={extra} onBack={onBack} />;
  }

  return (
    <section className={`container-narrow ${styles.page}`}>
      <button type="button" className={styles.back} onClick={onBack}>
        ← {t('study.back')}
      </button>
      {done ? (
        <div className={styles.result} role="status">
          <p>{t('study.deckDone', { known: got, review: again.length })}</p>
          <div className={styles.resultActions}>
            <button type="button" className={styles.primary} onClick={() => restart(allCards)}>
              {t('study.reset')}
            </button>
            {again.length > 0 && (
              <button type="button" className={styles.secondary} onClick={() => restart(again)}>
                {t('study.reviewUnknowns', { n: again.length })}
              </button>
            )}
          </div>
        </div>
      ) : (
        <CardView
          card={card}
          flipped={flipped}
          onFlip={() => setFlipped((f) => !f)}
          onGrade={grade}
          progress={{ done: i + 1, total: queue.length }}
        />
      )}
    </section>
  );
}

/** A standalone deck session over an explicit card list (the "review missed" flow). */
function DeckSession({
  bank,
  cards,
  onBack,
}: {
  bank: QuizBank;
  cards: Card[];
  onBack: () => void;
}) {
  const { t } = useTranslation();
  const [queue] = useState<Card[]>(cards);
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [got, setGot] = useState(0);
  const [again, setAgain] = useState(0);
  const card = queue[i];
  const done = i >= queue.length;

  function grade(correct: boolean) {
    gradeCard(bank.id, card.key, correct);
    if (correct) setGot((n) => n + 1);
    else setAgain((n) => n + 1);
    setFlipped(false);
    setI((n) => n + 1);
  }

  useEffect(() => {
    if (done) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        setFlipped((f) => !f);
      } else if (flipped && (e.key === 'ArrowRight' || e.key === '1')) {
        e.preventDefault();
        grade(true);
      } else if (flipped && (e.key === 'ArrowLeft' || e.key === '2')) {
        e.preventDefault();
        grade(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flipped, done, i]);

  return (
    <section className={`container-narrow ${styles.page}`}>
      <button type="button" className={styles.back} onClick={onBack}>
        ← {t('study.back')}
      </button>
      {done ? (
        <div className={styles.result} role="status">
          <p>{t('study.deckDone', { known: got, review: again })}</p>
        </div>
      ) : (
        <CardView
          card={card}
          flipped={flipped}
          onFlip={() => setFlipped((f) => !f)}
          onGrade={grade}
          progress={{ done: i + 1, total: queue.length }}
        />
      )}
    </section>
  );
}

function CardView({
  card,
  flipped,
  onFlip,
  onGrade,
  progress,
}: {
  card: Card;
  flipped: boolean;
  onFlip: () => void;
  onGrade: (correct: boolean) => void;
  progress: { done: number; total: number };
}) {
  const { t } = useTranslation();
  return (
    <>
      <p className={styles.qProgress} role="status" aria-live="polite">
        {t('study.progress', { done: progress.done, total: progress.total })}
      </p>
      <ProgressBar percent={Math.round(((progress.done - 1) / progress.total) * 100)} />
      <div
        className={styles.cardWrapper}
        role="button"
        tabIndex={0}
        aria-pressed={flipped}
        aria-label={t('study.flipHint')}
        onClick={onFlip}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onFlip();
          }
        }}
      >
        <div className={`${styles.cardInner} ${flipped ? styles.flippedCard : ''}`}>
          <div className={styles.cardFront}>
            <span className={styles.cardQ}>{card.q}</span>
            <span className={styles.cardFlipHint}>{t('study.flipHint')}</span>
          </div>
          <div className={styles.cardBack}>
            <span className={styles.cardA}>
              <strong>{card.options[card.answer]}</strong>
              <span className={styles.cardExplain}>{card.explain}</span>
            </span>
          </div>
        </div>
      </div>
      {!flipped ? (
        <button type="button" className={styles.primary} onClick={onFlip}>
          {t('study.flip')}
        </button>
      ) : (
        <div className={styles.markRow}>
          <button
            type="button"
            className={`${styles.mark} ${styles.markReview}`}
            onClick={() => onGrade(false)}
          >
            {t('study.again')}
          </button>
          <button
            type="button"
            className={`${styles.mark} ${styles.markKnown}`}
            onClick={() => onGrade(true)}
          >
            {t('study.gotIt')}
          </button>
        </div>
      )}
    </>
  );
}
