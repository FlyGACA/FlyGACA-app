import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { TOOLS, TOOL_CATEGORIES, type ToolMeta } from '../../lib/tools';
import { usePageMeta } from '../../lib/usePageMeta';
import { Disclaimer } from '../../components/Disclaimer';
import styles from './ToolsIndex.module.css';

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

      {grouped.length === 0 ? (
        <p className={styles.empty}>{t('tools.empty')}</p>
      ) : (
        grouped.map(({ cat, tools }) => (
          <section key={cat} className={styles.category}>
            <h2 className={styles.categoryTitle}>{t(`tools.categories.${cat}`)}</h2>
            <ul className={styles.grid}>
              {tools.map((tool) => (
                <ToolCard key={tool.id} tool={tool} />
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

function ToolCard({ tool }: { tool: ToolMeta }) {
  const { t } = useTranslation();
  const live = tool.status === 'live';
  const inner = (
    <>
      <span className={styles.cardHead}>
        <h3 className={styles.cardTitle}>{t(`tools.items.${tool.id}.name`)}</h3>
        {tool.badge === 'new' && live && <span className={styles.badge}>{t('tools.new')}</span>}
      </span>
      <p className={styles.blurb}>{t(`tools.items.${tool.id}.blurb`)}</p>
      <span className={styles.cta}>{live ? t('tools.open') : t('common.soon')}</span>
    </>
  );
  return (
    <li className={`${styles.card} ${live ? '' : styles.pending}`}>
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
