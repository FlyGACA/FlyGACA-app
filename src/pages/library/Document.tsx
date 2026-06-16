import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useFetchJson } from '../../lib/useFetchJson';
import type { GacarIndex } from '../../lib/content';
import { Disclaimer } from '../../components/Disclaimer';
import styles from './Document.module.css';

export function Document() {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const { data, error, loading } = useFetchJson<GacarIndex>('/data/gacar-index.json');

  const doc = data?.documents.find((d) => d.slug === slug);
  const categoryLabel = data?.categories.find((c) => c.id === doc?.category)?.label;

  return (
    <article className={`container-narrow ${styles.page}`}>
      <p className={styles.back}>
        <Link to="/library">← {t('library.title')}</Link>
      </p>

      {loading && <p>{t('common.loading')}</p>}
      {error && <p role="alert">{t('common.loadError')}</p>}
      {data && !doc && <p role="alert">{t('common.loadError')}</p>}

      {doc && (
        <>
          <header className={styles.head}>
            <div className={styles.meta}>
              <span className={styles.badge}>
                {t('library.part')} {doc.part}
              </span>
              {categoryLabel && <span className={styles.cat}>{categoryLabel}</span>}
              <span className={styles.pages}>
                {doc.pages} {t('library.pages')}
              </span>
            </div>
            <h1>{doc.title}</h1>
          </header>

          {doc.outline && doc.outline.length > 0 && (
            <section className={styles.outline}>
              <h2>{t('document.outline')}</h2>
              <ul>
                {doc.outline.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </section>
          )}

          <p className={styles.verify}>
            {t('document.readerPending')}{' '}
            <a href={data?.sourceUrl} target="_blank" rel="noopener">
              {t('document.verifyAtGaca')} ↗
            </a>
          </p>

          <Disclaimer />
        </>
      )}
    </article>
  );
}
