import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFetchJson } from '../../lib/useFetchJson';
import type { QuizBank, QuizData } from '../../lib/content';
import { Disclaimer } from '../../components/Disclaimer';
import styles from './Study.module.css';

export function Flashcards() {
  const { t } = useTranslation();
  const { data, error, loading } = useFetchJson<QuizData>('/data/quiz.json');
  const [bank, setBank] = useState<QuizBank | null>(null);

  if (loading)
    return <section className={`container-narrow ${styles.page}`}>{t('common.loading')}</section>;
  if (error || !data)
    return <section className={`container-narrow ${styles.page}`}>{t('common.loadError')}</section>;

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

function Deck({ bank, onBack }: { bank: QuizBank; onBack: () => void }) {
  const { t } = useTranslation();
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState(0);
  const [review, setReview] = useState(0);
  const card = bank.questions[i];
  const done = i >= bank.questions.length;

  function mark(isKnown: boolean) {
    if (isKnown) setKnown((n) => n + 1);
    else setReview((n) => n + 1);
    setFlipped(false);
    setI(i + 1);
  }

  return (
    <section className={`container-narrow ${styles.page}`}>
      <button type="button" className={styles.back} onClick={onBack}>
        ← {t('study.back')}
      </button>
      {done ? (
        <div className={styles.result}>
          <p>{t('study.deckDone', { known, review })}</p>
          <button
            type="button"
            className={styles.primary}
            onClick={() => {
              setI(0);
              setKnown(0);
              setReview(0);
              setFlipped(false);
            }}
          >
            {t('study.reset')}
          </button>
        </div>
      ) : (
        <>
          <p className={styles.qProgress}>
            {t('study.progress', { done: i + 1, total: bank.questions.length })}
          </p>
          <button type="button" className={styles.card} onClick={() => setFlipped((f) => !f)}>
            {!flipped ? (
              <span className={styles.cardQ}>{card.q}</span>
            ) : (
              <span className={styles.cardA}>
                <strong>{card.options[card.answer]}</strong>
                <span className={styles.cardExplain}>{card.explain}</span>
              </span>
            )}
          </button>
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
