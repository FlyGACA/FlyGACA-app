import { useTranslation } from 'react-i18next';
import styles from './sections.module.css';

interface Item {
  h: string;
  p: string;
}

/** Honest trust signals — factual product attributes, no testimonials. */
export function WhyTrust() {
  const { t } = useTranslation();
  const items = t('home.why.items', { returnObjects: true }) as unknown as Item[];

  return (
    <section className={`container ${styles.section}`}>
      <header className={styles.sectionHead}>
        <p className={styles.eyebrow}>{t('home.why.eyebrow')}</p>
        <h2 className={styles.sectionTitle}>{t('home.why.title')}</h2>
      </header>
      <ul className={styles.why}>
        {items.map((it, i) => (
          <li key={i} className={styles.whyCard}>
            <h3 className={styles.whyTitle}>{it.h}</h3>
            <p className={styles.whyBody}>{it.p}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
