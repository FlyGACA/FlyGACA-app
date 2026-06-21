import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useFetchJson } from '../../lib/useFetchJson';
import type { GroundSchoolData, QuizData } from '../../lib/content';
import { useStudyProgress } from '../../lib/studyProgress';
import { masteredCount } from '../../calc/srs';
import { ResultStat } from '../../components/calc/ResultStat';
import { OutputGrid } from '../../components/calc/Grids';
import { Disclaimer } from '../../components/Disclaimer';
import { usePageMeta } from '../../lib/usePageMeta';
import styles from './Study.module.css';

const MODES = [
  { to: '/study/quiz', key: 'quiz', icon: '◉' },
  { to: '/study/flashcards', key: 'flashcards', icon: '⇄' },
  { to: '/study/groundschool', key: 'groundschool', icon: '◈' },
  { to: '/study/exam', key: 'exam', icon: '◎' },
  { to: '/study/paths', key: 'paths', icon: '▷' },
  { to: '/study/packs', key: 'packs', icon: '⊞' },
  { to: '/study/sheets', key: 'sheets', icon: '▤' },
] as const;

export function StudyHub() {
  const { t } = useTranslation();
  usePageMeta(t('meta.study'));
  const quiz = useFetchJson<QuizData>('/data/quiz.json');
  const gs = useFetchJson<GroundSchoolData>('/data/groundschool.json');
  const { quizBest, gsDone, fcSrs, streak } = useStudyProgress();

  const banks = quiz.data?.banks ?? [];
  const attempted = banks.filter((b) => quizBest[b.id] != null).length;
  const bestValues = banks.map((b) => quizBest[b.id]).filter((v): v is number => v != null);
  const avgBest = bestValues.length
    ? Math.round(bestValues.reduce((s, v) => s + v, 0) / bestValues.length)
    : 0;
  const totalCards = banks.reduce((s, b) => s + b.questions.length, 0);
  const knownCards = Object.values(fcSrs).reduce((s, m) => s + masteredCount(m), 0);

  const lessons = gs.data?.modules.flatMap((m) => m.lessons) ?? [];
  const doneLessons = lessons.filter((l) => gsDone[l.id]).length;

  // The highest streak milestone reached, for a small celebratory nudge.
  const milestone = [365, 100, 30, 7].find((m) => streak.count >= m);

  const progressFor = (key: string): string | null => {
    if (key === 'quiz' && banks.length)
      return t('study.banksProgress', { done: attempted, total: banks.length });
    if (key === 'groundschool' && lessons.length)
      return t('study.lessonsProgress', { done: doneLessons, total: lessons.length });
    if (key === 'flashcards' && totalCards)
      return t('study.cardsProgress', { done: knownCards, total: totalCards });
    return null;
  };

  return (
    <section className={`container ${styles.page}`}>
      <header className={styles.head}>
        <h1>{t('study.title')}</h1>
        <p className={styles.subtitle}>{t('study.subtitle')}</p>
      </header>

      <OutputGrid>
        <ResultStat
          label={t('study.streak')}
          value={streak.count}
          sub={t('study.streakUnit')}
          tone={streak.count > 0 ? 'good' : undefined}
        />
        <ResultStat label={t('study.avgBest')} value={`${avgBest}%`} />
        <ResultStat label={t('study.banksDone')} value={`${attempted}/${banks.length}`} />
        <ResultStat label={t('study.lessonsDone')} value={`${doneLessons}/${lessons.length}`} />
      </OutputGrid>

      {milestone && (
        <p className={styles.milestone} role="status">
          {t('study.streakMilestone', { n: milestone })}
        </p>
      )}

      <ul className={`${styles.modes} stagger-grid`}>
        {MODES.map((m) => {
          const prog = progressFor(m.key);
          return (
            <li key={m.key}>
              <Link to={m.to} className={styles.mode}>
                <span className={styles.modeIcon} aria-hidden="true">
                  {m.icon}
                </span>
                <h2>{t(`study.${m.key}`)}</h2>
                <p>{t(`study.${m.key}Desc`)}</p>
                {prog && <span className={styles.modeProgress}>{prog}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className={styles.footnote}>
        <Disclaimer compact />
      </div>
    </section>
  );
}
