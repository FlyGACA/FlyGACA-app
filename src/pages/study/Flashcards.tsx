import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFetchJson } from '../../lib/useFetchJson';
import type { QuizBank, QuizData, QuizQuestion } from '../../lib/content';
import { setCardKnown } from '../../lib/studyProgress';
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
  const [reload, setReload] = useState(0);
  const { data, error, loading } = useFetchJson<QuizData>('/data/quiz.json', reload);
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
          {data.banks.map((b) => (
            <li key={b.id}>
              <button type="button" className={styles.bank} onClick={() => setBank(b)}>
                <span className={styles.bankTitle}>{b.title}</span>
                <span className={styles.bankMeta}>
                  {t('study.questions', { n: b.questions.length })}
                </span>
              </button>
            </li>
          ))}
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
  const allCards: Card[] = bank.questions.map((c, idx) => ({ ...c, key: String(idx) }));
  const [queue, setQueue] = useState<Card[]>(() => shuffle(allCards));
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState(0);
  const [review, setReview] = useState<Card[]>([]);
  const card = queue[i];
  const done = i >= queue.length;

  function mark(isKnown: boolean) {
    setCardKnown(bank.id, card.key, isKnown);
    if (isKnown) setKnown((n) => n + 1);
    else setReview((r) => [...r, card]);
    setFlipped(false);
    setI(i + 1);
  }

  function reset(cards: Card[]) {
    setQueue(shuffle(cards));
    setI(0);
    setKnown(0);
    setReview([]);
    setFlipped(false);
  }

  return (
    <section className={`container-narrow ${styles.page}`}>
      <button type="button" className={styles.back} onClick={onBack}>
        ← {t('study.back')}
      </button>
      {done ? (
        <div className={styles.result} role="status">
          <p>{t('study.deckDone', { known, review: review.length })}</p>
          <div className={styles.resultActions}>
            <button type="button" className={styles.primary} onClick={() => reset(allCards)}>
              {t('study.reset')}
            </button>
            {review.length > 0 && (
              <button type="button" className={styles.secondary} onClick={() => reset(review)}>
                {t('study.reviewUnknowns', { n: review.length })}
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          <p className={styles.qProgress} role="status" aria-live="polite">
            {t('study.progress', { done: i + 1, total: queue.length })}
          </p>
          <div
            className={styles.cardWrapper}
            role="button"
            tabIndex={0}
            aria-pressed={flipped}
            aria-label={t('study.flipHint')}
            onClick={() => setFlipped((f) => !f)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setFlipped((f) => !f);
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
            <button type="button" className={styles.primary} onClick={() => setFlipped(true)}>
              {t('study.flip')}
            </button>
          ) : (
            <div className={styles.markRow}>
              <button
                type="button"
                className={`${styles.mark} ${styles.markKnown}`}
                onClick={() => mark(true)}
              >
                {t('study.known')}
              </button>
              <button
                type="button"
                className={`${styles.mark} ${styles.markReview}`}
                onClick={() => mark(false)}
              >
                {t('study.unknown')}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
