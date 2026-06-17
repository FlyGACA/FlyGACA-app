import { useTranslation } from 'react-i18next';
import { Disclaimer } from '../components/Disclaimer';
import prose from './legal/Prose.module.css';

interface Section {
  h: string;
  p: string;
}

export function Schools() {
  const { t } = useTranslation();
  const sections = t('schools.sections', { returnObjects: true }) as unknown as Section[];
  const email = t('schools.email');

  return (
    <article className={`container-narrow ${prose.prose}`}>
      <header>
        <h1>{t('schools.title')}</h1>
        <p className={prose.lead}>{t('schools.subtitle')}</p>
      </header>

      {sections.map((s, i) => (
        <section key={i}>
          <h2>{s.h}</h2>
          <p>{s.p}</p>
        </section>
      ))}

      <p>
        <a className="btn btn-primary" href={`mailto:${email}`}>
          {t('schools.cta')} — {email}
        </a>
      </p>

      <Disclaimer />
    </article>
  );
}
