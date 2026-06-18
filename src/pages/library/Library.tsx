import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useFetchJson } from '../../lib/useFetchJson';
import { usePageMeta } from '../../lib/usePageMeta';
import { CORPUS, fetchJson, searchHref } from '../../lib/content';
import type { CorpusIndex, LibraryKind, SearchEntry, SearchIndex } from '../../lib/content';
import { Disclaimer } from '../../components/Disclaimer';
import styles from './Library.module.css';

const MIN_QUERY = 3;
const MAX_HITS = 80;
const KINDS: LibraryKind[] = ['regulations', 'reference', 'handbook'];

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
  usePageMeta(t('meta.library'));
  const [kind, setKind] = useState<LibraryKind>('regulations');
  const { data, error, loading } = useFetchJson<CorpusIndex>(CORPUS[kind].index);
  const [category, setCategory] = useState<string>('all');
  // Seed the search from a `?q=` deep link (e.g. the home dashboard's search tile).
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(() => searchParams.get('q') ?? '');

  // Reset the category filter whenever the corpus changes.
  useEffect(() => setCategory('all'), [kind]);

  // Lazy full-text index — fetched once, the first time a query reaches MIN_QUERY chars.
  const [entries, setEntries] = useState<SearchEntry[] | null>(null);
  const [indexLoading, setIndexLoading] = useState(false);
  const requested = useRef(false);

  const q = query.trim();
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

  const hits = useMemo(() => {
    if (!fullText || !entries) return [];
    const needle = q.toLowerCase();
    const out: SearchEntry[] = [];
    for (const e of entries) {
      if (e.d.toLowerCase().includes(needle) || (e.x ?? '').toLowerCase().includes(needle)) {
        out.push(e);
        if (out.length >= MAX_HITS) break;
      }
    }
    return out;
  }, [fullText, entries, q]);

  const categoryLabel = (id: string) => data?.categories.find((c) => c.id === id)?.label ?? id;

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

      {loading && <p>{t('common.loading')}</p>}
      {error && <p role="alert">{t('common.loadError')}</p>}

      {data && (
        <>
          <div className={styles.controls}>
            <input
              className={styles.search}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('library.searchPlaceholder')}
              aria-label={t('library.searchPlaceholder')}
            />
            <p className={styles.searchHint}>{t('library.searchHint')}</p>
            <div className={styles.chips} role="group" aria-label={t('library.eyebrow')}>
              <button
                type="button"
                className={`${styles.chip} ${category === 'all' ? styles.chipActive : ''}`}
                onClick={() => setCategory('all')}
              >
                {t('library.all')} ({data.count})
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
                    {c.label} ({n})
                  </button>
                );
              })}
            </div>
          </div>

          {docs.length === 0 ? (
            <p className={styles.empty}>{t('library.empty')}</p>
          ) : (
            <ul className={styles.grid}>
              {docs.map((d) => (
                <li key={d.slug}>
                  <Link to={`${CORPUS[kind].base}/${d.slug}`} className={styles.card}>
                    <span className={styles.badge}>
                      {d.part ? `${t('library.part')} ${d.part}` : d.badge}
                    </span>
                    <span className={styles.cat}>{categoryLabel(d.category)}</span>
                    <span className={styles.cardTitle}>{d.title}</span>
                    <span className={styles.pages}>
                      {d.pages
                        ? `${d.pages} ${t('library.pages')}`
                        : d.sections
                          ? `${d.sections} ${t('document.sections')}`
                          : ''}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {fullText && (
            <section className={styles.results} aria-live="polite">
              {indexLoading && !entries ? (
                <p className={styles.resultsMeta}>{t('library.searching')}</p>
              ) : hits.length === 0 ? (
                <p className={styles.resultsMeta}>{t('library.noFullMatches', { q })}</p>
              ) : (
                <>
                  <h2 className={styles.resultsHead}>{t('library.fullResults')}</h2>
                  <p className={styles.resultsMeta}>
                    {hits.length >= MAX_HITS
                      ? t('library.moreHits', { max: MAX_HITS })
                      : t('library.hitsCount', { count: hits.length })}
                  </p>
                  <ul className={styles.hitList}>
                    {hits.map((e, i) => {
                      const href = searchHref(e.u);
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
                            <Link to={href} className={styles.hit}>
                              {body}
                            </Link>
                          ) : (
                            <span className={styles.hit}>{body}</span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
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
