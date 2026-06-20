import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Disclaimer } from '../../components/Disclaimer';
import { TrustStrip } from './sections/TrustStrip';
import { HowItWorks } from './sections/HowItWorks';
import { WhyTrust } from './sections/WhyTrust';
import { ConvertBand } from './sections/ConvertBand';
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
          <div className={styles.heroCta}>
            <Link to="/library" className="btn btn-clay-primary">
              {t('home.ctaLibrary')}
            </Link>
            <Link to="/tools" className="btn btn-clay">
              {t('home.ctaTools')}
            </Link>
            <Link to="/chat" className="btn btn-ghost">
              {t('home.ctaChat')}
            </Link>
          </div>
          <TrustStrip />
        </div>
      </section>

      <HowItWorks />

      <section className={`container ${styles.dashboardSection}`}>
        <Suspense fallback={<div className={styles.dashboardFallback} aria-hidden="true" />}>
          <HomeDashboard />
        </Suspense>
      </section>

      <WhyTrust />

      <ConvertBand />

      <section className="container">
        <p className={styles.notice}>{t('home.notAffiliated')}</p>
        <Disclaimer />
      </section>
    </>
  );
}
