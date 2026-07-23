import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useFetchJson } from '@/hooks/useFetchJson';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { sanitizeHtml, tocFromHtml, useFetchText } from '@/hooks/useFetchText';
import { CORPUS } from '@/lib/content';
import type { CorpusIndex, LibraryKind } from '@/lib/content';
import { docNeighbors, relatedDocs } from '@/calc/corpusNav';
import { adelLink } from '@/lib/adel';
import { loadSaved, removeDoc, saveDoc } from '@/lib/native/offlineCache';
import { shareCurrent } from '@/lib/share';
import { useOnline } from '@/lib/native/pwa';
import { usePageMeta } from '@/hooks/usePageMeta';
import {
  useLibraryPrefs,
  recordView,
  addNote,
  removeNote,
  isBookmarked,
  docKey,
  type LibNote,
} from '@/lib/prefs/libraryPrefs';
import {
  clearAnnotations,
  clearHighlights,
  highlightMatches,
  nearestSectionId,
  wrapAnnotation,
} from '@/lib/readerMarks';
import { useBookmarkGate } from '@/hooks/useBookmarkGate';
import { useFeature } from '@/lib/services/features';
import { SelectionPopover, type SelectionRect } from '@/components/library/SelectionPopover';
import { breadcrumbLd, techArticleLd, type Crumb } from '@/lib/seo/jsonld';
import { ReaderToolbar } from './ReaderToolbar';
import { ReaderToc } from './ReaderToc';
import { ReaderNotes } from './ReaderNotes';
import { Disclaimer } from '@/components/Disclaimer';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import styles from './Document.module.css';

interface DocumentProps {
  /** Which corpus this reader is mounted for. Defaults to GACAR regulations. */
  kind?: LibraryKind;
}

const SCALE_KEY = 'flygaca:reader-scale';
const SCALE_MIN = 0.9;
const SCALE_MAX = 1.4;
const SCALE_STEP = 0.1;

export function Document({ kind = 'regulations' }: DocumentProps) {
  const { t, i18n } = useTranslation();
  const { hash, pathname } = useLocation();
  const navigate = useNavigate();
  const bookmark = useBookmarkGate();
  const canOffline = useFeature('offline-sync');
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const q = (searchParams.get('q') ?? '').trim();
  const corpus = CORPUS[kind];
  const index = useFetchJson<CorpusIndex>(corpus.index);
  const docs = useMemo(() => index.data?.documents ?? [], [index.data]);
  const doc = docs.find((d) => d.slug === slug);
  const { text, error, loading } = useFetchText(`${corpus.dir}/${slug}.html`);
  const online = useOnline();
  const prefs = useLibraryPrefs();
  const dk = docKey({ kind, slug: slug ?? '' });
  const notesForDoc = prefs.notes[dk];
  const docBookmarked = !!slug && isBookmarked(prefs, kind, slug);
  const [filter, setFilter] = useState('');
  const [progress, setProgress] = useState(0);
  const [showTop, setShowTop] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);
  const [activeId, setActiveId] = useState('');
  const [copiedId, setCopiedId] = useState('');
  const contentRef = useRef<HTMLDivElement>(null);
  const docDesc = doc?.title ? `${doc.title} — ${t('document.verifyAtGaca')}` : undefined;
  // The corpus carries a real freshness signal (effectiveDate, or a date-shaped
  // revision marker); fall back to the index's generated date. Mirrors the same
  // resolution in scripts/build-sitemap.mjs + scripts/prerender-head.mjs.
  const asDate = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : undefined);
  const dateModified =
    asDate(doc?.effectiveDate) ?? asDate(doc?.revision) ?? asDate(index.data?.generated);
  // One crumb trail for both the JSON-LD and the visible <Breadcrumbs/>.
  const crumbs: Crumb[] = doc?.title
    ? [
        { name: t('nav.breadcrumbHome'), path: '/' },
        { name: t('nav.library'), path: '/library' },
        { name: doc.title, path: pathname },
      ]
    : [];
  usePageMeta(
    doc?.title,
    docDesc,
    doc?.title
      ? [
          techArticleLd({
            title: doc.title,
            description: docDesc,
            path: pathname,
            lang: i18n.language,
            dateModified,
          }),
          breadcrumbLd(crumbs),
        ]
      : undefined,
    { ogType: 'article' },
  );

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

  // ── Text selection → highlight / note popover ──
  const [sel, setSel] = useState<{ rect: SelectionRect; quote: string; sectionId: string } | null>(
    null,
  );
  const closeSel = useCallback(() => {
    setSel(null);
    window.getSelection()?.removeAllRanges();
  }, []);

  // ── Reading progress + back-to-top ──
  const onScroll = useCallback(() => {
    const el = document.documentElement;
    const total = el.scrollHeight - el.clientHeight;
    setProgress(total > 0 ? Math.round((el.scrollTop / total) * 100) : 0);
    setShowTop(el.scrollTop > 600);
    setSel((s) => (s ? null : s)); // a moved selection rect would be stale
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

  // Record this document in "recently viewed" once its metadata resolves.
  useEffect(() => {
    if (doc && slug) recordView({ kind, slug, title: doc.title });
  }, [doc, slug, kind]);

  // Capture a text selection inside the reader to offer highlight / note.
  useEffect(() => {
    const onMouseUp = () => {
      const root = contentRef.current;
      const selection = window.getSelection();
      if (!root || !selection || selection.isCollapsed || !selection.rangeCount) return;
      const range = selection.getRangeAt(0);
      if (!root.contains(range.commonAncestorContainer)) return;
      const quote = selection.toString().trim();
      if (quote.length < 3 || quote.length > 400) return;
      const r = range.getBoundingClientRect();
      setSel({
        rect: { top: r.top, left: r.left, width: r.width, height: r.height },
        quote,
        sectionId: nearestSectionId(root, range.startContainer),
      });
    };
    document.addEventListener('mouseup', onMouseUp);
    return () => document.removeEventListener('mouseup', onMouseUp);
  }, [html]);

  // Re-anchor saved annotations into the rendered content (best-effort).
  useEffect(() => {
    const root = contentRef.current;
    if (!root || !html) return;
    clearAnnotations(root);
    for (const n of notesForDoc ?? []) wrapAnnotation(root, n, styles.annot);
  }, [html, notesForDoc]);

  const saveAnnotation = useCallback(
    (note: string) => {
      if (!sel || !slug) return;
      const entry: LibNote = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        sectionId: sel.sectionId,
        quote: sel.quote,
        note,
        created: new Date().toISOString(),
      };
      addNote(dk, entry);
      closeSel();
    },
    [sel, slug, dk, closeSel],
  );

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
    // Saving for offline is a Pro perk; removing an existing save is always
    // allowed so a lapsed user can reclaim space.
    if (!saved && !canOffline) {
      navigate('/pricing');
      return;
    }
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
    void shareCurrent('library', { title: doc?.title });
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
      <Breadcrumbs items={crumbs} />
      <p className={styles.back}>
        <Link to="/library">← {t('library.title')}</Link>
      </p>

      {loading && <p>{t('common.loading')}</p>}
      {error &&
        (online ? (
          <p role="alert">{t('common.loadError')}</p>
        ) : (
          // The doc wasn't in the offline cache and there's no network to fetch it.
          <div className={styles.offlineNotice} role="status">
            <h2>{t('offline.unavailable')}</h2>
            <p>{t('offline.unavailableHint')}</p>
          </div>
        ))}

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

          <ReaderToolbar
            find={find}
            onFindChange={setFind}
            matchCount={matchCount}
            activeMatch={activeMatch}
            onCycle={cycle}
            onSmaller={() => step(-SCALE_STEP)}
            onLarger={() => step(SCALE_STEP)}
            canSmaller={scale > SCALE_MIN}
            canLarger={scale < SCALE_MAX}
            docTitle={doc?.title}
            kind={kind}
            slug={slug}
            docBookmarked={docBookmarked}
            bookmark={bookmark}
            saved={saved}
            canOffline={canOffline}
            onToggleSave={() => void toggleSave()}
            onShare={shareDoc}
            adel={adel}
          />

          <button
            type="button"
            className={styles.tocToggle}
            aria-expanded={tocOpen}
            onClick={() => setTocOpen((o) => !o)}
          >
            {t('document.toc')}
          </button>

          <div className={styles.layout}>
            <ReaderToc
              open={tocOpen}
              onNavigate={() => setTocOpen(false)}
              filter={filter}
              onFilterChange={setFilter}
              entries={filteredToc}
              activeId={activeId}
              kind={kind}
              slug={slug}
              docTitle={doc?.title}
              prefs={prefs}
              bookmark={bookmark}
              copiedId={copiedId}
              onCopyLink={copyLink}
            />

            <div
              ref={contentRef}
              data-testid="reader-body"
              className={styles.content}
              style={{ ['--reader-scale' as string]: String(scale) }}
              // Trusted, machine-extracted GACAR HTML from our own corpus; sanitized above.
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </div>

          {sel && (
            <SelectionPopover
              rect={sel.rect}
              onHighlight={() => saveAnnotation('')}
              onSaveNote={saveAnnotation}
              onClose={closeSel}
            />
          )}

          {notesForDoc && notesForDoc.length > 0 && (
            <ReaderNotes
              notes={notesForDoc}
              onJump={(id) =>
                contentRef.current
                  ?.querySelector(`mark[data-annot="${id}"]`)
                  ?.scrollIntoView({ block: 'center', behavior: 'smooth' })
              }
              onRemove={(id) => removeNote(dk, id)}
            />
          )}

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
