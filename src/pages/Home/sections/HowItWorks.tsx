import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styles from './sections.module.css';

interface Step {
  h: string;
  p: string;
}

const TARGETS = ['/library', '/chat', '/study'];

/** Three-step value explainer: find the rule → Adel cites it → study & stay current. */
export function HowItWorks() {
  const { t } = useTranslation();
  const steps = t('home.how.steps', { returnObjects: true }) as unknown as Step[];

  return (
    <section className={`container ${styles.section}`}>
      <header className={styles.sectionHead}>
        <p className={styles.eyebrow}>{t('home.how.eyebrow')}</p>
        <h2 className={styles.sectionTitle}>{t('home.how.title')}</h2>
      </header>
      <ol className={styles.steps}>
        {steps.map((s, i) => (
          <li key={i}>
            <Link to={TARGETS[i] ?? '/'} className={styles.step}>
              <span className={styles.stepNum} aria-hidden="true">
                {i + 1}
              </span>
              <span className={styles.stepText}>
                <span className={styles.stepTitle}>{s.h}</span>
                <span className={styles.stepBody}>{s.p}</span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
