import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Alert } from '@/components/Alert';
import { Disclaimer } from '@/components/Disclaimer';
import { CaptainAvatar } from '@/components/CaptainAvatar';
import { StatusPill } from '@/components/StatusPill';
import { SubscriptionPanel } from '@/components/account/SubscriptionPanel';
import { refreshAccount, signOut, useAccount } from '@/lib/services/account';
import { uiPlan } from '@/lib/services/entitlements';
import { isAuthAvailable, resendEmailVerification } from '@/lib/services/auth';
import { usePageMeta } from '@/hooks/usePageMeta';
import { AccountSignedOut } from './AccountSignIn';
import styles from './account.module.css';

/** Banner prompting an unverified Firebase user to resend their verification email. */
function VerifyBanner() {
  const { t } = useTranslation();
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function resend() {
    setBusy(true);
    try {
      await resendEmailVerification();
      setSent(true);
    } catch {
      /* ignore — generic to avoid leaking account state */
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.verifyBanner} role="status">
      <StatusPill tone="warning">{t('account.emailNotVerified')}</StatusPill>
      {sent ? (
        <span className={styles.verifySent}>{t('account.verificationSent')}</span>
      ) : (
        <button
          type="button"
          className={styles.linkBtn}
          disabled={busy}
          onClick={() => void resend()}
        >
          {t('account.resendVerification')}
        </button>
      )}
    </div>
  );
}

export function Account() {
  const { t } = useTranslation();
  // Session-gated dashboard — keep it out of the index (no SEO value; a thin,
  // login-walled page to a crawler).
  usePageMeta(t('meta.account'), undefined, undefined, { noindex: true });
  const { session, uid, emailVerified, profile, entitlement, syncError } = useAccount();
  const plan = uiPlan(entitlement);
  const [params, setParams] = useSearchParams();
  const checkout = params.get('checkout');

  // After a Stripe checkout returns, the entitlement is granted asynchronously by
  // the webhook — poll a few times so the new plan appears without a manual reload.
  useEffect(() => {
    if (checkout !== 'success') return;
    void refreshAccount();
    let n = 0;
    const id = window.setInterval(() => {
      void refreshAccount();
      // ~20s of polling — the webhook write can lag the redirect by several seconds.
      if (++n >= 8) window.clearInterval(id);
    }, 2500);
    return () => window.clearInterval(id);
  }, [checkout]);

  if (!session) return <AccountSignedOut />;

  return (
    <section className={`container-narrow ${styles.page}`}>
      <header className={styles.identity}>
        <CaptainAvatar size="md" pose="smile" decorative className={styles.identityAvatar} />
        <div>
          <h1>{t('account.title')}</h1>
          <p className={styles.sub}>
            {t('account.signedInAs', { name: profile.displayName || profile.email })}
            <span className={styles.planBadge} data-plan={plan}>
              {t(`account.plan.${plan}`)}
            </span>
          </p>
        </div>
      </header>

      {checkout === 'success' && (
        <div className={styles.verifyBanner} role="status">
          <StatusPill tone={plan !== 'free' ? 'success' : 'warning'}>
            {plan !== 'free'
              ? t('account.subscription.checkoutSuccess')
              : t('account.subscription.activating')}
          </StatusPill>
          <button type="button" className={styles.linkBtn} onClick={() => setParams({})}>
            {t('common.close')}
          </button>
        </div>
      )}
      {checkout === 'cancel' && (
        <p className={styles.note} role="status">
          {t('account.subscription.checkoutCanceled')}
        </p>
      )}

      {isAuthAvailable() && uid && !emailVerified && <VerifyBanner />}

      <SubscriptionPanel />

      {syncError && (
        <Alert tone="warning" role="status" icon="⚠">
          {t('account.syncError')}
        </Alert>
      )}

      {/* The signed-in home is /dashboard; the daily surfaces (currency, logbook,
          records) live there and in the account nav menu, so this hub stays
          focused on identity, billing and settings. */}
      <div className={styles.linkRow}>
        <Link to="/dashboard" className={`${styles.btn} ${styles.btnPrimary}`}>
          {t('account.dashboard')}
        </Link>
        <Link to="/settings" className={styles.btn}>
          {t('account.settings')}
        </Link>
      </div>
      <div className={styles.actions}>
        <button type="button" className={styles.btn} onClick={() => signOut()}>
          {t('account.signOut')}
        </button>
      </div>
      <p className={styles.note}>{t('account.localNote')}</p>
      <Disclaimer compact />
    </section>
  );
}
