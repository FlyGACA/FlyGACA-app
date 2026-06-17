import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFetchJson } from '../../lib/useFetchJson';
import type { QuizData, QuizQuestion } from '../../lib/content';
import { Disclaimer } from '../../components/Disclaimer';
import styles from './Study.module.css';

function pickQuestions(data: QuizData): QuizQuestion[] {
  const all = data.banks.flatMap((b) => b.questions);
  const shuffled = [...all].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(data.exam.questions, all.length));
}

export function MockExam() {
  const { t } = useTranslation();
  const { data, error, loading } = useFetchJson<QuizData>('/data/quiz.json');
  const [started, setStarted] = useState(false);

  if (loading)
    return <section className={`container-narrow ${styles.page}`}>{t('common.loading')}</section>;
  if (error || !data)
    return <section className={`container-narrow ${styles.page}`}>{t('common.loadError')}</section>;

  if (!started) {
    return (
      <section className={`container-narrow ${styles.page}`}>
        <h1>{t('study.exam')}</h1>
        <p className={styles.subtitle}>{t('study.examDesc')}</p>
        <p className={styles.qProgress}>{t('study.examPassMark', { n: data.exam.passMark })}</p>
        <button type="button" className={styles.primary} onClick={() => setStarted(true)}>
          {t('study.examStart')}
        </button>
        <Disclaimer compact />
      </section>
    );
  }

  return <Runner data={data} />;
}

function Runner({ data }: { data: QuizData }) {
  const { t } = useTranslation();
  const questions = useMemo(() => pickQuestions(data), [data]);
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null));
  const [seconds, setSeconds] = useState(data.exam.minutes * 60);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (done) return;
    const id = setInterval(() => setSeconds((s) => (s <= 1 ? (setDone(true), 0) : s - 1)), 1000);
    return () => clearInterval(id);
  }, [done]);

  const q = questions[i];
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  if (done) {
    const correct = answers.filter((a, idx) => a === questions[idx].answer).length;
    const pct = Math.round((correct / questions.length) * 100);
    const passed = pct >= data.exam.passMark;
    return (
      <section className={`container-narrow ${styles.page}`}>
        <div className={styles.result}>
          <p className={styles.resultPct}>{pct}%</p>
          <p>{t('study.scoreLine', { correct, total: questions.length })}</p>
          <p className={passed ? styles.passed : styles.failed}>
            {passed ? t('study.examPassed') : t('study.examFailed')}
          </p>
        </div>
      </section>
    );
  }

  function answer(opt: number) {
    setAnswers((a) => a.map((v, idx) => (idx === i ? opt : v)));
  }

  return (
    <section className={`container-narrow ${styles.page}`}>
      <div className={styles.examBar}>
        <span>{t('study.question', { n: i + 1, total: questions.length })}</span>
        <span className={styles.timer}>
          {t('study.examTimeLeft')}: {mm}:{ss}
        </span>
      </div>
      <h2 className={styles.qText}>{q.q}</h2>
      <ul className={styles.options}>
        {q.options.map((opt, idx) => (
          <li key={idx}>
            <button
              type="button"
              className={`${styles.option} ${answers[i] === idx ? styles.picked : ''}`}
              onClick={() => answer(idx)}
            >
              {opt}
            </button>
          </li>
        ))}
      </ul>
      <div className={styles.examNav}>
        {i > 0 && (
          <button
            type="button"
            className={styles.option}
            onClick={() => setI(i - 1)}
            style={{ inlineSize: 'auto' }}
          >
            ←
          </button>
        )}
        {i + 1 < questions.length ? (
          <button type="button" className={styles.primary} onClick={() => setI(i + 1)}>
            {t('study.next')}
          </button>
        ) : (
          <button type="button" className={styles.primary} onClick={() => setDone(true)}>
            {t('study.finish')}
          </button>
        )}
      </div>
    </section>
  );
}
