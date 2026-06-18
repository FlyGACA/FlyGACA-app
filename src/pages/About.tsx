import { useTranslation } from 'react-i18next';
import { Disclaimer } from '../components/Disclaimer';
import { usePageMeta } from '../lib/usePageMeta';
import styles from './legal/Prose.module.css';

interface Section {
  h: string;
  p: string;
}
interface Contact {
  label: string;
  email: string;
}

export function About() {
  const { t } = useTranslation();
  usePageMeta(t('meta.about'));
  const sections = t('about.sections', { returnObjects: true }) as unknown as Section[];
  const contacts = t('about.contacts', { returnObjects: true }) as unknown as Contact[];

  return (
    <article className={`container-narrow ${styles.prose}`}>
      <header>
        <p className={styles.eyebrow}>{t('about.eyebrow')}</p>
        <h1>{t('about.title')}</h1>
        <p className={styles.lead}>{t('about.lead')}</p>
      </header>

      {sections.map((s, i) => (
        <section key={i}>
          <h2>{s.h}</h2>
          <p>{s.p}</p>
        </section>
      ))}

      <section>
        <h2>{t('about.contactTitle')}</h2>
        <ul className={styles.contacts}>
          {contacts.map((c) => (
            <li key={c.email}>
              <span>{c.label}</span>
              <a href={`mailto:${c.email}`}>{c.email}</a>
            </li>
          ))}
        </ul>
      </section>

      <Disclaimer />
    </article>
  );
}
