import { useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAccount } from '@/lib/services/account';
import { uiPlan } from '@/lib/services/entitlements';
import { startBillingPortal } from '@/lib/services/billing';
import { isAuthAvailable } from '@/lib/services/auth';
import { StatusPill } from '@/components/StatusPill';
import { Alert } from '@/components/Alert';
import styles from './SubscriptionPanel.module.css';

function fmtDate(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? null
    : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Subscription status + management. Shows the active plan and renewal date for
 * paid users with a Stripe-portal "Manage" button; free users get an upgrade
 * prompt. Entitlement is read-only here — the server grants it via the webhook.
 */
export function SubscriptionPanel() {
  const { t } = useTranslation();
  const { entitlement } = useAccount();
  const plan = uiPlan(entitlement);
  const isPaid = plan !== 'free';
  // Stripe self-service only applies to a genuine Stripe subscription. Gate the
  // "Manage" button + renewal/source rows on the real record (not the presentational
  // `plan`) so complimentary/promo and staff/school grants don't render a portal
  // button that has no Stripe customer behind it.
  const hasStripeSub = entitlement?.source === 'stripe';
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function manage() {
    setBusy(true);
    setError('');
    try {
      await startBillingPortal();
    } catch (e) {
      const code = (e as Error).message;
      setError(t(`account.subscription.errors.${code}`, t('account.subscription.errors.generic')));
      setBusy(false);
    }
  }

  const renews = fmtDate(entitlement?.expiresAt);

  return (
    <section className={styles.panel}>
      <div className={styles.head}>
        <h2 className={styles.title}>{t('account.subscription.title')}</h2>
        <StatusPill tone={isPaid ? 'success' : 'data'}>{t(`account.plan.${plan}`)}</StatusPill>
      </div>

      {isPaid ? (
        <>
          <dl className={styles.meta}>
            {renews && (
              <div className={styles.row}>
                <dt>{t('account.subscription.renews')}</dt>
                <dd>
                  <bdi dir="ltr">{renews}</bdi>
                </dd>
              </div>
            )}
            {entitlement?.source && (
              <div className={styles.row}>
                <dt>{t('account.subscription.source')}</dt>
                <dd>{entitlement.source}</dd>
              </div>
            )}
          </dl>
          {/* The Stripe portal is web-only; native manages via the App Store. Only a
              real Stripe subscription has a portal to manage. */}
          {isAuthAvailable() && hasStripeSub && (
            <button
              type="button"
              className={styles.manage}
              disabled={busy}
              onClick={() => void manage()}
            >
              {t('account.subscription.manage')}
            </button>
          )}
        </>
      ) : (
        <>
          <p className={styles.free}>{t('account.subscription.none')}</p>
          <Link to="/pricing" className={styles.upgrade}>
            {t('common.goPro')}
          </Link>
        </>
      )}

      {error && (
        <Alert tone="error" role="alert" icon="⚠">
          {error}
        </Alert>
      )}
    </section>
  );
}
