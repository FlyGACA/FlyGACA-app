import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFetchJson } from '../../lib/useFetchJson';
import type { QuizData, QuizQuestion } from '../../lib/content';
import { setExamResult, useStudyProgress } from '../../lib/studyProgress';
import { usePageMeta } from '../../lib/usePageMeta';
import { Disclaimer } from '../../components/Disclaimer';
import styles from './Study.module.css';

type ExamQuestion = QuizQuestion & { bank: string };

function pickQuestions(data: QuizData): ExamQuestion[] {
  const all: ExamQuestion[] = data.banks.flatMap((b) =>
    b.questions.map((q) => ({ ...q, bank: b.title })),
  );
  const shuffled = [...all].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(data.exam.questions, all.length));
}

/** Per-bank correct/total tally for the post-exam breakdown. */
function byBank(questions: ExamQuestion[], answers: (number | null)[]) {
  const map = new Map<string, { correct: number; total: number }>();
  questions.forEach((q, idx) => {
    const row = map.get(q.bank) ?? { correct: 0, total: 0 };
    row.total += 1;
    if (answers[idx] === q.answer) row.correct += 1;
    map.set(q.bank, row);
  });
  return [...map.entries()].sort((a, b) => a[1].correct / a[1].total - b[1].correct / b[1].total);
}

export function MockExam() {
  const { t } = useTranslation();
  usePageMeta(t('meta.exam'));
  const [reload, setReload] = useState(0);
  const { data, error, loading } = useFetchJson<QuizData>('/data/quiz.json', reload);
  const { exam } = useStudyProgress();
  const [started, setStarted] = useState(false);

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

  if (!started) {
    return (
      <section className={`container-narrow ${styles.page}`}>
        <h1>{t('study.exam')}</h1>
        <p className={styles.subtitle}>{t('study.examDesc')}</p>
        <p className={styles.qProgress}>{t('study.examPassMark', { n: data.exam.passMark })}</p>
        {exam && (
          <p className={styles.lastResult}>
            {t('study.lastResult', { pct: exam.pct })}{' '}
            <span className={exam.passed ? styles.passed : styles.failed}>
              {exam.passed ? t('study.examPassed') : t('study.examFailed')}
            </span>
          </p>
        )}
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
  const [flags, setFlags] = useState<boolean[]>(() => questions.map(() => false));
  const [seconds, setSeconds] = useState(data.exam.minutes * 60);
  const [summary, setSummary] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (done) return;
    const id = setInterval(() => setSeconds((s) => (s <= 1 ? (setDone(true), 0) : s - 1)), 1000);
    return () => clearInterval(id);
  }, [done]);

  const correct = answers.filter((a, idx) => a === questions[idx].answer).length;
  const answered = answers.filter((a) => a != null).length;
  const pct = Math.round((correct / questions.length) * 100);
  const passed = pct >= data.exam.passMark;

  useEffect(() => {
    if (done) setExamResult({ pct, passed, date: new Date().toISOString() });
  }, [done, pct, passed]);

  const q = questions[i];
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  if (done) {
    return (
      <section className={`container-narrow ${styles.page}`}>
        <div className={styles.result} role="status">
          <p className={styles.resultPct}>{pct}%</p>
          <p>{t('study.scoreLine', { correct, total: questions.length })}</p>
          <p className={passed ? styles.passed : styles.failed}>
            {passed ? t('study.examPassed') : t('study.examFailed')}
          </p>
        </div>
        <div className={styles.breakdown}>
          <h2 className={styles.reviewHead}>{t('study.byTopic')}</h2>
          <ul className={styles.breakdownList}>
            {byBank(questions, answers).map(([title, row]) => (
              <li key={title} className={styles.breakdownRow}>
                <span className={styles.breakdownName}>{title}</span>
                <span className={styles.breakdownScore}>
                  {row.correct}/{row.total}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className={styles.review}>
          <h2 className={styles.reviewHead}>{t('study.reviewAnswers')}</h2>
          <ul className={styles.reviewList}>
            {questions.map((item, idx) => {
              const a = answers[idx];
              const ok = a === item.answer;
              return (
                <li
                  key={idx}
                  className={`${styles.reviewItem} ${ok ? styles.reviewOk : styles.reviewBad}`}
                >
                  <p className={styles.reviewQ}>
                    {idx + 1}. {item.q}
                  </p>
                  <p className={styles.reviewA}>✓ {item.options[item.answer]}</p>
                  {!ok && (
                    <p className={styles.reviewYours}>
                      {a == null ? t('study.noAnswer') : `✗ ${item.options[a]}`}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </section>
    );
  }

  function answer(opt: number) {
    setAnswers((a) => a.map((v, idx) => (idx === i ? opt : v)));
  }

  // Pre-submit answer summary: jump to any question, see answered/flagged status.
  if (summary) {
    return (
      <section className={`container-narrow ${styles.page}`}>
        <h2 className={styles.qText}>{t('study.summaryTitle')}</h2>
        <p className={styles.qProgress}>
          {t('study.answered', { n: answered, total: questions.length })}
        </p>
        <div className={styles.summaryGrid} role="list">
          {questions.map((_, idx) => (
            <button
              key={idx}
              type="button"
              role="listitem"
              className={`${styles.summaryCell} ${answers[idx] != null ? styles.summaryDone : ''} ${
                flags[idx] ? styles.summaryFlag : ''
              }`}
              aria-label={`${idx + 1}${flags[idx] ? ' ⚑' : ''}`}
              onClick={() => {
                setI(idx);
                setSummary(false);
              }}
            >
              {idx + 1}
            </button>
          ))}
        </div>
        <div className={styles.examNav}>
          <button type="button" className={styles.secondary} onClick={() => setSummary(false)}>
            ← {t('study.back')}
          </button>
          <button type="button" className={styles.primary} onClick={() => setDone(true)}>
            {t('study.submitExam')}
          </button>
        </div>
      </section>
    );
  }

  const timerClass = seconds <= 60 ? styles.timerDanger : seconds <= 300 ? styles.timerWarn : '';

  return (
    <section className={`container-narrow ${styles.page}`}>
      <div className={styles.examBar}>
        <span>
          {t('study.question', { n: i + 1, total: questions.length })} ·{' '}
          {t('study.answered', { n: answered, total: questions.length })}
        </span>
        <span
          className={`${styles.timer} ${timerClass}`}
          role="timer"
          aria-label={t('study.examTimeLeft')}
        >
          {t('study.examTimeLeft')}: {mm}:{ss}
        </span>
      </div>
      <div className={styles.examQHead}>
        <h2 className={styles.qText}>{q.q}</h2>
        <button
          type="button"
          className={`${styles.flagBtn} ${flags[i] ? styles.flagOn : ''}`}
          aria-pressed={flags[i]}
          onClick={() => setFlags((f) => f.map((v, idx) => (idx === i ? !v : v)))}
        >
          ⚑ {flags[i] ? t('study.flagged') : t('study.flag')}
        </button>
      </div>
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
          <button type="button" className={styles.primary} onClick={() => setSummary(true)}>
            {t('study.reviewSubmit')}
          </button>
        )}
      </div>
    </section>
  );
}
