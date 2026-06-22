import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Disclaimer } from '../components/Disclaimer';
import { CaptainAvatar } from '../components/CaptainAvatar';
import { CountUp } from '../components/CountUp';
import { SectionHeader } from '../components/SectionHeader';
import { BentoGrid } from '../components/bento/BentoGrid';
import { BentoCard, type BentoTone } from '../components/bento/BentoCard';
import { usePageMeta } from '../lib/usePageMeta';
import { faqLd, breadcrumbLd } from '../lib/jsonld';
import styles from './Schools.module.css';

interface Section {
  h: string;
  p: string;
}
interface Faq {
  q: string;
  a: string;
}

const FEATURE_TONES: BentoTone[] = ['default', 'cyan', 'green'];

// "What every seat includes" — truthful product scope (gacar-index Parts, the
// tools catalogue, ground-school modules from groundschool.json). No customer
// numbers are invented.
const SEAT_STATS = [
  { value: 74, key: 'parts' },
  { value: 55, key: 'tools' },
  { value: 9, key: 'modules' },
] as const;

export function Schools() {
  const { t } = useTranslation();
  const features = t('schools.features', { returnObjects: true }) as unknown as Section[];
  const steps = t('schools.how.steps', { returnObjects: true }) as unknown as Section[];
  const faqs = t('schools.faq', { returnObjects: true }) as unknown as Faq[];
  const email = t('schools.email');

  usePageMeta(t('meta.schools'), t('metaDesc.schools'), [
    faqLd(faqs),
    breadcrumbLd([
      { name: t('nav.home'), path: '/' },
      { name: t('schools.title'), path: '/schools' },
    ]),
  ]);

  const [name, setName] = useState('');
  const [school, setSchool] = useState('');
  const [seats, setSeats] = useState('');
  const [message, setMessage] = useState('');

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const subject = t('schools.mailSubject', { school: school || t('schools.title') });
    const body = t('schools.mailBody', { name, school, seats, message });
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  return (
    <section className={`container ${styles.page}`}>
      <header className={styles.hero}>
        <div className={styles.heroText}>
          <p className={styles.eyebrow}>{t('schools.eyebrow')}</p>
          <h1>{t('schools.title')}</h1>
          <p className={styles.subtitle}>{t('schools.subtitle')}</p>
        </div>
        <CaptainAvatar size="xl" glow pose="smile" decorative className={styles.heroAvatar} />
      </header>

      {/* What every seat includes — truthful product scope. */}
      <div className={styles.includes}>
        <p className={styles.includesLabel}>{t('schools.includesLabel')}</p>
        <ul className={styles.stats}>
          {SEAT_STATS.map((s) => (
            <li key={s.key} className={styles.stat}>
              <span className={styles.statValue}>
                <CountUp to={s.value} />
              </span>
              <span className={styles.statLabel}>{t(`schools.includes.${s.key}`)}</span>
            </li>
          ))}
          <li className={styles.stat}>
            <span className={styles.statValue}>
              <bdi dir="ltr">EN · AR</bdi>
            </span>
            <span className={styles.statLabel}>{t('schools.includes.languages')}</span>
          </li>
        </ul>
      </div>

      {/* Capabilities. */}
      <section className={styles.block} aria-labelledby="schools-features">
        <SectionHeader id="schools-features" title={t('schools.featuresHead')} />
        <BentoGrid label={t('schools.featuresHead')}>
          {features.map((f, i) => (
            <BentoCard key={i} span="sm" tone={FEATURE_TONES[i % FEATURE_TONES.length]}>
              <h3 className={styles.featTitle}>{f.h}</h3>
              <p className={styles.featBody}>{f.p}</p>
            </BentoCard>
          ))}
        </BentoGrid>
      </section>

      {/* How it works — enquire → assign → study. */}
      <section className={styles.block} aria-labelledby="schools-how">
        <p className={styles.blockEyebrow}>{t('schools.how.eyebrow')}</p>
        <SectionHeader id="schools-how" title={t('schools.how.title')} tone="var(--cat-2)" />
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

      <section className={styles.formWrap} aria-labelledby="schools-form-head">
        <h2 id="schools-form-head" className={styles.sectionHead}>
          {t('schools.formHead')}
        </h2>
        <p className={styles.formIntro}>{t('schools.formIntro')}</p>
        <form className={styles.form} onSubmit={submit}>
          <label className={styles.field}>
            <span>{t('schools.form.name')}</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('schools.form.namePh')}
              autoComplete="name"
            />
          </label>
          <label className={styles.field}>
            <span>{t('schools.form.school')}</span>
            <input
              value={school}
              onChange={(e) => setSchool(e.target.value)}
              placeholder={t('schools.form.schoolPh')}
            />
          </label>
          <label className={styles.field}>
            <span>{t('schools.form.seats')}</span>
            <input
              value={seats}
              onChange={(e) => setSeats(e.target.value)}
              placeholder={t('schools.form.seatsPh')}
              inputMode="numeric"
            />
          </label>
          <label className={`${styles.field} ${styles.fieldWide}`}>
            <span>{t('schools.form.message')}</span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t('schools.form.messagePh')}
              rows={4}
            />
          </label>
          <button type="submit" className={styles.send}>
            {t('schools.form.send')}
          </button>
        </form>
        <p className={styles.orEmail}>
          {t('schools.orEmail')} <a href={`mailto:${email}`}>{email}</a>
        </p>
      </section>

      <section className={styles.faqWrap} aria-labelledby="schools-faq-head">
        <h2 id="schools-faq-head" className={styles.sectionHead}>
          {t('schools.faqHead')}
        </h2>
        <div className={styles.faqList}>
          {faqs.map((item) => (
            <details key={item.q} className={styles.faq}>
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Conversion band. */}
      <section className={styles.cta}>
        <div>
          <h2 className={styles.ctaTitle}>{t('schools.cta.title')}</h2>
          <p className={styles.ctaLead}>{t('schools.cta.lead')}</p>
        </div>
        <div className={styles.ctaActions}>
          <Link className="btn btn-clay-primary" to="/pricing">
            {t('schools.cta.plans')}
          </Link>
          <a className="btn btn-clay" href="#schools-form-head">
            {t('schools.cta.contact')}
          </a>
        </div>
      </section>

      <Disclaimer />
    </section>
  );
}
