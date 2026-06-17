import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useFetchJson } from '../../lib/useFetchJson';
import { useUrlState } from '../../lib/useUrlState';
import { usePageMeta } from '../../lib/usePageMeta';
import type { PdfsIndex, PdfDoc } from '../../lib/content';
import { Disclaimer } from '../../components/Disclaimer';
import styles from './StudySheets.module.css';

/** Deployed PDF path (the index stores the legacy `assets/…` path). */
function pdfSrc(doc: PdfDoc): string | null {
  if (!doc.file) return null;
  return `/${doc.file.replace(/^assets\//, '')}`;
}

export function StudySheets() {
  const { t } = useTranslation();
  usePageMeta(t('meta.sheets'));
  const index = useFetchJson<PdfsIndex>('/data/pdfs-index.json');
  const [params, setParam] = useUrlState({ doc: '' });

  const files = useMemo(
    () => (index.data?.documents ?? []).filter((d) => d.available && d.file),
    [index.data],
  );
  const active = files.find((d) => d.slug === params.doc) ?? files[0];
  const activeSrc = active ? pdfSrc(active) : null;

  return (
    <section className={`container ${styles.page}`}>
      <p className={styles.back}>
        <Link to="/study">← {t('study.title')}</Link>
      </p>
      <header className={styles.head}>
        <h1>{t('sheets.title')}</h1>
        <p className={styles.lead}>{t('sheets.lead')}</p>
      </header>

      {index.loading && <p>{t('common.loading')}</p>}
      {index.error && <p role="alert">{t('common.loadError')}</p>}

      {files.length > 0 && (
        <div className={styles.layout}>
          <nav className={styles.list} aria-label={t('sheets.title')}>
            {files.map((d) => (
              <button
                key={d.slug}
                type="button"
                className={`${styles.item} ${active?.slug === d.slug ? styles.itemActive : ''}`}
                aria-pressed={active?.slug === d.slug}
                onClick={() => setParam('doc', d.slug)}
              >
                {d.title}
              </button>
            ))}
          </nav>

          <div className={styles.viewer}>
            <div className={styles.toolbar}>
              <span className={styles.activeTitle}>{active?.title}</span>
              {activeSrc && (
                <span className={styles.actions}>
                  <a href={activeSrc} target="_blank" rel="noopener">
                    {t('sheets.open')}
                  </a>
                  <a href={activeSrc} download>
                    {t('sheets.download')}
                  </a>
                </span>
              )}
            </div>
            {activeSrc && (
              <object className={styles.embed} data={activeSrc} type="application/pdf">
                <p className={styles.fallback}>
                  {t('sheets.noInline')}{' '}
                  <a href={activeSrc} target="_blank" rel="noopener">
                    {t('sheets.open')}
                  </a>
                </p>
              </object>
            )}
          </div>
        </div>
      )}

      <Disclaimer />
    </section>
  );
}
