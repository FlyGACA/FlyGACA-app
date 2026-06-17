import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useFetchJson } from '../../lib/useFetchJson';
import { sanitizeHtml, tocFromHtml, useFetchText } from '../../lib/useFetchText';
import type { GacarIndex } from '../../lib/content';
import { Disclaimer } from '../../components/Disclaimer';
import styles from './Document.module.css';

export function Document() {
  const { t } = useTranslation();
  const { hash } = useLocation();
  const { slug } = useParams<{ slug: string }>();
  const index = useFetchJson<GacarIndex>('/data/gacar-index.json');
  const doc = index.data?.documents.find((d) => d.slug === slug);
  const { text, error, loading } = useFetchText(`/data/parts/${slug}.html`);
  const [filter, setFilter] = useState('');

  const html = useMemo(() => (text ? sanitizeHtml(text) : ''), [text]);
  const toc = useMemo(() => (text ? tocFromHtml(text) : []), [text]);
  const filteredToc = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return q ? toc.filter((e) => e.title.toLowerCase().includes(q)) : toc;
  }, [toc, filter]);

  // Scroll to the anchor once the content is in the DOM.
  useEffect(() => {
    if (!html) return;
    const id = hash.replace(/^#/, '');
    if (id) document.getElementById(id)?.scrollIntoView();
  }, [html, hash]);

  return (
    <article className={`container ${styles.page}`}>
      <p className={styles.back}>
        <Link to="/library">← {t('library.title')}</Link>
      </p>

      {loading && <p>{t('common.loading')}</p>}
      {error && <p role="alert">{t('common.loadError')}</p>}

      {html && (
        <>
          <header className={styles.head}>
            <div className={styles.meta}>
              {doc && (
                <span className={styles.badge}>
                  {t('library.part')} {doc.part}
                </span>
              )}
              {doc && (
                <span className={styles.pages}>
                  {doc.pages} {t('library.pages')}
                </span>
              )}
            </div>
            {doc && <h1>{doc.title}</h1>}
            <p className={styles.verify}>{t('document.verifyLine')}</p>
          </header>

          <div className={styles.layout}>
            <nav className={styles.toc} aria-label={t('document.toc')}>
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
                        // Smooth-scroll without a full hash navigation jump.
                        setTimeout(() => document.getElementById(e.id)?.scrollIntoView(), 0);
                      }}
                    >
                      {e.title}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            <div
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
