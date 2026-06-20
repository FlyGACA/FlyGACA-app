import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useFetchJson } from '../../lib/useFetchJson';
import { useDebouncedValue } from '../../lib/useDebouncedValue';
import { sanitizeHtml, tocFromHtml, useFetchText } from '../../lib/useFetchText';
import { CORPUS } from '../../lib/content';
import type { CorpusIndex, LibraryKind } from '../../lib/content';
import { docNeighbors, relatedDocs } from '../../calc/corpusNav';
import { adelLink } from '../../lib/adel';
import { loadSaved, offlineSupported, removeDoc, saveDoc } from '../../lib/offlineCache';
import { share } from '../../lib/native-bridge';
import { usePageMeta } from '../../lib/usePageMeta';
import { Disclaimer } from '../../components/Disclaimer';
import styles from './Document.module.css';

interface DocumentProps {
  /** Which corpus this reader is mounted for. Defaults to GACAR regulations. */
  kind?: LibraryKind;
}

const SCALE_KEY = 'flygaca:reader-scale';
const SCALE_MIN = 0.9;
const SCALE_MAX = 1.4;
const SCALE_STEP = 0.1;

/**
 * Wrap every case-insensitive occurrence of `needle` inside `root`'s text nodes
 * in `<mark data-hit>`, skipping text already inside a mark so repeated runs
 * don't double-wrap. Returns the first mark created (to scroll into view).
 */
function highlightMatches(root: HTMLElement, needle: string): HTMLElement | null {
  const n = needle.toLowerCase();
  if (!n) return null;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const targets: Text[] = [];
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const tn = node as Text;
    const val = tn.nodeValue;
    if (!val || !val.toLowerCase().includes(n)) continue;
    if (tn.parentElement?.closest('mark')) continue;
    targets.push(tn);
  }
  let first: HTMLElement | null = null;
  for (const tn of targets) {
    const text = tn.nodeValue as string;
    const lower = text.toLowerCase();
    const frag = document.createDocumentFragment();
    let i = 0;
    let idx = lower.indexOf(n);
    while (idx !== -1) {
      if (idx > i) frag.appendChild(document.createTextNode(text.slice(i, idx)));
      const mark = document.createElement('mark');
      mark.dataset.hit = '1';
      mark.textContent = text.slice(idx, idx + n.length);
      frag.appendChild(mark);
      if (!first) first = mark;
      i = idx + n.length;
      idx = lower.indexOf(n, i);
    }
    if (i < text.length) frag.appendChild(document.createTextNode(text.slice(i)));
    tn.parentNode?.replaceChild(frag, tn);
  }
  return first;
}

/** Unwrap every search `<mark>` back into plain text so a new query starts clean. */
function clearHighlights(root: HTMLElement): void {
  root.querySelectorAll('mark[data-hit]').forEach((m) => {
    m.replaceWith(document.createTextNode(m.textContent ?? ''));
  });
  root.normalize();
}

export function Document({ kind = 'regulations' }: DocumentProps) {
  const { t } = useTranslation();
  const { hash, pathname } = useLocation();
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const q = (searchParams.get('q') ?? '').trim();
  const corpus = CORPUS[kind];
  const index = useFetchJson<CorpusIndex>(corpus.index);
  const docs = useMemo(() => index.data?.documents ?? [], [index.data]);
  const doc = docs.find((d) => d.slug === slug);
  const { text, error, loading } = useFetchText(`${corpus.dir}/${slug}.html`);
  const [filter, setFilter] = useState('');
  const [progress, setProgress] = useState(0);
  const [showTop, setShowTop] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);
  const [activeId, setActiveId] = useState('');
  const [copiedId, setCopiedId] = useState('');
  const contentRef = useRef<HTMLDivElement>(null);
  usePageMeta(doc?.title, doc?.title ? `${doc.title} — ${t('document.verifyAtGaca')}` : undefined);

  // ── Reading font scale (persisted) ──
  const [scale, setScale] = useState(() => {
    try {
      const v = parseFloat(localStorage.getItem(SCALE_KEY) ?? '1');
      return Number.isFinite(v) ? Math.min(SCALE_MAX, Math.max(SCALE_MIN, v)) : 1;
    } catch {
      return 1;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(SCALE_KEY, String(scale));
    } catch {
      /* ignore */
    }
  }, [scale]);
  const step = (delta: number) =>
    setScale((s) => Math.min(SCALE_MAX, Math.max(SCALE_MIN, Math.round((s + delta) * 10) / 10)));

  // ── Find-in-page ──
  const [find, setFind] = useState(q);
  const debouncedFind = useDebouncedValue(find, 200);
  const [matchCount, setMatchCount] = useState(0);
  const [activeMatch, setActiveMatch] = useState(0);
  const marksRef = useRef<HTMLElement[]>([]);

  // ── Reading progress + back-to-top ──
  const onScroll = useCallback(() => {
    const el = document.documentElement;
    const total = el.scrollHeight - el.clientHeight;
    setProgress(total > 0 ? Math.round((el.scrollTop / total) * 100) : 0);
    setShowTop(el.scrollTop > 600);
  }, []);
  useEffect(() => {
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [onScroll]);

  const html = useMemo(() => (text ? sanitizeHtml(text) : ''), [text]);
  const toc = useMemo(() => (text ? tocFromHtml(text) : []), [text]);
  const filteredToc = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    return needle ? toc.filter((e) => e.title.toLowerCase().includes(needle)) : toc;
  }, [toc, filter]);

  const copyLink = useCallback(
    (id: string) => {
      const url = `${window.location.origin}${pathname}#${id}`;
      navigator.clipboard
        ?.writeText(url)
        .then(() => {
          setCopiedId(id);
          window.setTimeout(() => setCopiedId(''), 1500);
        })
        .catch(() => {
          /* clipboard blocked — ignore */
        });
      window.history.replaceState(null, '', `#${id}`);
    },
    [pathname],
  );

  // Re-highlight the content whenever the (debounced) find query changes.
  useEffect(() => {
    const root = contentRef.current;
    if (!root || !html) return;
    clearHighlights(root);
    marksRef.current = [];
    const needle = debouncedFind.trim();
    if (!needle) {
      setMatchCount(0);
      setActiveMatch(0);
      return;
    }
    highlightMatches(root, needle);
    const marks = Array.from(root.querySelectorAll<HTMLElement>('mark[data-hit]'));
    marksRef.current = marks;
    setMatchCount(marks.length);
    setActiveMatch(0);
    if (marks[0]) {
      marks[0].dataset.active = '1';
      marks[0].scrollIntoView({ block: 'center' });
    }
  }, [debouncedFind, html]);

  function cycle(delta: number) {
    const marks = marksRef.current;
    if (!marks.length) return;
    marks[activeMatch]?.removeAttribute('data-active');
    const nextI = (activeMatch + delta + marks.length) % marks.length;
    setActiveMatch(nextI);
    marks[nextI].dataset.active = '1';
    marks[nextI].scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  // Scroll to the hash anchor on load (when not actively searching).
  useEffect(() => {
    if (!html || debouncedFind.trim()) return;
    const id = hash.replace(/^#/, '');
    if (id) document.getElementById(id)?.scrollIntoView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [html, hash]);

  // Scroll-spy: track the heading nearest the top of the viewport.
  useEffect(() => {
    const root = contentRef.current;
    if (!root || !html) return;
    const heads = Array.from(root.querySelectorAll<HTMLElement>('h2[id],h3[id]'));
    if (!heads.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: '-120px 0px -68% 0px' },
    );
    heads.forEach((h) => obs.observe(h));
    return () => obs.disconnect();
  }, [html]);

  // Decorate each heading with a trailing copy-link anchor (added to sanitized DOM).
  useEffect(() => {
    const root = contentRef.current;
    if (!root || !html) return;
    const heads = root.querySelectorAll<HTMLElement>('h2[id],h3[id]');
    heads.forEach((h) => {
      if (h.querySelector(`.${styles.anchor}`)) return;
      const a = document.createElement('button');
      a.type = 'button';
      a.className = styles.anchor;
      a.textContent = '#';
      a.setAttribute('aria-label', t('document.copyLink'));
      a.addEventListener('click', () => copyLink(h.id));
      h.appendChild(a);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [html, copyLink]);

  const { prev, next } = docNeighbors(docs, slug);
  const related = relatedDocs(docs, slug);
  const adel = doc ? adelLink(t('document.adelPrompt', { title: doc.title })) : null;

  // "Save for offline": warm the SW data cache with this doc's HTML + its index.
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    setSaved(!!slug && loadSaved().includes(slug));
  }, [slug]);
  async function toggleSave() {
    if (!slug) return;
    const urls = [`${corpus.dir}/${slug}.html`, corpus.index];
    if (saved) {
      await removeDoc(slug, urls);
      setSaved(false);
    } else {
      const ok = await saveDoc(slug, urls);
      setSaved(ok);
    }
  }
  function shareDoc() {
    void share({ title: doc?.title, url: window.location.href });
  }

  // The eyebrow badge: "Part 91" for regulations, the corpus badge otherwise.
  const badge = doc?.part ? `${t('library.part')} ${doc.part}` : doc?.badge;
  const count = doc?.pages
    ? `${doc.pages} ${t('library.pages')}`
    : doc?.sections
      ? `${doc.sections} ${t('document.sections')}`
      : null;

  return (
    <article className={`container ${styles.page}`}>
      {html && (
        <div className={styles.readingTrack} aria-hidden="true">
          <div className={styles.readingBar} style={{ inlineSize: `${progress}%` }} />
        </div>
      )}
      <p className={styles.back}>
        <Link to="/library">← {t('library.title')}</Link>
      </p>

      {loading && <p>{t('common.loading')}</p>}
      {error && <p role="alert">{t('common.loadError')}</p>}

      {html && (
        <>
          <header className={styles.head}>
            <div className={styles.meta}>
              {badge && <span className={styles.badge}>{badge}</span>}
              {count && <span className={styles.pages}>{count}</span>}
            </div>
            {doc && <h1>{doc.title}</h1>}
            <p className={styles.verify}>{t('document.verifyLine')}</p>
          </header>

          {/* Reader toolbar: find-in-page · font size · ask Adel */}
          <div className={styles.toolbar}>
            <div className={styles.find} role="search">
              <input
                className={styles.findInput}
                type="search"
                value={find}
                onChange={(e) => setFind(e.target.value)}
                placeholder={t('document.findPlaceholder')}
                aria-label={t('document.findPlaceholder')}
              />
              {find.trim() && (
                <>
                  <span className={styles.findCount} aria-live="polite">
                    {matchCount
                      ? t('document.findCount', { n: activeMatch + 1, total: matchCount })
                      : '0'}
                  </span>
                  <button
                    type="button"
                    className={styles.iconBtn}
                    onClick={() => cycle(-1)}
                    disabled={matchCount === 0}
                    aria-label={t('document.findPrev')}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className={styles.iconBtn}
                    onClick={() => cycle(1)}
                    disabled={matchCount === 0}
                    aria-label={t('document.findNext')}
                  >
                    ↓
                  </button>
                </>
              )}
            </div>

            <div className={styles.toolGroup}>
              <div className={styles.fontControls} role="group" aria-label={t('document.fontSize')}>
                <button
                  type="button"
                  className={styles.iconBtn}
                  onClick={() => step(-SCALE_STEP)}
                  disabled={scale <= SCALE_MIN}
                  aria-label={t('document.fontSmaller')}
                >
                  A−
                </button>
                <button
                  type="button"
                  className={styles.iconBtn}
                  onClick={() => step(SCALE_STEP)}
                  disabled={scale >= SCALE_MAX}
                  aria-label={t('document.fontLarger')}
                >
                  A+
                </button>
              </div>
              {offlineSupported() && (
                <button
                  type="button"
                  className={`${styles.toolPill} ${saved ? styles.toolPillOn : ''}`}
                  aria-pressed={saved}
                  onClick={() => void toggleSave()}
                >
                  {saved ? `✓ ${t('offline.saved')}` : `⬇ ${t('offline.save')}`}
                </button>
              )}
              <button type="button" className={styles.toolPill} onClick={shareDoc}>
                ↗ {t('common.share')}
              </button>
              {adel && (
                <Link to={adel} className={styles.askAdel}>
                  {t('document.askAdel')}
                </Link>
              )}
            </div>
          </div>

          <button
            type="button"
            className={styles.tocToggle}
            aria-expanded={tocOpen}
            onClick={() => setTocOpen((o) => !o)}
          >
            {t('document.toc')}
          </button>

          <div className={styles.layout}>
            <nav
              className={`${styles.toc} ${tocOpen ? styles.tocOpen : ''}`}
              aria-label={t('document.toc')}
            >
              <input
                className={styles.tocFilter}
                type="search"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder={t('document.filterToc')}
                aria-label={t('document.filterToc')}
              />
              <ul>
                {filteredToc.map((e) => (
                  <li key={e.id} className={styles.tocRow}>
                    <a
                      href={`#${e.id}`}
                      className={activeId === e.id ? styles.tocActive : undefined}
                      aria-current={activeId === e.id ? 'location' : undefined}
                      onClick={() => {
                        setTocOpen(false);
                        setTimeout(
                          () =>
                            document
                              .getElementById(e.id)
                              ?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
                          0,
                        );
                      }}
                    >
                      {e.title}
                    </a>
                    <button
                      type="button"
                      className={styles.tocCopy}
                      aria-label={t('document.copyLink')}
                      title={copiedId === e.id ? t('document.copied') : t('document.copyLink')}
                      onClick={() => copyLink(e.id)}
                    >
                      {copiedId === e.id ? '✓' : '⧉'}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>

            <div
              ref={contentRef}
              className={styles.content}
              style={{ ['--reader-scale' as string]: String(scale) }}
              // Trusted, machine-extracted GACAR HTML from our own corpus; sanitized above.
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </div>

          {related.length > 0 && (
            <section className={styles.related}>
              <h2 className={styles.relatedHead}>{t('document.related')}</h2>
              <ul className={styles.relatedGrid}>
                {related.map((r) => (
                  <li key={r.slug}>
                    <Link to={`${corpus.base}/${r.slug}`} className={styles.relatedCard}>
                      {r.part && (
                        <span className={styles.relatedBadge}>
                          {t('library.part')} {r.part}
                        </span>
                      )}
                      <span className={styles.relatedTitle}>{r.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <nav className={styles.prevNext} aria-label={t('library.title')}>
            {prev ? (
              <Link to={`${corpus.base}/${prev.slug}`} className={styles.prevNextLink}>
                <span className={styles.prevNextDir}>← {t('document.prev')}</span>
                <span className={styles.prevNextName}>{prev.title}</span>
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link
                to={`${corpus.base}/${next.slug}`}
                className={`${styles.prevNextLink} ${styles.prevNextEnd}`}
              >
                <span className={styles.prevNextDir}>{t('document.next')} →</span>
                <span className={styles.prevNextName}>{next.title}</span>
              </Link>
            ) : (
              <span />
            )}
          </nav>

          <Disclaimer />
        </>
      )}

      {showTop && (
        <button
          type="button"
          className={styles.backTop}
          aria-label={t('document.backToTop')}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          ↑
        </button>
      )}
    </article>
  );
}
