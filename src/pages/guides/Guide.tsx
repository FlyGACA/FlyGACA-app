import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Disclaimer } from '../../components/Disclaimer';
import { adelLink } from '../../lib/adel';
import { usePageMeta } from '../../lib/usePageMeta';
import { articleLd, breadcrumbLd } from '../../lib/jsonld';
import { readingMinutes } from '../../lib/readingTime';
import {
  GUIDE_SLUGS,
  GUIDE_TOOLS,
  GUIDE_META,
  TOOL_NAME_KEY,
  sectionId,
  type GuideSlug,
} from './guides';
import { NotFound } from '../NotFound';
import prose from '../legal/Prose.module.css';
import styles from './Guides.module.css';

interface Section {
  h: string;
  p: string;
}

export function Guide() {
  const { t, i18n } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const valid = !!slug && GUIDE_SLUGS.includes(slug as GuideSlug);
  const base = `guides.items.${slug}`;

  // Hook must run before the early return; title is undefined for unknown slugs.
  usePageMeta(
    valid ? t(`${base}.name`) : undefined,
    valid ? t(`${base}.blurb`) : undefined,
    valid
      ? [
          articleLd({
            title: t(`${base}.name`),
            description: t(`${base}.blurb`),
            path: `/guides/${slug}`,
            lang: i18n.language,
          }),
          breadcrumbLd([
            { name: t('nav.home'), path: '/' },
            { name: t('guides.title'), path: '/guides' },
            { name: t(`${base}.name`), path: `/guides/${slug}` },
          ]),
        ]
      : undefined,
  );

  const [progress, setProgress] = useState(0);
  const onScroll = useCallback(() => {
    const el = document.documentElement;
    const total = el.scrollHeight - el.clientHeight;
    setProgress(total > 0 ? Math.round((el.scrollTop / total) * 100) : 0);
  }, []);
  useEffect(() => {
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [onScroll]);

  if (!valid) return <NotFound />;
  const guideSlug = slug as GuideSlug;
  const sections = t(`${base}.sections`, { returnObjects: true }) as unknown as Section[];
  const intro = t(`${base}.intro`);
  const adel = adelLink(t(`${base}.adel`));
  const tools = GUIDE_TOOLS[guideSlug] ?? [];
  const meta = GUIDE_META[guideSlug];
  const minutes = readingMinutes([intro, ...sections.flatMap((s) => [s.h, s.p])].join(' '));

  const idx = GUIDE_SLUGS.indexOf(guideSlug);
  const prev = idx > 0 ? GUIDE_SLUGS[idx - 1] : null;
  const next = idx < GUIDE_SLUGS.length - 1 ? GUIDE_SLUGS[idx + 1] : null;
  const related = GUIDE_SLUGS.filter(
    (s) => s !== guideSlug && GUIDE_META[s].topic === meta.topic,
  ).slice(0, 3);

  return (
    <article className={`container-narrow ${prose.prose}`}>
      <div className={styles.readingTrack} aria-hidden="true">
        <div className={styles.readingBar} style={{ inlineSize: `${progress}%` }} />
      </div>
      <p className={styles.back}>
        <Link to="/guides">← {t('guides.title')}</Link>
      </p>
      <header>
        <span className={styles.headMeta}>
          <span className={styles.level} data-level={meta.level}>
            {t(`guides.level.${meta.level}`)}
          </span>
          <span className={styles.metaDim}>{t('guides.readTime', { min: minutes })}</span>
        </span>
        <h1>{t(`${base}.name`)}</h1>
        <p className={prose.lead}>{intro}</p>
      </header>

      {sections.length > 1 && (
        <nav className={styles.onThisPage} aria-label={t('guides.onThisPage')}>
          <span className={styles.onThisPageLabel}>{t('guides.onThisPage')}</span>
          <ol>
            {sections.map((s, i) => (
              <li key={i}>
                <a href={`#${sectionId(i, s.h)}`}>{s.h}</a>
              </li>
            ))}
          </ol>
        </nav>
      )}

      {sections.map((s, i) => (
        <section key={i}>
          <h2 id={sectionId(i, s.h)} className={styles.sectionH}>
            {s.h}
          </h2>
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

      {related.length > 0 && (
        <section className={styles.related}>
          <h2 className={styles.relatedHead}>{t('guides.related')}</h2>
          <ul className={styles.grid}>
            {related.map((s) => (
              <li key={s}>
                <Link to={`/guides/${s}`} className={styles.card}>
                  <h3 className={styles.cardTitle}>{t(`guides.items.${s}.name`)}</h3>
                  <p className={styles.blurb}>{t(`guides.items.${s}.blurb`)}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <nav className={styles.prevNext} aria-label={t('guides.title')}>
        {prev ? (
          <Link to={`/guides/${prev}`} className={styles.prevNextLink}>
            <span className={styles.prevNextDir}>← {t('guides.prev')}</span>
            <span className={styles.prevNextName}>{t(`guides.items.${prev}.name`)}</span>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link to={`/guides/${next}`} className={`${styles.prevNextLink} ${styles.prevNextEnd}`}>
            <span className={styles.prevNextDir}>{t('guides.next')} →</span>
            <span className={styles.prevNextName}>{t(`guides.items.${next}.name`)}</span>
          </Link>
        ) : (
          <span />
        )}
      </nav>

      <Disclaimer />
    </article>
  );
}
