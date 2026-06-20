import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { TOOLS, TOOL_CATEGORIES, type ToolCategoryId, type ToolMeta } from '../../lib/tools';
import { useToolPrefs, toggleFavorite, pushRecent } from '../../lib/toolPrefs';
import { usePageMeta } from '../../lib/usePageMeta';
import { Disclaimer } from '../../components/Disclaimer';
import { SectionHeader } from '../../components/SectionHeader';
import styles from './ToolsIndex.module.css';

/** Per-category accent — cycles the Falcon hues from the design-token map. */
const CAT_TOKENS = ['var(--cat-1)', 'var(--cat-2)', 'var(--cat-3)', 'var(--cat-4)', 'var(--cat-5)'];

/** A small glyph per category, for the headers and jump nav. */
const CAT_ICON: Record<ToolCategoryId, string> = {
  'wind-runway': '🛬',
  atmosphere: '🌡️',
  speed: '💨',
  'climb-descent': '📈',
  navigation: '🧭',
  'fuel-weight': '⛽',
  'time-cycles': '🕐',
  weather: '🌦️',
  gacar: '📋',
  currency: '🪪',
  procedures: '🗼',
  reference: '📖',
  directory: '🗂️',
};

/** Split text on a case-insensitive needle, wrapping matches in <mark>. */
function highlight(text: string, needle: string) {
  const n = needle.trim().toLowerCase();
  if (!n) return text;
  const lower = text.toLowerCase();
  const out: (string | JSX.Element)[] = [];
  let i = 0;
  let hit = lower.indexOf(n);
  let k = 0;
  while (hit !== -1) {
    if (hit > i) out.push(text.slice(i, hit));
    out.push(<mark key={k++}>{text.slice(hit, hit + n.length)}</mark>);
    i = hit + n.length;
    hit = lower.indexOf(n, i);
  }
  if (i < text.length) out.push(text.slice(i));
  return out;
}

export function ToolsIndex() {
  const { t } = useTranslation();
  usePageMeta(t('meta.tools'));
  const [query, setQuery] = useState('');
  const { favorites, recents } = useToolPrefs();
  const searchRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const liveCount = TOOLS.filter((x) => x.status === 'live').length;
  const byId = useMemo(() => new Map(TOOLS.map((tl) => [tl.id, tl])), []);
  const q = query.trim();

  const matches = useMemo(() => {
    const needle = q.toLowerCase();
    if (!needle) return TOOLS;
    return TOOLS.filter((tool) =>
      [
        t(`tools.items.${tool.id}.name`),
        t(`tools.items.${tool.id}.blurb`),
        ...(tool.keywords ?? []),
      ]
        .join(' ')
        .toLowerCase()
        .includes(needle),
    );
  }, [q, t]);

  const grouped = TOOL_CATEGORIES.map((cat) => ({
    cat,
    tools: matches.filter((x) => x.category === cat),
  })).filter((g) => g.tools.length > 0);

  // Pinned + recent rows only when not actively searching.
  const pinned = favorites.map((id) => byId.get(id)).filter((x): x is ToolMeta => Boolean(x));
  const recent = recents
    .map((id) => byId.get(id))
    .filter((x): x is ToolMeta => Boolean(x) && !favorites.includes(x!.id));

  // Press "/" anywhere (outside a field) to focus the search box.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== '/' || e.metaKey || e.ctrlKey) return;
      const el = document.activeElement;
      const typing =
        el instanceof HTMLElement && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA');
      if (typing) return;
      e.preventDefault();
      searchRef.current?.focus();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Arrow keys move focus between tool cards in document order.
  function onGridKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const keys = ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'];
    if (!keys.includes(e.key)) return;
    const items = Array.from(
      rootRef.current?.querySelectorAll<HTMLAnchorElement>('[data-toolcard]') ?? [],
    );
    const at = items.indexOf(document.activeElement as HTMLAnchorElement);
    if (at === -1) return;
    e.preventDefault();
    const fwd = e.key === 'ArrowDown' || e.key === 'ArrowRight';
    const next = fwd ? Math.min(at + 1, items.length - 1) : Math.max(at - 1, 0);
    items[next]?.focus();
  }

  const renderGrid = (tools: ToolMeta[], tone: string) => (
    <ul className={`${styles.grid} stagger-grid`}>
      {tools.map((tool) => (
        <ToolCard
          key={tool.id}
          tool={tool}
          tone={tone}
          query={q}
          favorite={favorites.includes(tool.id)}
        />
      ))}
    </ul>
  );

  return (
    <section className={`container ${styles.page}`}>
      <header className={styles.head}>
        <h1>{t('tools.title')}</h1>
        <p className={styles.subtitle}>{t('tools.subtitle')}</p>
        <input
          ref={searchRef}
          className={styles.search}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('tools.searchPlaceholder', { count: liveCount })}
          aria-label={t('tools.searchPlaceholder', { count: liveCount })}
        />
        <p className={styles.searchMeta} role="status">
          {q ? t('tools.resultCount', { count: matches.length }) : t('tools.searchTip')}
        </p>
      </header>

      <div ref={rootRef} onKeyDown={onGridKeyDown}>
        {!q && pinned.length > 0 && (
          <section className={styles.category}>
            <SectionHeader title={`★ ${t('tools.pinned')}`} tone="var(--gold)" />
            {renderGrid(pinned, 'var(--gold)')}
          </section>
        )}
        {!q && recent.length > 0 && (
          <section className={styles.category}>
            <SectionHeader title={`🕐 ${t('tools.recent')}`} tone="var(--cat-2)" />
            {renderGrid(recent, 'var(--cat-2)')}
          </section>
        )}

        {grouped.length > 1 && (
          <nav className={styles.jump} aria-label={t('tools.jumpNav')}>
            {grouped.map(({ cat }) => (
              <a key={cat} href={`#${cat}`} className={styles.jumpChip}>
                <span aria-hidden="true">{CAT_ICON[cat]}</span> {t(`tools.categories.${cat}`)}
              </a>
            ))}
          </nav>
        )}

        {grouped.length === 0 ? (
          <p className={styles.empty}>{t('tools.empty')}</p>
        ) : (
          grouped.map(({ cat, tools }, i) => (
            <section key={cat} id={cat} className={styles.category}>
              <SectionHeader
                title={`${CAT_ICON[cat]} ${t(`tools.categories.${cat}`)}`}
                tone={CAT_TOKENS[i % CAT_TOKENS.length]}
              />
              {renderGrid(tools, CAT_TOKENS[i % CAT_TOKENS.length])}
            </section>
          ))
        )}
      </div>

      <div className={styles.footnote}>
        <Disclaimer compact />
      </div>
    </section>
  );
}

function ToolCard({
  tool,
  tone,
  query,
  favorite,
}: {
  tool: ToolMeta;
  tone: string;
  query: string;
  favorite: boolean;
}) {
  const { t } = useTranslation();
  const live = tool.status === 'live';
  const name = t(`tools.items.${tool.id}.name`);
  const blurb = t(`tools.items.${tool.id}.blurb`);
  const inner = (
    <>
      <span className={styles.catBar} aria-hidden="true" />
      <span className={styles.cardHead}>
        <h3 className={styles.cardTitle}>{highlight(name, query)}</h3>
        {tool.badge === 'new' && live && <span className={styles.badge}>{t('tools.new')}</span>}
      </span>
      <p className={styles.blurb}>{highlight(blurb, query)}</p>
      <span className={styles.cta}>{live ? t('tools.open') : t('common.soon')}</span>
    </>
  );
  return (
    <li
      className={`${styles.card} ${live ? '' : styles.pending}`}
      style={{ '--cat-color': tone } as CSSProperties}
    >
      <button
        type="button"
        className={`${styles.star} ${favorite ? styles.starOn : ''}`}
        aria-label={t(favorite ? 'tools.unfavorite' : 'tools.favorite')}
        aria-pressed={favorite}
        onClick={() => toggleFavorite(tool.id)}
      >
        {favorite ? '★' : '☆'}
      </button>
      {live ? (
        <Link
          to={tool.route}
          className={styles.cardLink}
          data-toolcard="1"
          onClick={() => pushRecent(tool.id)}
        >
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
