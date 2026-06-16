import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useFetchJson } from '../../lib/useFetchJson';
import type { GacarIndex } from '../../lib/content';
import { Disclaimer } from '../../components/Disclaimer';
import styles from './Library.module.css';

export function Library() {
  const { t } = useTranslation();
  const { data, error, loading } = useFetchJson<GacarIndex>('/data/gacar-index.json');
  const [category, setCategory] = useState<string>('all');
  const [query, setQuery] = useState('');

  const docs = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    return data.documents
      .filter((d) => category === 'all' || d.category === category)
      .filter((d) => !q || d.title.toLowerCase().includes(q) || `part ${d.part}`.includes(q))
      .sort((a, b) => a.partNum - b.partNum);
  }, [data, category, query]);

  const categoryLabel = (id: string) => data?.categories.find((c) => c.id === id)?.label ?? id;

  return (
    <section className={`container ${styles.page}`}>
      <header className={styles.head}>
        <p className={styles.eyebrow}>{t('library.eyebrow')}</p>
        <h1>{t('library.title')}</h1>
        <p className={styles.subtitle}>{t('library.subtitle')}</p>
      </header>

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
            <div className={styles.chips} role="tablist" aria-label={t('library.eyebrow')}>
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
                  <Link to={`/library/${d.slug}`} className={styles.card}>
                    <span className={styles.badge}>
                      {t('library.part')} {d.part}
                    </span>
                    <span className={styles.cat}>{categoryLabel(d.category)}</span>
                    <span className={styles.cardTitle}>{d.title}</span>
                    <span className={styles.pages}>
                      {d.pages} {t('library.pages')}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
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
