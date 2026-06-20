import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Disclaimer } from '../../components/Disclaimer';
import { CountUp } from '../../components/CountUp';
import { SyncedStamp } from '../../components/SyncedStamp';
import { FlightDivider } from '../../components/FlightDivider';
import { Marquee } from '../../components/Marquee';
import { HeroAmbient } from '../../components/HeroAmbient';
import { AdelHeroWidget } from '../../components/AdelHeroWidget';
import styles from './Home.module.css';

// The bento dashboard (and its framer-motion runtime) is split off the home
// hero's critical path; it streams in under the Suspense boundary below.
const HomeDashboard = lazy(() => import('../../components/bento/HomeDashboard'));

// The "proof" stats. Values come from the app's own data indexes (gacar-index,
// ebooks-index, airports, charts-index, reference-index) so they stay truthful;
// only the labels are translated.
const STATS = [
  { value: 74, key: 'parts' },
  { value: 21, key: 'handbooks' },
  { value: 61, key: 'aerodromes' },
  { value: 13, key: 'charts' },
  { value: 211, key: 'reference' },
] as const;

export function Home() {
  const { t } = useTranslation();
  return (
    <>
      <section className={styles.hero}>
        <HeroAmbient />
        <div className={`container ${styles.heroInner}`}>
          <p className={styles.eyebrow}>{t('home.eyebrow')}</p>
          <h1 className={styles.title}>{t('home.title')}</h1>
          <p className={styles.subtitle}>{t('home.subtitle')}</p>
          <div className={styles.heroCta}>
            <Link to="/library" className="btn btn-clay-primary" data-magnetic>
              {t('home.ctaLibrary')}
            </Link>
            <Link to="/tools" className="btn btn-clay" data-magnetic>
              {t('home.ctaTools')}
            </Link>
            <Link to="/chat" className="btn btn-ghost" data-magnetic>
              {t('home.ctaChat')}
            </Link>
          </div>
          <ul className={styles.stats}>
            {STATS.map((s) => (
              <li key={s.key} className={styles.stat}>
                <span className={styles.statValue}>
                  <CountUp to={s.value} />
                </span>
                <span className={styles.statLabel}>{t(`home.stats.${s.key}`)}</span>
              </li>
            ))}
          </ul>
          <SyncedStamp />
          <AdelHeroWidget />
        </div>
      </section>

      <Marquee />

      <FlightDivider />

      <section className={`container ${styles.dashboardSection}`}>
        <Suspense fallback={<div className={styles.dashboardFallback} aria-hidden="true" />}>
          <HomeDashboard />
        </Suspense>
        <p className={styles.notice}>{t('home.notAffiliated')}</p>
        <Disclaimer />
      </section>
    </>
  );
}
