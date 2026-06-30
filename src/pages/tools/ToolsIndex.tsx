import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MagnifyingGlass, Star, ClockCounterClockwise } from '@phosphor-icons/react';
import { TOOLS, TOOL_CATEGORIES, type ToolCategoryId, type ToolMeta } from '../../lib/tools';
import { useToolPrefs, toggleFavorite, pushRecent } from '../../lib/toolPrefs';
import { CategoryIcon, TOOL_ICON_WEIGHT } from '../../lib/toolIcons';
import { usePageMeta } from '../../lib/usePageMeta';
import { itemListLd } from '../../lib/jsonld';
import { Disclaimer } from '../../components/Disclaimer';
import { EmptyState } from '../../components/EmptyState';
import { SectionHeader } from '../../components/SectionHeader';
import { SearchHero } from '../../components/SearchHero';
import type { HeroStat } from '../../components/SearchHero';
import { ViewToggle } from '../../components/hub/ViewToggle';
import { SortSelect } from '../../components/hub/SortSelect';
import { useViewMode, type ViewMode } from '../../lib/useViewMode';
import styles from './ToolsIndex.module.css';
import hub from '../../components/hub/hubList.module.css';

/** Per-category accent — cycles the Falcon hues from the design-token map. */
const CAT_TOKENS = ['var(--cat-1)', 'var(--cat-2)', 'var(--cat-3)', 'var(--cat-4)', 'var(--cat-5)'];
/** Deterministic category → accent, by the category's order in the master list. */
const catTone = (cat: ToolCategoryId) =>
  CAT_TOKENS[Math.max(0, TOOL_CATEGORIES.indexOf(cat)) % CAT_TOKENS.length];

/** Section heading content: an accent-toned glyph beside the label. */
function TitleWithIcon({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className={styles.secTitle}>
      {icon}
      <span>{children}</span>
    </span>
  );
}

/** Quick-pick categories surfaced as chips in the hero. */
const POPULAR_CATS: ToolCategoryId[] = [
  'wind-runway',
  'navigation',
  'fuel-weight',
  'weather',
  'gacar',
];

/** Curated flagship tools surfaced in the "Start here" row at the top of the
 *  default view — the most-reached-for calculators. Edit this list to retune. */
const FEATURED: string[] = [
  'crosswind',
  'density-altitude',
  'wind-triangle',
  'fuel-reserves',
  'metar',
  'weight-balance',
];

/** Sort orders; 'category' keeps the grouped view, 'name' goes flat A–Z. */
type SortKey = 'category' | 'name';
const SORTS: SortKey[] = ['category', 'name'];

const VIEW_KEY = 'flygaca:tools-view';

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
  // Expose the live tools as an ItemList so the hub reads as a catalog of its
  // leaf pages for crawlers (the names resolve from i18n by id).
  const toolListLd = useMemo(
    () =>
      itemListLd(
        TOOLS.filter((x) => x.status === 'live').map((x) => ({
          name: t(`tools.items.${x.id}.name`),
          path: x.route,
        })),
      ),
    [t],
  );
  usePageMeta(t('meta.tools'), t('metaDesc.tools'), toolListLd);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<ToolCategoryId | 'all'>('all');
  const [sort, setSort] = useState<SortKey>('category');
  const [view, setView] = useViewMode(VIEW_KEY);
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

  const filtered = category === 'all' ? matches : matches.filter((x) => x.category === category);
  const grouped = TOOL_CATEGORIES.map((cat) => ({
    cat,
    tools: filtered.filter((x) => x.category === cat),
  })).filter((g) => g.tools.length > 0);
  // Category counts (independent of the active filter) for the chip badges.
  const catCount = useMemo(() => {
    const m = new Map<ToolCategoryId, number>();
    for (const tl of matches) m.set(tl.category, (m.get(tl.category) ?? 0) + 1);
    return m;
  }, [matches]);
  const unfiltered = category === 'all';

  // Group the catalogue only in the default "by category" sort with no active
  // search/filter; otherwise show a single flat grid sorted by the chosen order.
  const showGrouped = sort === 'category' && unfiltered && !q;
  const flat =
    sort === 'name'
      ? [...filtered].sort((a, b) =>
          t(`tools.items.${a.id}.name`).localeCompare(t(`tools.items.${b.id}.name`)),
        )
      : filtered;

  // Featured "Start here" row + pinned/recent rows — grouped (default) view only.
  const featured = FEATURED.map((id) => byId.get(id)).filter((x): x is ToolMeta => Boolean(x));
  const pinned = favorites.map((id) => byId.get(id)).filter((x): x is ToolMeta => Boolean(x));
  const recent = recents
    .map((id) => byId.get(id))
    .filter((x): x is ToolMeta => Boolean(x) && !favorites.includes(x!.id));

  // Animated figures for the hero readout.
  const stats = useMemo<HeroStat[]>(() => {
    const soon = TOOLS.filter((x) => x.status === 'soon').length;
    const cats = TOOL_CATEGORIES.filter((c) =>
      TOOLS.some((x) => x.category === c && x.status === 'live'),
    ).length;
    const out: HeroStat[] = [
      { label: t('tools.stats.tools'), value: liveCount, tone: 'cyan' },
      { label: t('tools.stats.categories'), value: cats, tone: 'green' },
    ];
    if (soon > 0) out.push({ label: t('tools.stats.soon'), value: soon, tone: 'gold' });
    return out;
  }, [t, liveCount]);

  // Quick-pick category chips for the hero; toggle the matching category filter.
  const popularChips = POPULAR_CATS.map((c) => ({
    label: t(`tools.categories.${c}`),
    onClick: () => setCategory((cur) => (cur === c ? 'all' : c)),
    active: category === c,
  }));

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

  const listClass = `${hub.grid} ${view === 'list' ? hub.list : ''} stagger-grid`;
  const renderGrid = (tools: ToolMeta[]) => (
    <ul className={listClass}>
      {tools.map((tool) => (
        <ToolCard
          key={tool.id}
          tool={tool}
          tone={catTone(tool.category)}
          query={q}
          favorite={favorites.includes(tool.id)}
          view={view}
        />
      ))}
    </ul>
  );

  return (
    <section className={`container ${styles.page}`}>
      <SearchHero
        eyebrow={t('tools.eyebrow')}
        title={t('tools.title')}
        subtitle={t('tools.subtitle')}
        placeholder={t('tools.searchPlaceholder', { count: liveCount })}
        query={query}
        onQueryChange={setQuery}
        stats={stats}
        chipsLabel={t('tools.popular')}
        chips={popularChips}
        inputRef={searchRef}
      />

      <div className={styles.controls}>
        <div className={styles.filters} role="group" aria-label={t('tools.title')}>
          <button
            type="button"
            className={`${styles.filterChip} ${unfiltered ? styles.filterChipActive : ''}`}
            aria-pressed={unfiltered}
            onClick={() => setCategory('all')}
          >
            {t('tools.allCategories')}
          </button>
          {TOOL_CATEGORIES.filter((cat) => (catCount.get(cat) ?? 0) > 0).map((cat) => (
            <button
              key={cat}
              type="button"
              className={`${styles.filterChip} ${category === cat ? styles.filterChipActive : ''}`}
              aria-pressed={category === cat}
              onClick={() => setCategory(cat)}
            >
              <CategoryIcon cat={cat} size={16} />
              {t(`tools.categories.${cat}`)}
            </button>
          ))}
        </div>

        <div className={styles.toolbar}>
          <p className={styles.searchMeta} role="status">
            {q ? t('tools.resultCount', { count: matches.length }) : ''}
          </p>
          <div className={styles.toolbarEnd}>
            <SortSelect
              label={t('tools.sortBy')}
              value={sort}
              onChange={(v) => setSort(v as SortKey)}
              options={SORTS.map((s) => ({ value: s, label: t(`tools.sort.${s}`) }))}
            />
            <ViewToggle
              value={view}
              onChange={setView}
              groupLabel={t('tools.view')}
              gridLabel={t('tools.viewGrid')}
              listLabel={t('tools.viewList')}
            />
          </div>
        </div>
      </div>

      <div ref={rootRef} onKeyDown={onGridKeyDown}>
        {showGrouped && featured.length > 0 && (
          <section className={styles.category}>
            <SectionHeader title={t('tools.featured')} tone="var(--brand-hover)" />
            <ul className={`${styles.featuredGrid} stagger-grid`}>
              {featured.map((tool) => (
                <ToolCard
                  key={tool.id}
                  tool={tool}
                  tone={catTone(tool.category)}
                  query={q}
                  favorite={favorites.includes(tool.id)}
                  view="grid"
                  featured
                />
              ))}
            </ul>
          </section>
        )}
        {showGrouped && pinned.length > 0 && (
          <section className={styles.category}>
            <SectionHeader
              title={
                <TitleWithIcon icon={<Star size={20} weight="fill" aria-hidden />}>
                  {t('tools.pinned')}
                </TitleWithIcon>
              }
              tone="var(--gold)"
            />
            {renderGrid(pinned)}
          </section>
        )}
        {showGrouped && recent.length > 0 && (
          <section className={styles.category}>
            <SectionHeader
              title={
                <TitleWithIcon
                  icon={<ClockCounterClockwise size={20} weight={TOOL_ICON_WEIGHT} aria-hidden />}
                >
                  {t('tools.recent')}
                </TitleWithIcon>
              }
              tone="var(--cat-2)"
            />
            {renderGrid(recent)}
          </section>
        )}

        {showGrouped && grouped.length > 1 && (
          <nav className={styles.jump} aria-label={t('tools.jumpNav')}>
            {grouped.map(({ cat }) => (
              <a key={cat} href={`#${cat}`} className={styles.jumpChip}>
                <CategoryIcon cat={cat} size={16} />
                {t(`tools.categories.${cat}`)}
              </a>
            ))}
          </nav>
        )}

        {flat.length === 0 ? (
          <div className={styles.emptyState}>
            <MagnifyingGlass className={styles.emptyIcon} size={44} weight="regular" aria-hidden />
            <p className={styles.emptyMsg}>{t('tools.empty')}</p>
            <button
              type="button"
              className="btn btn-clay"
              onClick={() => {
          <EmptyState
            icon={<MagnifyingGlass size={44} weight="regular" aria-hidden />}
            action={{
              label: t('common.clear'),
              onClick: () => {
                setQuery('');
                setCategory('all');
              },
            }}
          >
            {t('tools.empty')}
          </EmptyState>
        ) : showGrouped ? (
          grouped.map(({ cat, tools }) => (
            <section key={cat} id={cat} className={styles.category}>
              <SectionHeader
                title={
                  <TitleWithIcon icon={<CategoryIcon cat={cat} size={20} />}>
                    {t(`tools.categories.${cat}`)}
                  </TitleWithIcon>
                }
                tone={catTone(cat)}
              />
              {renderGrid(tools)}
            </section>
          ))
        ) : (
          renderGrid(flat)
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
  view,
  featured = false,
}: {
  tool: ToolMeta;
  tone: string;
  query: string;
  favorite: boolean;
  view: ViewMode;
  featured?: boolean;
}) {
  const { t } = useTranslation();
  const live = tool.status === 'live';
  const name = t(`tools.items.${tool.id}.name`);
  const blurb = t(`tools.items.${tool.id}.blurb`);
  const starClass =
    view === 'list'
      ? `${hub.rowStar} ${favorite ? hub.starOn : ''}`
      : `${styles.star} ${favorite ? styles.starOn : ''}`;
  const star = (
    <button
      type="button"
      className={starClass}
      aria-label={t(favorite ? 'tools.unfavorite' : 'tools.favorite')}
      aria-pressed={favorite}
      onClick={() => toggleFavorite(tool.id)}
    >
      <Star size={18} weight={favorite ? 'fill' : 'regular'} aria-hidden />
    </button>
  );

  if (view === 'list') {
    const inner = (
      <>
        <span className={hub.rowBar} aria-hidden="true" />
        <CategoryIcon cat={tool.category} size={18} className={styles.rowIcon} />
        <span className={styles.rowTitle}>{highlight(name, query)}</span>
        {tool.badge === 'new' && live && <span className={styles.badge}>{t('tools.new')}</span>}
        <span className={styles.rowCat}>{t(`tools.categories.${tool.category}`)}</span>
        <span className={styles.rowCta}>{live ? t('tools.open') : t('common.soon')}</span>
      </>
    );
    return (
      <li
        className={`${hub.rowWrap} ${live ? '' : styles.pending}`}
        style={{ '--cat-color': tone } as CSSProperties}
      >
        {live ? (
          <Link
            to={tool.route}
            className={styles.row}
            data-toolcard="1"
            onClick={() => pushRecent(tool.id)}
          >
            {inner}
          </Link>
        ) : (
          <div className={styles.row} aria-disabled="true">
            {inner}
          </div>
        )}
        {star}
      </li>
    );
  }

  const inner = (
    <>
      <span className={styles.catBar} aria-hidden="true" />
      <span className={styles.cardHead}>
        <CategoryIcon cat={tool.category} size={18} className={styles.cardIcon} />
        <h3 className={styles.cardTitle}>{highlight(name, query)}</h3>
        {tool.badge === 'new' && live && <span className={styles.badge}>{t('tools.new')}</span>}
      </span>
      <p className={styles.blurb}>{highlight(blurb, query)}</p>
      <span className={styles.cta}>{live ? t('tools.open') : t('common.soon')}</span>
    </>
  );
  return (
    <li
      className={`${styles.card} ${featured ? styles.cardFeatured : ''} ${live ? '' : styles.pending}`}
      style={{ '--cat-color': tone } as CSSProperties}
    >
      {star}
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
