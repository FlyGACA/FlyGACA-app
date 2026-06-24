import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Disclaimer } from '../components/Disclaimer';
import { CaptainAvatar } from '../components/CaptainAvatar';
import { CountUp } from '../components/CountUp';
import { SectionHeader } from '../components/SectionHeader';
import { BentoGrid } from '../components/bento/BentoGrid';
import { BentoCard, type BentoTone } from '../components/bento/BentoCard';
import { usePageMeta } from '../lib/usePageMeta';
import { articleLd, breadcrumbLd, faqLd, organizationLd } from '../lib/jsonld';
import styles from './About.module.css';

interface Section {
  h: string;
  p: string;
}
interface Contact {
  label: string;
  email: string;
}
interface Stat {
  value: string;
  label: string;
}
interface Faq {
  q: string;
  a: string;
}

const FEATURE_TONES: BentoTone[] = ['default', 'cyan', 'green'];

/** Neon tones cycled across the credibility stat tiles (mirrors SearchHero). */
const STAT_TONES = ['var(--neon-cyan)', 'var(--neon-green)', 'var(--gold)'];

/** Category accents cycled across the "what it is / isn't" cards. */
const CARD_TONES = ['var(--cat-1)', 'var(--cat-2)', 'var(--cat-3)', 'var(--cat-4)', 'var(--cat-5)'];

/** Render a stat value, animating a leading integer with CountUp ("74" → counts up). */
function StatValue({ value }: { value: string }) {
  const m = /^(\d[\d,]*)(.*)$/.exec(value);
  if (!m) return <>{value}</>;
  return (
    <>
      <CountUp to={parseInt(m[1].replace(/,/g, ''), 10)} />
      {m[2]}
    </>
  );
}

export function About() {
  const { t, i18n } = useTranslation();
  const sections = t('about.sections', { returnObjects: true }) as unknown as Section[];
  const contacts = t('about.contacts', { returnObjects: true }) as unknown as Contact[];
  const stats = t('about.stats', { returnObjects: true }) as unknown as Stat[];
  const steps = t('about.howItWorks.steps', { returnObjects: true }) as unknown as Section[];
  const features = t('about.features.items', { returnObjects: true }) as unknown as Section[];
  const faqs = t('about.faq', { returnObjects: true }) as unknown as Faq[];

  usePageMeta(t('meta.about'), t('metaDesc.about'), [
    organizationLd(),
    articleLd({
      title: t('about.title'),
      description: t('metaDesc.about'),
      path: '/about',
      lang: i18n.language,
    }),
    faqLd(faqs),
    breadcrumbLd([
      { name: t('nav.home'), path: '/' },
      { name: t('nav.about'), path: '/about' },
    ]),
  ]);

  return (
    <div className={`container ${styles.page}`}>
      <header className={styles.hero}>
        <div className={styles.glow} aria-hidden="true" />
        <div className={styles.heroText}>
          <p className={styles.eyebrow}>{t('about.eyebrow')}</p>
          <h1 className={styles.title}>{t('about.title')}</h1>
          <p className={styles.lead}>{t('about.lead')}</p>
        </div>
        <CaptainAvatar size="xl" glow pose="smile" className={styles.heroAvatar} decorative />
      </header>

      {/* Credibility strip — neon stat tiles. */}
      <ul className={styles.stats}>
        {stats.map((s, i) => (
          <li
            key={i}
            className={styles.stat}
            style={{ '--stat-tone': STAT_TONES[i % STAT_TONES.length] } as CSSProperties}
          >
            <span className={styles.statValue}>
              <StatValue value={s.value} />
            </span>
            <span className={styles.statLabel}>{s.label}</span>
          </li>
        ))}
      </ul>

      {/* What it is / isn't / how / who / source — tone-coded claymorphic cards. */}
      <section className={styles.block} aria-labelledby="about-sections">
        <SectionHeader id="about-sections" title={t('about.sectionsHead')} tone="var(--cat-1)" />
        <div className={styles.cards}>
          {sections.map((s, i) => (
            <article
              key={i}
              className={styles.card}
              style={{ '--cat-color': CARD_TONES[i % CARD_TONES.length] } as CSSProperties}
            >
              <h3 className={styles.cardTitle}>{s.h}</h3>
              <p className={styles.cardBody}>{s.p}</p>
            </article>
          ))}
        </div>
      </section>

      {/* How it works — Find → Ask → Verify. */}
      <section className={styles.block} aria-labelledby="about-how">
        <SectionHeader id="about-how" title={t('about.howItWorks.head')} tone="var(--cat-4)" />
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

      {/* Capability grid. */}
      <section className={styles.block} aria-labelledby="about-features">
        <SectionHeader id="about-features" title={t('about.features.head')} tone="var(--cat-2)" />
        <BentoGrid label={t('about.features.head')}>
          {features.map((f, i) => (
            <BentoCard key={i} span="sm" tone={FEATURE_TONES[i % FEATURE_TONES.length]}>
              <h3 className={styles.featTitle}>{f.h}</h3>
              <p className={styles.featBody}>{f.p}</p>
            </BentoCard>
          ))}
        </BentoGrid>
      </section>

      {/* Conversion band into the core product. */}
      <section className={styles.cta}>
        <div>
          <h2 className={styles.ctaTitle}>{t('about.cta.title')}</h2>
          <p className={styles.ctaLead}>{t('about.cta.lead')}</p>
        </div>
        <div className={styles.ctaActions}>
          <Link className="btn btn-primary" to="/library">
            {t('about.cta.browse')}
          </Link>
          <Link className="btn" to="/chat">
            {t('about.cta.ask')}
          </Link>
        </div>
      </section>

      {/* FAQ. */}
      <section className={styles.faqWrap} aria-labelledby="about-faq">
        <SectionHeader id="about-faq" title={t('about.faqHead')} tone="var(--cat-5)" />
        <div className={styles.faqList}>
          {faqs.map((item) => (
            <details key={item.q} className={styles.faq}>
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className={styles.contactSection} aria-labelledby="about-contact">
        <SectionHeader id="about-contact" title={t('about.contactTitle')} tone="var(--cat-3)" />
        <ul className={styles.contacts}>
          {contacts.map((c) => (
            <li key={c.email} className={styles.contact}>
              <span className={styles.contactLabel}>{c.label}</span>
              <a className={styles.contactEmail} href={`mailto:${c.email}`}>
                <bdi dir="ltr">{c.email}</bdi>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <Disclaimer />
    </div>
  );
}
