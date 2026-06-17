import { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { Disclaimer } from '../../components/Disclaimer';
import styles from './Home.module.css';

// The bento dashboard (and its framer-motion runtime) is split off the home
// hero's critical path; it streams in under the Suspense boundary below.
const HomeDashboard = lazy(() => import('../../components/bento/HomeDashboard'));

export function Home() {
  const { t } = useTranslation();
  return (
    <>
      <section className={styles.hero}>
        <div className="container">
          <p className={styles.eyebrow}>{t('home.eyebrow')}</p>
          <h1 className={styles.title}>{t('home.title')}</h1>
          <p className={styles.subtitle}>{t('home.subtitle')}</p>
        </div>
      </section>

      <section className="container">
        <Suspense fallback={<div className={styles.dashboardFallback} aria-hidden="true" />}>
          <HomeDashboard />
        </Suspense>
        <p className={styles.notice}>{t('home.notAffiliated')}</p>
        <Disclaimer />
      </section>
    </>
  );
}
