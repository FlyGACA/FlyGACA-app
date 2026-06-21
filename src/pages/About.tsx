import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Disclaimer } from '../components/Disclaimer';
import { CaptainAvatar } from '../components/CaptainAvatar';
import { usePageMeta } from '../lib/usePageMeta';
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

export function About() {
  const { t } = useTranslation();
  usePageMeta(t('meta.about'));
  const sections = t('about.sections', { returnObjects: true }) as unknown as Section[];
  const contacts = t('about.contacts', { returnObjects: true }) as unknown as Contact[];
  const stats = t('about.stats', { returnObjects: true }) as unknown as Stat[];

  return (
    <div className={`container ${styles.page}`}>
      <header className={styles.hero}>
        <div className={styles.heroText}>
          <p className={styles.eyebrow}>{t('about.eyebrow')}</p>
          <h1 className={styles.title}>{t('about.title')}</h1>
          <p className={styles.lead}>{t('about.lead')}</p>
        </div>
        <CaptainAvatar size="xl" glow pose="smile" className={styles.heroAvatar} decorative />
      </header>

      {/* Credibility strip. */}
      <ul className={styles.stats}>
        {stats.map((s, i) => (
          <li key={i} className={styles.stat}>
            <span className={styles.statValue}>{s.value}</span>
            <span className={styles.statLabel}>{s.label}</span>
          </li>
        ))}
      </ul>

      {/* What it is / isn't / how / who / source — as claymorphic cards. */}
      <div className={styles.cards}>
        {sections.map((s, i) => (
          <section key={i} className={styles.card}>
            <h2 className={styles.cardTitle}>{s.h}</h2>
            <p className={styles.cardBody}>{s.p}</p>
          </section>
        ))}
      </div>

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

      <section className={styles.contactSection}>
        <h2 className={styles.contactHead}>{t('about.contactTitle')}</h2>
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
