import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactElement } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useFetchJson } from '@/hooks/useFetchJson';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { usePageMeta } from '@/hooks/usePageMeta';
import { itemListLd } from '@/lib/jsonld';
import { CORPUS, fetchJson, searchEntryLink, searchHref, toSearchRef } from '@/lib/content';
import type { CorpusDoc, CorpusIndex, LibraryKind, SearchEntry, SearchIndex } from '@/lib/content';
import {
  useLibraryPrefs,
  isBookmarked,
  saveSearch,
  removeSearch,
  searchKey,
  bookmarkKey,
} from '@/lib/libraryPrefs';
import { useBookmarkGate } from '@/hooks/useBookmarkGate';
import { Disclaimer } from '@/components/Disclaimer';
import { SectionHeader } from '@/components/SectionHeader';
import { EmptyState } from '@/components/EmptyState';
import { Alert } from '@/components/Alert';
import { OfflineDownloads } from '@/components/pwa/OfflineDownloads';
import { SearchHero } from '@/components/SearchHero';
import type { HeroStat } from '@/components/SearchHero';
import { ViewToggle } from '@/components/hub/ViewToggle';
import { SortSelect } from '@/components/hub/SortSelect';
import { useViewMode } from '@/hooks/useViewMode';
import styles from './Library.module.css';
import hub from '@/components/hub/hubList.module.css';
import { Tab, Tabs } from '@/components/ui/Tabs';

const MIN_QUERY = 3;
/** Max full-text matches collected before we ask the user to refine. */
const HIT_CAP = 400;
/** Full-text results revealed per "load more" page. */
const PAGE = 30;
const KINDS: LibraryKind[] = ['regulations', 'reference', 'handbook'];
/** Per-category accent — cycles the Falcon hues from the design-token map. */
const CAT_TOKENS = ['var(--cat-1)', 'var(--cat-2)', 'var(--cat-3)', 'var(--cat-4)', 'var(--cat-5)'];

const VIEW_KEY = 'flygaca:library-view';

/** Sort orders. 'size' is pages (regulations) or sections (reference/handbooks). */
type SortKey = 'part' | 'title' | 'size';
/** Which sorts each corpus offers, in display order; the first is its default. */
const SORTS: Record<LibraryKind, SortKey[]> = {
  regulations: ['part', 'title', 'size'],
  reference: ['title', 'size'],
  handbook: ['title', 'size'],
};
/** The size sort's i18n label key differs by corpus (pages vs sections). */
const SIZE_LABEL: Record<LibraryKind, string> = {
  regulations: 'library.sort.pages',
  reference: 'library.sort.sections',
  handbook: 'library.sort.sections',
};
/** Quick-search seed terms shown as chips in the hero, per corpus. */
const SUGGESTIONS: Record<LibraryKind, string[]> = {
  regulations: ['Part 91', 'medical', 'licensing', 'airworthiness', 'operations'],
  reference: ['weather', 'navigation', 'safety', 'airspace'],
  handbook: ['weather', 'aerodrome', 'navigation', 'systems'],
};

/** Compare two docs under the active sort; ties break on title. */
function compareDocs(a: CorpusDoc, b: CorpusDoc, sort: SortKey): number {
  if (sort === 'title') return a.title.localeCompare(b.title);
  if (sort === 'size') {
    const sa = a.pages ?? a.sections ?? 0;
    const sb = b.pages ?? b.sections ?? 0;
    return sb - sa || a.title.localeCompare(b.title);
  }
  return (a.partNum ?? 0) - (b.partNum ?? 0) || a.title.localeCompare(b.title);
}

/** Split text on a case-insensitive needle, wrapping matches in <mark>. */
function highlight(text: string, needle: string) {
  if (!needle) return text;
  const lower = text.toLowerCase();
  const n = needle.toLowerCase();
  const out: (string | ReactElement)[] = [];
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

export function Library() {
  const { t } = useTranslation();
  const [kind, setKind] = useState<LibraryKind>('regulations');
  const [reload, setReload] = useState(0);
  const { data, error, loading } = useFetchJson<CorpusIndex>(CORPUS[kind].index, reload);
  // Expose the active corpus as an ItemList so crawlers read the hub as an
  // ordered set of its documents (for a crawler that's the default 74 GACAR Parts).
  const itemLd = useMemo(
    () =>
      data
        ? itemListLd(
            data.documents.map((d) => ({ name: d.title, path: `${CORPUS[kind].base}/${d.slug}` })),
          )
        : undefined,
    [data, kind],
  );
  usePageMeta(t('meta.library'), t('metaDesc.library'), itemLd);
  const [category, setCategory] = useState<string>('all');
  // Seed the search from a `?q=` deep link (e.g. the home dashboard's search tile).
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(() => searchParams.get('q') ?? '');
  const [sort, setSort] = useState<SortKey>(() => SORTS[kind][0]);
  const [view, setView] = useViewMode(VIEW_KEY);
  const prefs = useLibraryPrefs();
  const bookmark = useBookmarkGate();
  const { bookmarks, recents, searches } = prefs;
  // When applying a saved search, carry its category across the corpus switch.
  const pendingCat = useRef<string | null>(null);

  // Reset the category filter + sort whenever the corpus changes (honour pending apply).
  useEffect(() => {
    setCategory(pendingCat.current ?? 'all');
    pendingCat.current = null;
    setSort(SORTS[kind][0]);
  }, [kind]);

  const applySearch = (s: { kind: LibraryKind; category: string; query: string }) => {
    setQuery(s.query);
    if (s.kind !== kind) {
      pendingCat.current = s.category;
      setKind(s.kind);
    } else {
      setCategory(s.category);
    }
  };

  // Lazy full-text index — fetched once, the first time a query reaches MIN_QUERY chars.
  const [entries, setEntries] = useState<SearchEntry[] | null>(null);
  const [indexLoading, setIndexLoading] = useState(false);
  const requested = useRef(false);

  // Debounce the live query so we don't refilter the corpus on every keystroke.
  const q = useDebouncedValue(query.trim(), 200);
  const fullText = q.length >= MIN_QUERY;

  useEffect(() => {
    if (!fullText || requested.current) return;
    requested.current = true;
    setIndexLoading(true);
    fetchJson<SearchIndex>('/data/library-search.json')
      .then((idx) => setEntries(idx.entries))
      .catch(() => setEntries([]))
      .finally(() => setIndexLoading(false));
  }, [fullText]);

  const docs = useMemo(() => {
    if (!data) return [];
    const needle = q.toLowerCase();
    return data.documents
      .filter((d) => category === 'all' || d.category === category)
      .filter(
        (d) =>
          !needle ||
          d.title.toLowerCase().includes(needle) ||
          (d.part ? `part ${d.part}`.includes(needle) : false) ||
          (d.badge ? d.badge.toLowerCase().includes(needle) : false),
      )
      .sort((a, b) => compareDocs(a, b, sort));
  }, [data, category, q, sort]);

  // Animated corpus figures for the hero readout. Pages (regulations) or
  // sections (reference/handbooks), whichever the corpus carries.
  const stats = useMemo<HeroStat[]>(() => {
    if (!data) return [];
    const pages = data.documents.reduce((s, d) => s + (d.pages ?? 0), 0);
    const sections = data.documents.reduce((s, d) => s + (d.sections ?? 0), 0);
    const out: HeroStat[] = [
      { label: t('library.stats.documents'), value: data.count, tone: 'cyan' },
    ];
    if (pages > 0) out.push({ label: t('library.stats.pages'), value: pages, tone: 'green' });
    else if (sections > 0)
      out.push({ label: t('library.stats.sections'), value: sections, tone: 'green' });
    out.push({ label: t('library.stats.categories'), value: data.categories.length, tone: 'gold' });
    return out;
  }, [data, t]);

  // slug → category for the active corpus, so full-text hits can honour the chips.
  const docCat = useMemo(() => {
    const m = new Map<string, string>();
    data?.documents.forEach((d) => m.set(d.slug, d.category));
    return m;
  }, [data]);

  // Full-text hits, scoped to the active corpus tab and category chip.
  const hits = useMemo(() => {
    if (!fullText || !entries) return [];
    const needle = q.toLowerCase();
    const out: SearchEntry[] = [];
    for (const e of entries) {
      if (!e.d.toLowerCase().includes(needle) && !(e.x ?? '').toLowerCase().includes(needle)) {
        continue;
      }
      const ref = toSearchRef(searchEntryLink(e));
      if (!ref || ref.kind !== kind) continue;
      if (category !== 'all' && docCat.get(ref.id) !== category) continue;
      out.push(e);
      if (out.length >= HIT_CAP) break;
    }
    return out;
  }, [fullText, entries, q, kind, category, docCat]);

  // Pagination + keyboard navigation for the hit list.
  const [visible, setVisible] = useState(PAGE);
  useEffect(() => setVisible(PAGE), [q, kind, category]);
  const shownHits = hits.slice(0, visible);
  const hitRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  function onHitKeyDown(e: React.KeyboardEvent<HTMLUListElement>) {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const items = hitRefs.current.filter(Boolean) as HTMLAnchorElement[];
    if (items.length === 0) return;
    const at = items.indexOf(document.activeElement as HTMLAnchorElement);
    const next = e.key === 'ArrowDown' ? Math.min(at + 1, items.length - 1) : Math.max(at - 1, 0);
    items[at === -1 ? 0 : next]?.focus();
  }

  const categoryLabel = (id: string) => data?.categories.find((c) => c.id === id)?.label ?? id;

  // Deterministic category → accent colour, by the category's order in the index.
  const catColor = useMemo(() => {
    const map = new Map<string, string>();
    data?.categories.forEach((c, i) => map.set(c.id, CAT_TOKENS[i % CAT_TOKENS.length]));
    return (id: string) => map.get(id) ?? CAT_TOKENS[0];
  }, [data]);

  // When not searching by text, group the cards under category section headers.
  const groups = useMemo(() => {
    if (!data) return [];
    const byCat = new Map<string, CorpusDoc[]>();
    for (const d of docs) {
      const arr = byCat.get(d.category);
      if (arr) arr.push(d);
      else byCat.set(d.category, [d]);
    }
    return data.categories
      .filter((c) => byCat.has(c.id))
      .map((c) => ({ id: c.id, label: c.label, docs: byCat.get(c.id) as CorpusDoc[] }));
  }, [data, docs]);

  const docMeta = (d: CorpusDoc) =>
    d.pages
      ? `${d.pages} ${t('library.pages')}`
      : d.sections
        ? `${d.sections} ${t('document.sections')}`
        : '';

  const renderCard = (d: CorpusDoc) => {
    const meta = docMeta(d);
    const marked = isBookmarked(prefs, kind, d.slug);
    return (
      <li key={d.slug} className={styles.cardWrap}>
        <button
          type="button"
          className={`${styles.star} ${marked ? styles.starOn : ''}`}
          aria-pressed={marked}
          aria-label={t(marked ? 'library.unbookmark' : 'library.bookmark')}
          onClick={() => bookmark.toggle({ kind, slug: d.slug, title: d.title }, marked)}
        >
          {marked ? '★' : '☆'}
        </button>
        <Link
          to={`${CORPUS[kind].base}/${d.slug}`}
          className={styles.card}
          style={{ '--cat-color': catColor(d.category) } as CSSProperties}
        >
          <span className={styles.catBar} aria-hidden="true" />
          <span className={styles.cardHead}>
            <span className={styles.badge}>
              {d.part ? `${t('library.part')} ${d.part}` : d.badge}
            </span>
            {meta && <span className={styles.meta}>{meta}</span>}
          </span>
          <span className={styles.cardTitle}>{d.title}</span>
          <span className={styles.cardFoot}>
            <span className={styles.cat}>{categoryLabel(d.category)}</span>
            <span className={styles.open}>{t('common.open')} →</span>
          </span>
        </Link>
      </li>
    );
  };

  // Compact list row — same data as the card, denser for scanning long corpora.
  const renderRow = (d: CorpusDoc) => {
    const meta = docMeta(d);
    const marked = isBookmarked(prefs, kind, d.slug);
    return (
      <li key={d.slug} className={hub.rowWrap}>
        <Link
          to={`${CORPUS[kind].base}/${d.slug}`}
          className={styles.row}
          style={{ '--cat-color': catColor(d.category) } as CSSProperties}
        >
          <span className={hub.rowBar} aria-hidden="true" />
          <span className={styles.rowBadge}>
            {d.part ? `${t('library.part')} ${d.part}` : d.badge}
          </span>
          <span className={styles.rowTitle}>{d.title}</span>
          <span className={styles.rowCat}>{categoryLabel(d.category)}</span>
          {meta && <span className={styles.rowMeta}>{meta}</span>}
        </Link>
        <button
          type="button"
          className={`${hub.rowStar} ${marked ? hub.starOn : ''}`}
          aria-pressed={marked}
          aria-label={t(marked ? 'library.unbookmark' : 'library.bookmark')}
          onClick={() => bookmark.toggle({ kind, slug: d.slug, title: d.title }, marked)}
        >
          {marked ? '★' : '☆'}
        </button>
      </li>
    );
  };

  const renderDoc = (d: CorpusDoc) => (view === 'list' ? renderRow(d) : renderCard(d));
  const listClass = `${hub.grid} ${view === 'list' ? hub.list : ''} stagger-grid`;

  return (
    <section className={`container ${styles.page}`}>
      <SearchHero
        eyebrow={t('library.eyebrow')}
        title={t('library.title')}
        subtitle={t('library.subtitle')}
        placeholder={t('library.searchPlaceholder')}
        query={query}
        onQueryChange={setQuery}
        stats={stats}
        chipsLabel={t('library.popular')}
        chips={SUGGESTIONS[kind].map((s) => ({ label: s, onClick: () => setQuery(s) }))}
        trailing={<Link to="/library/charts">{t('library.viewCharts')} →</Link>}
      />

      <OfflineDownloads />

      <Link to="/updates" className={styles.updatesLink}>
        <span className={styles.updatesText}>{t('alerts.libraryLink')}</span>
        <span className={styles.updatesPro}>{t('upsell.proOnly')}</span>
        <span aria-hidden="true">→</span>
      </Link>

      {!q && recents.length > 0 && (
        <section className={styles.personal} aria-label={t('library.continueReading')}>
          <h2 className={styles.personalHead}>{t('library.continueReading')}</h2>
          <ul className={styles.personalRow}>
            {recents.map((d) => (
              <li key={`${d.kind}:${d.slug}`}>
                <Link to={`${CORPUS[d.kind].base}/${d.slug}`} className={styles.personalCard}>
                  <span className={styles.personalKind}>{t(`library.kind.${d.kind}`)}</span>
                  <span className={styles.personalTitle}>{d.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!q && bookmarks.length > 0 && (
        <section className={styles.personal} aria-label={t('library.savedTitle')}>
          <h2 className={styles.personalHead}>★ {t('library.savedTitle')}</h2>
          <ul className={styles.personalRow}>
            {bookmarks.map((b) => (
              <li key={bookmarkKey(b)}>
                <Link
                  to={`${CORPUS[b.kind].base}/${b.slug}${b.anchor ? `#${b.anchor}` : ''}`}
                  className={styles.personalCard}
                >
                  <span className={styles.personalKind}>{t(`library.kind.${b.kind}`)}</span>
                  <span className={styles.personalTitle}>
                    {b.anchorText ? `${b.title} · ${b.anchorText}` : b.title}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Tabs label={t('library.browse')} className={styles.tabs}>
        {KINDS.map((k) => (
          <Tab key={k} active={kind === k} onClick={() => setKind(k)}>
            {t(`library.kind.${k}`)}
          </Tab>
        ))}
      </Tabs>

      {loading && (
        <ul className={`${hub.grid} ${styles.skeletonGrid}`} aria-hidden="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i} className={styles.skeleton} />
          ))}
        </ul>
      )}
      {error && (
        <Alert
          tone="error"
          role="alert"
          icon="⚠"
          action={{ label: t('library.retry'), onClick: () => setReload((r) => r + 1) }}
        >
          {t('common.loadError')}
        </Alert>
      )}

      {data && (
        <>
          <div className={styles.controls}>
            <div className={styles.chips} role="group" aria-label={t('library.eyebrow')}>
              <button
                type="button"
                className={`${styles.chip} ${category === 'all' ? styles.chipActive : ''}`}
                onClick={() => setCategory('all')}
              >
                {t('library.all')} <span className={styles.count}>{data.count}</span>
              </button>
              {data.categories.map((c) => {
                const n = data.documents.filter((d) => d.category === c.id).length;
                return (
                  <button
                    key={c.id}
                    type="button"
                    className={`${styles.chip} ${category === c.id ? styles.chipActive : ''}`}
                    onClick={() => setCategory(c.id)}
                  >
                    {c.label} <span className={styles.count}>{n}</span>
                  </button>
                );
              })}
            </div>

            <div className={styles.toolbar}>
              {(query.trim() || category !== 'all') && (
                <button
                  type="button"
                  className={styles.saveSearchBtn}
                  onClick={() => saveSearch({ kind, category, query: query.trim() })}
                >
                  ☆ {t('library.saveSearch')}
                </button>
              )}
              <div className={styles.toolbarEnd}>
                <SortSelect
                  label={t('library.sortBy')}
                  value={sort}
                  onChange={(v) => setSort(v as SortKey)}
                  options={SORTS[kind].map((s) => ({
                    value: s,
                    label: t(s === 'size' ? SIZE_LABEL[kind] : `library.sort.${s}`),
                  }))}
                />
                <ViewToggle
                  value={view}
                  onChange={setView}
                  groupLabel={t('library.view')}
                  gridLabel={t('library.viewGrid')}
                  listLabel={t('library.viewList')}
                />
              </div>
            </div>

            {query.trim() && !fullText && (
              <p className={styles.searchHint}>{t('library.searchHint')}</p>
            )}

            {searches.length > 0 && (
              <div className={styles.savedSearches} aria-label={t('library.savedSearches')}>
                {searches.map((s) => (
                  <span key={searchKey(s)} className={styles.savedSearch}>
                    <button
                      type="button"
                      className={styles.savedSearchApply}
                      onClick={() => applySearch(s)}
                    >
                      {s.query || t(`library.kind.${s.kind}`)}
                      {s.category !== 'all' ? ` · ${categoryLabel(s.category)}` : ''}
                    </button>
                    <button
                      type="button"
                      className={styles.savedSearchX}
                      aria-label={t('library.removeSearch')}
                      onClick={() => removeSearch(searchKey(s))}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {docs.length === 0 ? (
            <EmptyState
              icon="🔍"
              action={{
                label: t('common.clear'),
                onClick: () => {
                  setQuery('');
                  setCategory('all');
                },
              }}
            >
              {t('library.empty')}
            </EmptyState>
          ) : q ? (
            <ul className={listClass}>{docs.map(renderDoc)}</ul>
          ) : (
            groups.map((g) => (
              <section key={g.id} className={styles.group}>
                <SectionHeader
                  title={g.label}
                  tone={catColor(g.id)}
                  count={t('library.docsCount', { count: g.docs.length })}
                />
                <ul className={listClass}>{g.docs.map(renderDoc)}</ul>
              </section>
            ))
          )}

          {fullText && (
            <section className={styles.results}>
              {indexLoading && !entries ? (
                <p className={styles.resultsMeta} role="status">
                  {t('library.searching')}
                </p>
              ) : hits.length === 0 ? (
                <p className={styles.resultsMeta} role="status">
                  {t('library.noFullMatches', { q })}
                </p>
              ) : (
                <>
                  <h2 className={styles.resultsHead}>{t('library.fullResults')}</h2>
                  <p className={styles.resultsMeta} role="status" aria-live="polite">
                    {t('library.showing', { shown: shownHits.length, total: hits.length })}
                    {hits.length >= HIT_CAP && ` · ${t('library.capHint', { max: HIT_CAP })}`}
                  </p>
                  <ul className={styles.hitList} onKeyDown={onHitKeyDown}>
                    {shownHits.map((e, i) => {
                      const href = searchHref(searchEntryLink(e), q);
                      const body = (
                        <Fragment>
                          <span className={styles.hitBadge}>{e.b}</span>
                          <span className={styles.hitTitle}>{highlight(e.d, q)}</span>
                          {e.x && <span className={styles.hitExcerpt}>{highlight(e.x, q)}</span>}
                        </Fragment>
                      );
                      return (
                        <li key={`${href ?? e.d}-${i}`}>
                          {href ? (
                            <Link
                              to={href}
                              className={styles.hit}
                              ref={(el) => {
                                hitRefs.current[i] = el;
                              }}
                            >
                              {body}
                            </Link>
                          ) : (
                            <span className={styles.hit}>{body}</span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                  {visible < hits.length && (
                    <button
                      type="button"
                      className={styles.loadMore}
                      onClick={() => setVisible((v) => v + PAGE)}
                    >
                      {t('library.loadMore')}
                    </button>
                  )}
                </>
              )}
            </section>
          )}

          <p className={styles.synced}>{t('library.synced', { date: data.generated })}</p>
        </>
      )}

      <div className={styles.footnote}>
        <Disclaimer compact />
      </div>
    </section>
  );
}
