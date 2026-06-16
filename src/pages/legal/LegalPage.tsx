import { useTranslation } from 'react-i18next';
import { Disclaimer } from '../../components/Disclaimer';
import styles from './Prose.module.css';

interface Section {
  h: string;
  p: string;
}

/** Renders a legal/reference page from structured i18n content. */
export function LegalPage({
  base,
}: {
  base: 'legal.disclaimer' | 'legal.terms' | 'legal.privacy';
}) {
  const { t } = useTranslation();
  const sections = t(`${base}.sections`, { returnObjects: true }) as unknown as Section[];

  return (
    <article className={`container-narrow ${styles.prose}`}>
      <header>
        <h1>{t(`${base}.title`)}</h1>
        <p className={styles.updated}>{t('legal.updated')}</p>
      </header>
      <p className={styles.lead}>{t(`${base}.intro`)}</p>

      {sections.map((s, i) => (
        <section key={i}>
          <h2>{s.h}</h2>
          <p>{s.p}</p>
        </section>
      ))}

      <Disclaimer />
    </article>
  );
}

export const DisclaimerPage = () => <LegalPage base="legal.disclaimer" />;
export const TermsPage = () => <LegalPage base="legal.terms" />;
export const PrivacyPage = () => <LegalPage base="legal.privacy" />;
