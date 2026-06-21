import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usePageMeta } from '../../lib/usePageMeta';
import { useAccount } from '../../lib/account';
import { effectivePlan } from '../../lib/entitlements';
import { Disclaimer } from '../../components/Disclaimer';
import { PACKS, PACKS_GATED, packItemCount } from './packs';
import styles from './Study.module.css';

export function Packs() {
  const { t } = useTranslation();
  usePageMeta(t('meta.packs'));
  const { entitlement } = useAccount();
  const isPro = effectivePlan(entitlement) !== 'free';

  return (
    <section className={`container ${styles.page}`}>
      <header className={styles.head}>
        <h1>{t('study.packs')}</h1>
        <p className={styles.subtitle}>{t('study.packsDesc')}</p>
      </header>
      <ul className={styles.banks}>
        {PACKS.map((p) => {
          const locked = PACKS_GATED && p.pro && !isPro;
          const inner = (
            <>
              <span className={styles.bankTitle}>
                {t(`study.packCatalog.${p.id}.name`)}
                {p.pro && <span className={styles.proTag}>{t('study.packPro')}</span>}
              </span>
              <span className={styles.bankDesc}>{t(`study.packCatalog.${p.id}.desc`)}</span>
              <span className={styles.bankMeta}>
                {locked ? t('study.packGo') : t('study.packItemCount', { n: packItemCount(p) })}
              </span>
            </>
          );
          return (
            <li key={p.id}>
              {locked ? (
                <Link to="/pricing" className={styles.bank}>
                  {inner}
                </Link>
              ) : (
                <Link to={`/study/packs/${p.id}`} className={styles.bank}>
                  {inner}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
      <Disclaimer compact />
    </section>
  );
}
