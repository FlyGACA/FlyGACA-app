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
import { SectionHeader } from '../../components/SectionHeader';
import { BentoGrid } from '../../components/bento/BentoGrid';
import { BentoCard, type BentoTone } from '../../components/bento/BentoCard';
import { useAccount } from '../../lib/account';
import { effectivePlan } from '../../lib/entitlements';
import { usePageMeta } from '../../lib/usePageMeta';
import { faqLd } from '../../lib/jsonld';
import { GUIDE_SLUGS } from '../guides/guides';
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

// The "at a glance" trust strip. Numbers stay truthful: Parts mirrors the hero
// proof stat (gacar-index), tools matches the migration catalogue, and guides is
// the live `GUIDE_SLUGS` count the Learn hub surfaces.
const TRUST_STATS = [
  { value: 74, key: 'parts' },
  { value: 55, key: 'tools' },
  { value: GUIDE_SLUGS.length, key: 'guides' },
] as const;

const WHY_TONES: BentoTone[] = ['default', 'cyan', 'green'];

interface Step {
  h: string;
  p: string;
}
interface Demo {
  q: string;
  a: string;
}

export function Home() {
  const { t } = useTranslation();
  const { entitlement } = useAccount();
  const isPro = effectivePlan(entitlement) !== 'free';

  const steps = t('home.how.steps', { returnObjects: true }) as unknown as Step[];
  const reasons = t('home.why.items', { returnObjects: true }) as unknown as Step[];
  const demos = t('home.adel.demos', { returnObjects: true }) as unknown as Demo[];

  // Organization + WebSite already ship statically in index.html; only the FAQ
  // (built from Captain Adel's demo Q&A) is new, non-duplicative structured data.
  usePageMeta(t('meta.home'), t('metaDesc.home'), faqLd(demos.map((d) => ({ q: d.q, a: d.a }))));

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
      </section>

      {/* How it works — question → cited answer → study. */}
      <section className={`container ${styles.block}`} aria-labelledby="home-how">
        <p className={styles.blockEyebrow}>{t('home.how.eyebrow')}</p>
        <SectionHeader id="home-how" title={t('home.how.title')} />
        <ol className={styles.steps}>
          {steps.map((s, i) => (
            <li key={i} className={styles.step}>
              <span className={styles.stepNum} aria-hidden="true">
                {i + 1}
              </span>
              <h3 className={styles.stepTitle}>{s.h}</h3>
              <p className={styles.stepBody}>{s.p}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Why trust it — independent · cites the section · offline · bilingual. */}
      <section className={`container ${styles.block}`} aria-labelledby="home-why">
        <p className={styles.blockEyebrow}>{t('home.why.eyebrow')}</p>
        <SectionHeader id="home-why" title={t('home.why.title')} tone="var(--cat-2)" />
        <BentoGrid label={t('home.why.title')}>
          {reasons.map((r, i) => (
            <BentoCard key={i} span="sm" tone={WHY_TONES[i % WHY_TONES.length]}>
              <h3 className={styles.featTitle}>{r.h}</h3>
              <p className={styles.featBody}>{r.p}</p>
            </BentoCard>
          ))}
        </BentoGrid>
      </section>

      {/* Trust "at a glance" strip. */}
      <section className="container" aria-label={t('home.trust.label')}>
        <div className={styles.trust}>
          <p className={styles.trustLabel}>{t('home.trust.label')}</p>
          <ul className={styles.stats}>
            {TRUST_STATS.map((s) => (
              <li key={s.key} className={styles.stat}>
                <span className={styles.statValue}>
                  <CountUp to={s.value} />
                </span>
                <span className={styles.statLabel}>{t(`home.trust.${s.key}`)}</span>
              </li>
            ))}
            <li className={styles.stat}>
              <span className={styles.statValue}>
                <bdi dir="ltr">EN · AR</bdi>
              </span>
              <span className={styles.statLabel}>{t('home.trust.languages')}</span>
            </li>
            <li className={styles.stat}>
              <span className={styles.statValue}>{t('home.trust.priceValue')}</span>
              <span className={styles.statLabel}>{t('home.trust.price')}</span>
            </li>
          </ul>
        </div>
      </section>

      {/* Conversion band — plan-aware. */}
      <section className="container">
        <div className={styles.cta}>
          {isPro ? (
            <>
              <div>
                <h2 className={styles.ctaTitle}>{t('home.convert.proTitle')}</h2>
                <p className={styles.ctaLead}>{t('home.convert.proLead')}</p>
              </div>
              <div className={styles.ctaActions}>
                <Link className="btn btn-clay-primary" to="/dashboard">
                  {t('home.convert.proCta')}
                </Link>
              </div>
            </>
          ) : (
            <>
              <div>
                <h2 className={styles.ctaTitle}>{t('home.convert.title')}</h2>
                <p className={styles.ctaLead}>{t('home.convert.lead')}</p>
              </div>
              <div className={styles.ctaActions}>
                <Link className="btn btn-clay-primary" to="/pricing">
                  {t('home.convert.cta')}
                </Link>
                <Link className="btn btn-clay" to="/chat">
                  {t('home.convert.secondary')}
                </Link>
              </div>
            </>
          )}
        </div>
      </section>

      <section className="container">
        <Disclaimer />
      </section>
    </>
  );
}
