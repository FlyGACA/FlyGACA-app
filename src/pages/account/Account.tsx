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
import { useNoindexMeta } from '@/hooks/usePageMeta';
import { AccountSignedOut } from './AccountSignedOut';
import styles from './AccountPage.module.css';

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

/** Icon-bearing navigation tile for the quick-access grid. */
function NavTile({
  to,
  icon,
  label,
  description,
  accent,
}: {
  to: string;
  icon: string;
  label: string;
  description: string;
  accent?: 'teal' | 'sage' | 'gold';
}) {
  return (
    <Link to={to} className={styles.navTile} data-accent={accent ?? 'teal'}>
      <span className={styles.navTileIcon} aria-hidden="true">
        {icon}
      </span>
      <span className={styles.navTileLabel}>{label}</span>
      <span className={styles.navTileDesc}>{description}</span>
      <span className={styles.navTileArrow} aria-hidden="true">→</span>
    </Link>
  );
}

export function Account() {
  const { t } = useTranslation();
  // Session-gated dashboard — keep it out of the index (no SEO value; a thin,
  // login-walled page to a crawler).
  useNoindexMeta(t('meta.account'));
  const { session, uid, emailVerified, profile, entitlement, syncError } = useAccount();
  const plan = uiPlan(entitlement);
  const [params, setParams] = useSearchParams();
  const checkout = params.get('checkout');

  // After a checkout returns, the entitlement is granted asynchronously by the
  // billing functions — poll a few times so the new plan appears without a reload.
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

  const displayName = profile.displayName || profile.email || '';
  const initials = displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((w: string) => w[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <section className={`container-narrow ${styles.accountPage}`}>

      {/* ── Hero identity card ── */}
      <div className={styles.heroCard} data-plan={plan}>
        <div className={styles.heroGlow} aria-hidden="true" />
        <div className={styles.heroInner}>
          <div className={styles.avatarRing} data-plan={plan}>
            <CaptainAvatar size="md" pose="smile" decorative className={styles.avatar} />
            <span className={styles.avatarInitials} aria-hidden="true">{initials}</span>
          </div>
          <div className={styles.heroMeta}>
            <h1 className={styles.heroName}>{displayName}</h1>
            <p className={styles.heroEmail}>{profile.email}</p>
            <div className={styles.heroBadges}>
              <span className={styles.planBadge} data-plan={plan}>
                {t(`account.plan.${plan}`)}
              </span>
              {profile.role && (
                <span className={styles.roleBadge}>
                  {t(`account.roles.${profile.role}`, { defaultValue: profile.role })}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Status banners ── */}
      {checkout === 'success' && (
        <div className={styles.verifyBanner} role="status" data-tone="success">
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
        <div className={styles.verifyBanner} role="status" data-tone="warning">
          <StatusPill tone="warning">{t('account.subscription.checkoutCanceled')}</StatusPill>
          <button type="button" className={styles.linkBtn} onClick={() => setParams({})}>
            {t('common.close')}
          </button>
        </div>
      )}
      {isAuthAvailable() && uid && !emailVerified && <VerifyBanner />}
      {syncError && (
        <Alert tone="warning" role="status" icon="⚠">
          {t('account.syncError')}
        </Alert>
      )}

      {/* ── Quick-nav tile grid ── */}
      <nav className={styles.navGrid} aria-label={t('account.title')}>
        <NavTile
          to="/dashboard"
          icon="🛩"
          label={t('account.dashboard')}
          description={t('dashboard.eyebrow')}
          accent="teal"
        />
        <NavTile
          to="/logbook"
          icon="📋"
          label={t('account.logbook')}
          description={t('account.totalHours')}
          accent="sage"
        />
        <NavTile
          to="/currency"
          icon="✅"
          label={t('account.currency')}
          description={t('account.recencyDesc')}
          accent="gold"
        />
        <NavTile
          to="/records"
          icon="🏅"
          label={t('account.records')}
          description={t('account.manage')}
          accent="sage"
        />
        <NavTile
          to="/settings"
          icon="⚙️"
          label={t('account.settings')}
          description={t('account.profile')}
          accent="teal"
        />
      </nav>

      {/* ── Subscription panel ── */}
      <div className={styles.subsWrap}>
        <SubscriptionPanel />
      </div>

      {/* ── Footer row ── */}
      <footer className={styles.footer}>
        <p className={styles.footerNote}>{t('account.localNote')}</p>
        <button type="button" className={styles.signOutBtn} onClick={() => signOut()}>
          {t('account.signOut')}
        </button>
      </footer>

      <Disclaimer compact />
    </section>
  );
}
