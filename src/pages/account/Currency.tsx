import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { RequireSession } from './RequireSession';
import { CurrencyBoard } from '../../components/CurrencyBoard';
import { UpsellCard } from '../../components/UpsellCard';
import { Disclaimer } from '../../components/Disclaimer';
import { useAccount } from '../../lib/account';
import { effectivePlan } from '../../lib/entitlements';
import { usePageMeta } from '../../lib/usePageMeta';
import { computeCurrency } from '../../calc/currency';
import { adelLink } from '../../lib/adel';
import styles from './account.module.css';

export function Currency() {
  return (
    <RequireSession>
      <Inner />
    </RequireSession>
  );
}

function Inner() {
  const { t } = useTranslation();
  usePageMeta(t('meta.currency'));
  const { profile, flights, entitlement } = useAccount();
  const isPro = effectivePlan(entitlement) !== 'free';
  const items = computeCurrency(profile, flights);
  const adelHref = adelLink(t('dashboard.adelRenewalPrompt'));

  return (
    <section className={`container-narrow ${styles.page}`}>
      <header className={styles.head}>
        <h1>{t('currency.title')}</h1>
        <p className={styles.sub}>{t('currency.intro')}</p>
      </header>

      <CurrencyBoard items={items} />

      <div className={styles.linkRow}>
        <Link to="/settings" className={styles.btn}>
          {t('account.settings')}
        </Link>
        <Link to="/logbook" className={styles.btn}>
          {t('account.logbook')}
        </Link>
        {adelHref && (
          <Link to={adelHref} className={styles.btn}>
            {t('currency.askAdel')}
          </Link>
        )}
      </div>

      {!isPro && <UpsellCard variant="inline" />}

      <Disclaimer compact />
    </section>
  );
}
