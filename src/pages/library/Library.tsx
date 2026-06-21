import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useFetchJson } from '../../lib/useFetchJson';
import { useDebouncedValue } from '../../lib/useDebouncedValue';
import { usePageMeta } from '../../lib/usePageMeta';
import { CORPUS, fetchJson, parseSearchUrl, searchHref } from '../../lib/content';
import type {
  CorpusDoc,
  CorpusIndex,
  LibraryKind,
  SearchEntry,
  SearchIndex,
} from '../../lib/content';
import {
  useLibraryPrefs,
  toggleBookmark,
  isBookmarked,
  saveSearch,
  removeSearch,
  searchKey,
  bookmarkKey,
} from '../../lib/libraryPrefs';
import { Disclaimer } from '../../components/Disclaimer';
import { SectionHeader } from '../../components/SectionHeader';
import { OfflineDownloads } from '../../components/pwa/OfflineDownloads';
import styles from './Library.module.css';

const MIN_QUERY = 3;
/** Max full-text matches collected before we ask the user to refine. */
const HIT_CAP = 400;
/** Full-text results revealed per "load more" page. */
const PAGE = 30;
const KINDS: LibraryKind[] = ['regulations', 'reference', 'handbook'];
/** Per-category accent — cycles the Falcon hues from the design-token map. */
const CAT_TOKENS = ['var(--cat-1)', 'var(--cat-2)', 'var(--cat-3)', 'var(--cat-4)', 'var(--cat-5)'];

/** Split text on a case-insensitive needle, wrapping matches in <mark>. */
function highlight(text: string, needle: string) {
  if (!needle) return text;
  const lower = text.toLowerCase();
  const n = needle.toLowerCase();
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

export function Library() {
  const { t } = useTranslation();
  usePageMeta(t('meta.library'), t('metaDesc.library'));
  const [kind, setKind] = useState<LibraryKind>('regulations');
  const [reload, setReload] = useState(0);
  const { data, error, loading } = useFetchJson<CorpusIndex>(CORPUS[kind].index, reload);
  const [category, setCategory] = useState<string>('all');
  // Seed the search from a `?q=` deep link (e.g. the home dashboard's search tile).
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(() => searchParams.get('q') ?? '');
  const prefs = useLibraryPrefs();
  const { bookmarks, recents, searches } = prefs;
  // When applying a saved search, carry its category across the corpus switch.
  const pendingCat = useRef<string | null>(null);

  // Reset the category filter whenever the corpus changes (honouring a pending apply).
  useEffect(() => {
    setCategory(pendingCat.current ?? 'all');
    pendingCat.current = null;
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
      .sort((a, b) => (a.partNum ?? 0) - (b.partNum ?? 0) || a.title.localeCompare(b.title));
  }, [data, category, q]);

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
      const ref = parseSearchUrl(e.u);
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

  const renderCard = (d: CorpusDoc) => {
    const meta = d.pages
      ? `${d.pages} ${t('library.pages')}`
      : d.sections
        ? `${d.sections} ${t('document.sections')}`
        : '';
    const marked = isBookmarked(prefs, kind, d.slug);
    return (
      <li key={d.slug} className={styles.cardWrap}>
        <button
          type="button"
          className={`${styles.star} ${marked ? styles.starOn : ''}`}
          aria-pressed={marked}
          aria-label={t(marked ? 'library.unbookmark' : 'library.bookmark')}
          onClick={() => toggleBookmark({ kind, slug: d.slug, title: d.title })}
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

  return (
    <section className={`container ${styles.page}`}>
      <header className={styles.head}>
        <p className={styles.eyebrow}>{t('library.eyebrow')}</p>
        <h1>{t('library.title')}</h1>
        <p className={styles.subtitle}>{t('library.subtitle')}</p>
        <Link className={styles.chartsLink} to="/library/charts">
          {t('library.viewCharts')} →
        </Link>
      </header>

      <OfflineDownloads />

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

      <div className={styles.tabs} role="tablist" aria-label={t('library.browse')}>
        {KINDS.map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={kind === k}
            className={`${styles.tab} ${kind === k ? styles.tabActive : ''}`}
            onClick={() => setKind(k)}
          >
            {t(`library.kind.${k}`)}
          </button>
        ))}
      </div>

      {loading && (
        <ul className={`${styles.grid} ${styles.skeletonGrid}`} aria-hidden="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i} className={styles.skeleton} />
          ))}
        </ul>
      )}
      {error && (
        <div className={styles.errorBox} role="alert">
          <p>{t('common.loadError')}</p>
          <button type="button" className={styles.retry} onClick={() => setReload((r) => r + 1)}>
            {t('library.retry')}
          </button>
        </div>
      )}

      {data && (
        <>
          <div className={styles.controls}>
            <div className={styles.searchRow}>
              <input
                className={styles.search}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('library.searchPlaceholder')}
                aria-label={t('library.searchPlaceholder')}
              />
              {(query.trim() || category !== 'all') && (
                <button
                  type="button"
                  className={styles.saveSearchBtn}
                  onClick={() => saveSearch({ kind, category, query: query.trim() })}
                >
                  ☆ {t('library.saveSearch')}
                </button>
              )}
            </div>
            <p className={styles.searchHint}>{t('library.searchHint')}</p>
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
          </div>

          {docs.length === 0 ? (
            <p className={styles.empty}>{t('library.empty')}</p>
          ) : q ? (
            <ul className={`${styles.grid} stagger-grid`}>{docs.map(renderCard)}</ul>
          ) : (
            groups.map((g) => (
              <section key={g.id} className={styles.group}>
                <SectionHeader
                  title={g.label}
                  tone={catColor(g.id)}
                  count={t('library.docsCount', { count: g.docs.length })}
                />
                <ul className={`${styles.grid} stagger-grid`}>{g.docs.map(renderCard)}</ul>
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
                      const href = searchHref(e.u, q);
                      const body = (
                        <Fragment>
                          <span className={styles.hitBadge}>{e.b}</span>
                          <span className={styles.hitTitle}>{highlight(e.d, q)}</span>
                          {e.x && <span className={styles.hitExcerpt}>{highlight(e.x, q)}</span>}
                        </Fragment>
                      );
                      return (
                        <li key={`${e.u}-${i}`}>
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
