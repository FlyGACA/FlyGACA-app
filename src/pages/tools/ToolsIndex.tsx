import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { TOOLS, TOOL_CATEGORIES, type ToolMeta } from '../../lib/tools';
import { usePageMeta } from '../../lib/usePageMeta';
import { Disclaimer } from '../../components/Disclaimer';
import { SectionHeader } from '../../components/SectionHeader';
import styles from './ToolsIndex.module.css';

/** Per-category accent — cycles the Falcon hues from the design-token map. */
const CAT_TOKENS = ['var(--cat-1)', 'var(--cat-2)', 'var(--cat-3)', 'var(--cat-4)', 'var(--cat-5)'];

export function ToolsIndex() {
  const { t } = useTranslation();
  usePageMeta(t('meta.tools'));
  const [query, setQuery] = useState('');

  const liveCount = TOOLS.filter((x) => x.status === 'live').length;

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return TOOLS;
    return TOOLS.filter((tool) => {
      const haystack = [
        t(`tools.items.${tool.id}.name`),
        t(`tools.items.${tool.id}.blurb`),
        ...(tool.keywords ?? []),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [query, t]);

  const grouped = TOOL_CATEGORIES.map((cat) => ({
    cat,
    tools: matches.filter((x) => x.category === cat),
  })).filter((g) => g.tools.length > 0);

  return (
    <section className={`container ${styles.page}`}>
      <header className={styles.head}>
        <h1>{t('tools.title')}</h1>
        <p className={styles.subtitle}>{t('tools.subtitle')}</p>
        <input
          className={styles.search}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('tools.searchPlaceholder', { count: liveCount })}
          aria-label={t('tools.searchPlaceholder', { count: liveCount })}
        />
      </header>

      {grouped.length > 1 && (
        <nav className={styles.jump} aria-label={t('tools.jumpNav')}>
          {grouped.map(({ cat }) => (
            <a key={cat} href={`#${cat}`} className={styles.jumpChip}>
              {t(`tools.categories.${cat}`)}
            </a>
          ))}
        </nav>
      )}

      {grouped.length === 0 ? (
        <p className={styles.empty}>{t('tools.empty')}</p>
      ) : (
        grouped.map(({ cat, tools }) => (
          <section key={cat} id={cat} className={styles.category}>
            <h2 className={styles.categoryTitle}>{t(`tools.categories.${cat}`)}</h2>
            <ul className={styles.grid}>
        grouped.map(({ cat, tools }, i) => (
          <section key={cat} className={styles.category}>
            <SectionHeader
              title={t(`tools.categories.${cat}`)}
              tone={CAT_TOKENS[i % CAT_TOKENS.length]}
            />
            <ul className={`${styles.grid} stagger-grid`}>
              {tools.map((tool) => (
                <ToolCard key={tool.id} tool={tool} tone={CAT_TOKENS[i % CAT_TOKENS.length]} />
              ))}
            </ul>
          </section>
        ))
      )}

      <div className={styles.footnote}>
        <Disclaimer compact />
      </div>
    </section>
  );
}

function ToolCard({ tool, tone }: { tool: ToolMeta; tone: string }) {
  const { t } = useTranslation();
  const live = tool.status === 'live';
  const inner = (
    <>
      <span className={styles.catBar} aria-hidden="true" />
      <span className={styles.cardHead}>
        <h3 className={styles.cardTitle}>{t(`tools.items.${tool.id}.name`)}</h3>
        {tool.badge === 'new' && live && <span className={styles.badge}>{t('tools.new')}</span>}
      </span>
      <p className={styles.blurb}>{t(`tools.items.${tool.id}.blurb`)}</p>
      <span className={styles.cta}>{live ? t('tools.open') : t('common.soon')}</span>
    </>
  );
  return (
    <li
      className={`${styles.card} ${live ? '' : styles.pending}`}
      style={{ '--cat-color': tone } as CSSProperties}
    >
      {live ? (
        <Link to={tool.route} className={styles.cardLink}>
          {inner}
        </Link>
      ) : (
        <div className={styles.cardLink} aria-disabled="true">
          {inner}
        </div>
      )}
    </li>
  );
}
