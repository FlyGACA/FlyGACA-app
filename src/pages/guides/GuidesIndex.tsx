import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Disclaimer } from '../../components/Disclaimer';
import { usePageMeta } from '../../lib/usePageMeta';
import { GUIDE_SLUGS } from './guides';
import styles from './Guides.module.css';

export function GuidesIndex() {
  const { t } = useTranslation();
  usePageMeta(t('meta.guides'));
  return (
    <section className={`container ${styles.page}`}>
      <header className={styles.head}>
        <h1>{t('guides.title')}</h1>
        <p className={styles.subtitle}>{t('guides.subtitle')}</p>
      </header>
      <ul className={styles.grid}>
        {GUIDE_SLUGS.map((slug) => (
          <li key={slug}>
            <Link to={`/guides/${slug}`} className={styles.card}>
              <h2 className={styles.cardTitle}>{t(`guides.items.${slug}.name`)}</h2>
              <p className={styles.blurb}>{t(`guides.items.${slug}.blurb`)}</p>
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
