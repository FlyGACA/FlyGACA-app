import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFetchJson } from '../../lib/useFetchJson';
import type { QuizBank, QuizData, QuizQuestion } from '../../lib/content';
import { useStudyProgress, setQuizBest } from '../../lib/studyProgress';
import { Disclaimer } from '../../components/Disclaimer';
import styles from './Study.module.css';

/** Fisher–Yates shuffle (returns a new array). */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function Shell({ children }: { children: React.ReactNode }) {
  return <section className={`container-narrow ${styles.page}`}>{children}</section>;
}

export function Quiz() {
  const { t } = useTranslation();
  const [reload, setReload] = useState(0);
  const { data, error, loading } = useFetchJson<QuizData>('/data/quiz.json', reload);
  const { quizBest } = useStudyProgress();
  const [bank, setBank] = useState<QuizBank | null>(null);

  if (loading) return <Shell>{t('common.loading')}</Shell>;
  if (error || !data)
    return (
      <Shell>
        <div className={styles.errorBox} role="alert">
          <p>{t('common.loadError')}</p>
          <button type="button" className={styles.primary} onClick={() => setReload((r) => r + 1)}>
            {t('library.retry')}
          </button>
        </div>
      </Shell>
    );

  if (!bank) {
    return (
      <Shell>
        <h1>{t('study.quiz')}</h1>
        <p className={styles.subtitle}>{t('study.pickBank')}</p>
        <ul className={styles.banks}>
          {data.banks.map((b) => {
            const best = quizBest[b.id];
            return (
              <li key={b.id}>
                <button type="button" className={styles.bank} onClick={() => setBank(b)}>
                  <span className={styles.bankTitle}>{b.title}</span>
                  <span className={styles.bankDesc}>{b.desc}</span>
                  <span className={styles.bankMeta}>
                    {t('study.questions', { n: b.questions.length })}
                    {best != null ? ` · ${t('study.best', { pct: best })}` : ''}
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

function Runner({ bank, onBack }: { bank: QuizBank; onBack: () => void }) {
  const { t } = useTranslation();
  const [queue, setQueue] = useState<QuizQuestion[]>(() => shuffle(bank.questions));
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState<QuizQuestion[]>([]);
  const [done, setDone] = useState(false);
  const q = queue[i];

  function choose(opt: number) {
    if (picked != null) return;
    setPicked(opt);
    if (opt === q.answer) setCorrect((c) => c + 1);
    else setWrong((w) => [...w, q]);
  }

  function next() {
    if (i + 1 >= queue.length) {
      setQuizBest(bank.id, Math.round((correct / queue.length) * 100));
      setDone(true);
    } else {
      setI(i + 1);
      setPicked(null);
    }
  }

  function restart(questions: QuizQuestion[]) {
    setQueue(shuffle(questions));
    setI(0);
    setPicked(null);
    setCorrect(0);
    setWrong([]);
    setDone(false);
  }

  if (done) {
    const pct = Math.round((correct / queue.length) * 100);
    return (
      <Shell>
        <button type="button" className={styles.back} onClick={onBack}>
          ← {t('study.back')}
        </button>
        <div className={styles.result} role="status">
          <p className={styles.resultPct}>{pct}%</p>
          <p>{t('study.scoreLine', { correct, total: queue.length })}</p>
          <div className={styles.resultActions}>
            <button
              type="button"
              className={styles.primary}
              onClick={() => restart(bank.questions)}
            >
              {t('study.restart')}
            </button>
            {wrong.length > 0 && (
              <button type="button" className={styles.secondary} onClick={() => restart(wrong)}>
                {t('study.retryWrong', { n: wrong.length })}
              </button>
            )}
          </div>
        </div>
        {wrong.length > 0 && (
          <div className={styles.review}>
            <h2 className={styles.reviewHead}>{t('study.reviewWrong')}</h2>
            <ul className={styles.reviewList}>
              {wrong.map((w, idx) => (
                <li key={idx} className={styles.reviewItem}>
                  <p className={styles.reviewQ}>{w.q}</p>
                  <p className={styles.reviewA}>✓ {w.options[w.answer]}</p>
                  <p className={styles.reviewExplain}>{w.explain}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Shell>
    );
  }

  return (
    <Shell>
      <button type="button" className={styles.back} onClick={onBack}>
        ← {t('study.back')}
      </button>
      <p className={styles.qProgress} role="status" aria-live="polite">
        {t('study.question', { n: i + 1, total: queue.length })}
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
            {i + 1 >= queue.length ? t('study.finish') : t('study.next')}
          </button>
        </div>
      )}
    </Shell>
  );
}
