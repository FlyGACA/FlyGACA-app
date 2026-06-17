import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Disclaimer } from '../../components/Disclaimer';
import { adelLink } from '../../lib/adel';
import { usePageMeta } from '../../lib/usePageMeta';
import { GUIDE_SLUGS, GUIDE_TOOLS, TOOL_NAME_KEY, type GuideSlug } from './guides';
import { NotFound } from '../NotFound';
import prose from '../legal/Prose.module.css';
import styles from './Guides.module.css';

interface Section {
  h: string;
  p: string;
}

export function Guide() {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const valid = !!slug && GUIDE_SLUGS.includes(slug as GuideSlug);
  const base = `guides.items.${slug}`;

  // Hook must run before the early return; title is undefined for unknown slugs.
  usePageMeta(valid ? t(`${base}.name`) : undefined);

  if (!valid) return <NotFound />;
  const sections = t(`${base}.sections`, { returnObjects: true }) as unknown as Section[];
  const adel = adelLink(t(`${base}.adel`));
  const tools = GUIDE_TOOLS[slug] ?? [];

  return (
    <article className={`container-narrow ${prose.prose}`}>
      <p className={styles.back}>
        <Link to="/guides">← {t('guides.title')}</Link>
      </p>
      <header>
        <h1>{t(`${base}.name`)}</h1>
        <p className={prose.lead}>{t(`${base}.intro`)}</p>
      </header>

      {sections.map((s, i) => (
        <section key={i}>
          <h2>{s.h}</h2>
          <p>{s.p}</p>
        </section>
      ))}

      <nav className={styles.links} aria-label={t('guides.tools')}>
        {adel && (
          <Link to={adel} className={styles.adel}>
            {t('guides.askAdel')}
          </Link>
        )}
        {tools.map((to) => (
          <Link key={to} to={to} className={styles.toolChip}>
            {t(TOOL_NAME_KEY[to] ?? to)}
          </Link>
        ))}
      </nav>

      <Disclaimer />
    </article>
  );
}
