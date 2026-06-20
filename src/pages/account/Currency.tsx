import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { RequireSession } from './RequireSession';
import { CurrencyBoard } from '../../components/CurrencyBoard';
import { UpsellCard } from '../../components/UpsellCard';
import { Disclaimer } from '../../components/Disclaimer';
import { useAccount } from '../../lib/account';
import { effectivePlan } from '../../lib/entitlements';
import { usePageMeta } from '../../lib/usePageMeta';
import { computeCurrency, recordCurrency } from '../../calc/currency';
import { buildIcs } from '../../calc/ics';
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
  const navigate = useNavigate();
  usePageMeta(t('meta.currency'));
  const { profile, flights, records, entitlement } = useAccount();
  const isPro = effectivePlan(entitlement) !== 'free';
  const items = [...computeCurrency(profile, flights), ...recordCurrency(records)];
  const adelHref = adelLink(t('dashboard.adelRenewalPrompt'));

  const icsEvents = items
    .filter((i) => i.expiry)
    .map((i) => ({ summary: t(i.labelKey), date: i.expiry as Date }));

  function exportIcs() {
    if (!isPro) {
      navigate('/pricing');
      return;
    }
    const blob = new Blob([buildIcs(icsEvents)], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'flygaca-currency.ics';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className={`container-narrow ${styles.page}`}>
      <header className={styles.head}>
        <h1>{t('currency.title')}</h1>
        <p className={styles.sub}>{t('currency.intro')}</p>
      </header>

      <CurrencyBoard items={items} />

      <div className={styles.linkRow}>
        {icsEvents.length > 0 && (
          <button type="button" className={styles.btn} onClick={exportIcs}>
            {t('currency.addCalendar')}
            {!isPro && <span className={styles.proTag}>{t('upsell.proOnly')}</span>}
          </button>
        )}
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
