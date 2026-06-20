import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useFetchJson } from '../../lib/useFetchJson';
import { sanitizeHtml, tocFromHtml, useFetchText } from '../../lib/useFetchText';
import { CORPUS } from '../../lib/content';
import type { CorpusIndex, LibraryKind } from '../../lib/content';
import { usePageMeta } from '../../lib/usePageMeta';
import { Disclaimer } from '../../components/Disclaimer';
import styles from './Document.module.css';

interface DocumentProps {
  /** Which corpus this reader is mounted for. Defaults to GACAR regulations. */
  kind?: LibraryKind;
}

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

export function Document({ kind = 'regulations' }: DocumentProps) {
  const { t } = useTranslation();
  const { hash } = useLocation();
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const q = (searchParams.get('q') ?? '').trim();
  const corpus = CORPUS[kind];
  const index = useFetchJson<CorpusIndex>(corpus.index);
  const doc = index.data?.documents.find((d) => d.slug === slug);
  const { text, error, loading } = useFetchText(`${corpus.dir}/${slug}.html`);
  const [filter, setFilter] = useState('');
  const [progress, setProgress] = useState(0);
  const [tocOpen, setTocOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  usePageMeta(doc?.title, doc?.title ? `${doc.title} — ${t('document.verifyAtGaca')}` : undefined);

  // Reading progress bar
  const onScroll = useCallback(() => {
    const el = document.documentElement;
    const total = el.scrollHeight - el.clientHeight;
    setProgress(total > 0 ? Math.round((el.scrollTop / total) * 100) : 0);
  }, []);
  useEffect(() => {
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [onScroll]);

  const html = useMemo(() => (text ? sanitizeHtml(text) : ''), [text]);
  const toc = useMemo(() => (text ? tocFromHtml(text) : []), [text]);
  const filteredToc = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return q ? toc.filter((e) => e.title.toLowerCase().includes(q)) : toc;
  }, [toc, filter]);

  // Once content is in the DOM: highlight the search phrase (when arriving from a
  // full-text hit's `?q=`) and scroll to the first match, else to the anchor.
  useEffect(() => {
    if (!html) return;
    const id = hash.replace(/^#/, '');
    const firstMark = contentRef.current && q ? highlightMatches(contentRef.current, q) : null;
    if (firstMark) firstMark.scrollIntoView({ block: 'center' });
    else if (id) document.getElementById(id)?.scrollIntoView();
  }, [html, hash, q]);

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
                  <li key={e.id}>
                    <a
                      href={`#${e.id}`}
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
                  </li>
                ))}
              </ul>
            </nav>

            <div
              ref={contentRef}
              className={styles.content}
              // Trusted, machine-extracted GACAR HTML from our own corpus; sanitized above.
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </div>

          <Disclaimer />
        </>
      )}
    </article>
  );
}
