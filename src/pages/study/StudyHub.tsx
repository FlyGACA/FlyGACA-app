import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  return (
    <section className={`container ${styles.page}`}>
      <header className={styles.head}>
        <h1>{t('study.title')}</h1>
        <p className={styles.subtitle}>{t('study.subtitle')}</p>
      </header>
      <ul className={`${styles.modes} stagger-grid`}>
        {MODES.map((m) => (
          <li key={m.key}>
            <Link to={m.to} className={styles.mode}>
              <span className={styles.modeIcon} aria-hidden="true">{m.icon}</span>
              <h2>{t(`study.${m.key}`)}</h2>
              <p>{t(`study.${m.key}Desc`)}</p>
            </Link>
          </li>
        ))}
      </ul>
      <div className={styles.footnote}>
        <Disclaimer compact />
      </div>
    </section>
  );
}
