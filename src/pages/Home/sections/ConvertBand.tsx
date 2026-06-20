import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAccount } from '../../../lib/account';
import { effectivePlan } from '../../../lib/entitlements';
import styles from './sections.module.css';

/**
 * Final conversion band. Entitlement-aware (UI-gate only, never grants): free /
 * anonymous visitors get the Pro pitch; existing Pro/School members get a
 * lightweight "open your dashboard" variant instead of an upsell.
 */
export function ConvertBand() {
  const { t } = useTranslation();
  const { entitlement } = useAccount();
  const isPro = effectivePlan(entitlement) !== 'free';

  if (isPro) {
    return (
      <section className={`container ${styles.convert}`}>
        <div>
          <h2 className={styles.convertTitle}>{t('home.convert.proTitle')}</h2>
          <p className={styles.convertLead}>{t('home.convert.proLead')}</p>
        </div>
        <Link className="btn btn-clay-primary" to="/account">
          {t('home.convert.proCta')}
        </Link>
      </section>
    );
  }

  return (
    <section className={`container ${styles.convert} ${styles.convertHot}`}>
      <div>
        <p className={styles.convertEyebrow}>{t('home.convert.eyebrow')}</p>
        <h2 className={styles.convertTitle}>{t('home.convert.title')}</h2>
        <p className={styles.convertLead}>{t('home.convert.lead')}</p>
      </div>
      <div className={styles.convertActions}>
        <Link className="btn btn-clay-primary" to="/pricing">
          {t('home.convert.cta')}
        </Link>
        <Link className="btn btn-ghost" to="/chat">
          {t('home.convert.secondary')}
        </Link>
      </div>
    </section>
  );
}
