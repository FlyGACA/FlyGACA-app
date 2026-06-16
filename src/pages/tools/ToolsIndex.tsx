import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useFetchJson } from '../../lib/useFetchJson';
import type { ToolsManifest } from '../../lib/content';
import { Disclaimer } from '../../components/Disclaimer';
import styles from './ToolsIndex.module.css';

export function ToolsIndex() {
  const { t } = useTranslation();
  const { data, error, loading } = useFetchJson<ToolsManifest>('/data/tools.json');

  return (
    <section className={`container ${styles.page}`}>
      <header className={styles.head}>
        <h1>{t('tools.title')}</h1>
        <p className={styles.subtitle}>{t('tools.subtitle')}</p>
      </header>

      {loading && <p>{t('common.loading')}</p>}
      {error && <p role="alert">{t('common.loadError')}</p>}

      {data && (
        <ul className={styles.grid}>
          {data.tools.map((tool) => {
            const name = t(`tools.items.${tool.id}.name`);
            const blurb = t(`tools.items.${tool.id}.blurb`);
            const card = (
              <>
                <h2 className={styles.cardTitle}>{name}</h2>
                <p className={styles.blurb}>{blurb}</p>
                <span className={styles.cta}>{tool.live ? t('tools.open') : t('common.soon')}</span>
              </>
            );
            return (
              <li key={tool.id} className={`${styles.card} ${tool.live ? '' : styles.pending}`}>
                {tool.live ? (
                  <Link to={tool.route} className={styles.cardLink}>
                    {card}
                  </Link>
                ) : (
                  <div className={styles.cardLink} aria-disabled="true">
                    {card}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className={styles.footnote}>
        <Disclaimer compact />
      </div>
    </section>
  );
}
