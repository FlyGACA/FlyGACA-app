import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFetchJson } from '../../lib/useFetchJson';
import type { QuizBank, QuizData } from '../../lib/content';
import { Disclaimer } from '../../components/Disclaimer';
import styles from './Study.module.css';

const bestKey = (id: string) => `flygaca:quiz:${id}`;

export function Quiz() {
  const { t } = useTranslation();
  const { data, error, loading } = useFetchJson<QuizData>('/data/quiz.json');
  const [bank, setBank] = useState<QuizBank | null>(null);

  if (loading) return <Shell>{t('common.loading')}</Shell>;
  if (error || !data) return <Shell>{t('common.loadError')}</Shell>;

  if (!bank) {
    return (
      <Shell>
        <h1>{t('study.quiz')}</h1>
        <p className={styles.subtitle}>{t('study.pickBank')}</p>
        <ul className={styles.banks}>
          {data.banks.map((b) => {
            const best = localStorage.getItem(bestKey(b.id));
            return (
              <li key={b.id}>
                <button type="button" className={styles.bank} onClick={() => setBank(b)}>
                  <span className={styles.bankTitle}>{b.title}</span>
                  <span className={styles.bankDesc}>{b.desc}</span>
                  <span className={styles.bankMeta}>
                    {t('study.questions', { n: b.questions.length })}
                    {best ? ` · ${t('study.best', { pct: best })}` : ''}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <Disclaimer compact />
      </Shell>
    );
  }

  return <Runner bank={bank} onBack={() => setBank(null)} />;
}

function Shell({ children }: { children: React.ReactNode }) {
  return <section className={`container-narrow ${styles.page}`}>{children}</section>;
}

function Runner({ bank, onBack }: { bank: QuizBank; onBack: () => void }) {
  const { t } = useTranslation();
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const [done, setDone] = useState(false);
  const q = bank.questions[i];

  function choose(opt: number) {
    if (picked != null) return;
    setPicked(opt);
    if (opt === q.answer) setCorrect((c) => c + 1);
  }

  function next() {
    if (i + 1 >= bank.questions.length) {
      const pct = Math.round((correct / bank.questions.length) * 100);
      const prev = Number(localStorage.getItem(bestKey(bank.id)) ?? 0);
      if (pct > prev) localStorage.setItem(bestKey(bank.id), String(pct));
      setDone(true);
    } else {
      setI(i + 1);
      setPicked(null);
    }
  }

  if (done) {
    const pct = Math.round((correct / bank.questions.length) * 100);
    return (
      <Shell>
        <button type="button" className={styles.back} onClick={onBack}>
          ← {t('study.back')}
        </button>
        <div className={styles.result}>
          <p className={styles.resultPct}>{pct}%</p>
          <p>{t('study.scoreLine', { correct, total: bank.questions.length })}</p>
          <button
            type="button"
            className={styles.primary}
            onClick={() => {
              setI(0);
              setPicked(null);
              setCorrect(0);
              setDone(false);
            }}
          >
            {t('study.restart')}
          </button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <button type="button" className={styles.back} onClick={onBack}>
        ← {t('study.back')}
      </button>
      <p className={styles.qProgress}>
        {t('study.question', { n: i + 1, total: bank.questions.length })}
      </p>
      <h2 className={styles.qText}>{q.q}</h2>
      <ul className={styles.options}>
        {q.options.map((opt, idx) => {
          const state =
            picked == null
              ? ''
              : idx === q.answer
                ? styles.correct
                : idx === picked
                  ? styles.incorrect
                  : '';
          return (
            <li key={idx}>
              <button
                type="button"
                className={`${styles.option} ${state}`}
                onClick={() => choose(idx)}
                disabled={picked != null}
              >
                {opt}
              </button>
            </li>
          );
        })}
      </ul>
      {picked != null && (
        <div className={styles.explain}>
          <p>
            <strong>{t('study.explanation')}:</strong> {q.explain}
          </p>
          <p className={styles.src}>
            {t('study.source')}: {bank.source}
          </p>
          <button type="button" className={styles.primary} onClick={next}>
            {i + 1 >= bank.questions.length ? t('study.finish') : t('study.next')}
          </button>
        </div>
      )}
    </Shell>
  );
}
