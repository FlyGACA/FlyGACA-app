import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { RequireSession } from './RequireSession';
import { sumHours, useAccount } from '../../lib/account';
import { effectivePlan } from '../../lib/entitlements';
import { usePageMeta } from '../../lib/usePageMeta';
import { addMonths, parseISO } from '../../calc/recency';
import styles from './account.module.css';

const DAY = 86400000;
const fmt = (d: Date) =>
  d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
const daysLeft = (d: Date) => Math.ceil((d.getTime() - Date.now()) / DAY);

export function Dashboard() {
  return (
    <RequireSession>
      <Inner />
    </RequireSession>
  );
}

function Inner() {
  const { t } = useTranslation();
  usePageMeta(t('meta.dashboard'));
  const { profile, flights, entitlement } = useAccount();
  const plan = effectivePlan(entitlement);

  const medical = parseISO(profile.medicalExpiry);
  const lastReview = parseISO(profile.lastFlightReview);
  const reviewDue = lastReview ? addMonths(lastReview, 24) : null;

  const card = (label: string, expiry: Date | null, dueLabel: 'expires' | 'due') => {
    if (!expiry) return { label, value: t('account.notSet'), tone: '' };
    const left = daysLeft(expiry);
    return {
      label,
      value: t(`account.${dueLabel}`, { date: fmt(expiry) }),
      sub: left >= 0 ? t('account.valid') : t('account.expired'),
      tone: left >= 0 ? styles.good : styles.bad,
    };
  };

  const cards = [
    card(t('account.medical'), medical, 'expires'),
    card(t('account.review'), reviewDue, 'due'),
  ];

  return (
    <section className={`container ${styles.page}`}>
      <header className={styles.head}>
        <h1>{t('account.dashboard')}</h1>
        <p className={styles.sub}>
          {t('account.signedInAs', { name: profile.displayName || profile.email })}
          <span className={styles.planBadge} data-plan={plan}>
            {t(`account.plan.${plan}`)}
          </span>
        </p>
      </header>

      <div className={styles.grid}>
        {cards.map((c) => (
          <div key={c.label} className={styles.card}>
            <span className={styles.cardLabel}>{c.label}</span>
            <span className={styles.cardValue}>{c.value}</span>
            {c.sub && <span className={c.tone}>{c.sub}</span>}
          </div>
        ))}
        <div className={styles.card}>
          <span className={styles.cardLabel}>{t('account.totalHours')}</span>
          <span className={styles.cardValue}>{sumHours(flights, 'total').toFixed(1)}</span>
          <span className={styles.note}>{t('account.flightsLogged', { n: flights.length })}</span>
        </div>
      </div>

      <div className={styles.linkRow}>
        <Link to="/logbook" className={styles.btn}>
          {t('account.logbook')}
        </Link>
        <Link to="/tools/medical-validity" className={styles.btn}>
          {t('tools.items.medical-validity.name')}
        </Link>
        <Link to="/tools/part61-currency" className={styles.btn}>
          {t('tools.items.part61-currency.name')}
        </Link>
        <Link to="/settings" className={styles.btn}>
          {t('account.settings')}
        </Link>
      </div>
    </section>
  );
}
