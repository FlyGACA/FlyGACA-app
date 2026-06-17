import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Disclaimer } from '../../components/Disclaimer';
import styles from './Study.module.css';

const MODES = [
  { to: '/study/quiz', key: 'quiz' },
  { to: '/study/flashcards', key: 'flashcards' },
  { to: '/study/groundschool', key: 'groundschool' },
  { to: '/study/exam', key: 'exam' },
  { to: '/study/paths', key: 'paths' },
  { to: '/study/packs', key: 'packs' },
] as const;

export function StudyHub() {
  const { t } = useTranslation();
  return (
    <section className={`container ${styles.page}`}>
      <header className={styles.head}>
        <h1>{t('study.title')}</h1>
        <p className={styles.subtitle}>{t('study.subtitle')}</p>
      </header>
      <ul className={styles.modes}>
        {MODES.map((m) => (
          <li key={m.key}>
            <Link to={m.to} className={styles.mode}>
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
