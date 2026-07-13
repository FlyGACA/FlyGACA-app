import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { TextField } from '../../components/calc/TextField';
import { PasswordField } from '../../components/calc/PasswordField';
import { Alert } from '../../components/Alert';
import { Disclaimer } from '../../components/Disclaimer';
import { CaptainAvatar } from '../../components/CaptainAvatar';
import { StatusPill } from '../../components/StatusPill';
import { SubscriptionPanel } from '../../components/account/SubscriptionPanel';
import { refreshAccount, signIn, signOut, useAccount } from '../../lib/account';
import { effectivePlan } from '../../lib/entitlements';
import {
  isAuthAvailable,
  registerWithEmail,
  resendEmailVerification,
  sendPasswordReset,
  signInWithEmail,
  signInWithGoogle,
} from '../../lib/auth';
import { authErrorInfo } from '../../calc/authError';
import { usePageMeta } from '../../lib/usePageMeta';
import styles from './account.module.css';

interface FieldErrors {
  email?: string;
  password?: string;
  general?: string;
}

/** Cheap client-side shape check so obvious typos fail before a round-trip. */
function looksLikeEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function FirebaseSignIn() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setErrors({});
    setNotice('');
    try {
      await fn();
      // The account store adopts the session via onAuthChange.
    } catch (e) {
      const { field, key } = authErrorInfo((e as { code?: string }).code);
      setErrors({ [field]: t(key) });
    } finally {
      setBusy(false);
    }
  }

  function forgotPassword() {
    if (!email.trim()) {
      setErrors({ email: t('account.resetNeedEmail') });
      return;
    }
    void run(async () => {
      await sendPasswordReset(email.trim());
      setNotice(t('account.resetSent'));
    });
  }

  return (
    <>
      <button
        type="button"
        className={`${styles.btn} ${styles.btnPrimary}`}
        disabled={busy}
        onClick={() => void run(signInWithGoogle)}
      >
        {t('account.continueGoogle')}
      </button>
      <p className={styles.or}>{t('account.or')}</p>
      <form
        className={styles.authFields}
        onSubmit={(e) => {
          e.preventDefault();
          if (!email.trim() || !password) return;
          if (!looksLikeEmail(email.trim())) {
            setErrors({ email: t('account.errors.invalidEmail') });
            return;
          }
          void run(() =>
            mode === 'in'
              ? signInWithEmail(email.trim(), password)
              : registerWithEmail(email.trim(), password, name.trim() || undefined),
          );
        }}
      >
        {mode === 'up' && <TextField label={t('account.name')} value={name} onChange={setName} />}
        <TextField
          label={t('account.email')}
          value={email}
          onChange={setEmail}
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          error={errors.email}
        />
        <PasswordField
          label={t('account.password')}
          value={password}
          onChange={setPassword}
          autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
          error={errors.password}
        />
        {errors.general && (
          <Alert tone="error" role="alert" icon="⚠">
            {errors.general}
          </Alert>
        )}
        {notice && (
          <Alert tone="success" role="status" icon="✓">
            {notice}
          </Alert>
        )}
        <button
          type="submit"
          className={styles.btn}
          aria-busy={busy || undefined}
          disabled={busy || !email.trim() || !password}
        >
          {mode === 'in' ? t('account.signIn') : t('account.register')}
        </button>
      </form>
      <div className={styles.signInLinks}>
        <button
          type="button"
          className={styles.linkBtn}
          onClick={() => setMode((m) => (m === 'in' ? 'up' : 'in'))}
        >
          {mode === 'in' ? t('account.needAccount') : t('account.haveAccount')}
        </button>
        {mode === 'in' && (
          <button type="button" className={styles.linkBtn} disabled={busy} onClick={forgotPassword}>
            {t('account.forgotPassword')}
          </button>
        )}
      </div>
    </>
  );
}

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

function LocalSignIn() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  return (
    <>
      <form
        className={styles.authFields}
        onSubmit={(e) => {
          e.preventDefault();
          if (email.trim()) signIn(email.trim(), name);
        }}
      >
        <TextField
          label={t('account.email')}
          value={email}
          onChange={setEmail}
          type="email"
          placeholder="you@example.com"
        />
        <TextField label={t('account.name')} value={name} onChange={setName} />
        <button
          type="submit"
          className={`${styles.btn} ${styles.btnPrimary}`}
          disabled={!email.trim()}
        >
          {t('account.signIn')}
        </button>
      </form>
      <p className={styles.note}>{t('account.localNote')}</p>
    </>
  );
}

export function Account() {
  const { t } = useTranslation();
  // Session-gated dashboard — keep it out of the index (no SEO value; a thin,
  // login-walled page to a crawler).
  usePageMeta(t('meta.account'), undefined, undefined, { noindex: true });
  const { session, uid, emailVerified, profile, entitlement, syncError } = useAccount();
  const plan = effectivePlan(entitlement);
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

  if (!session) {
    return (
      <section className={`container ${styles.page}`}>
        <div className={styles.authGrid}>
          <div className={styles.authPanel}>
            <header className={styles.head}>
              <h1>{t('account.signInTitle')}</h1>
              <p className={styles.sub}>{t('account.signInIntro')}</p>
            </header>
            {isAuthAvailable() ? <FirebaseSignIn /> : <LocalSignIn />}
          </div>
          <aside className={styles.authAside}>
            <CaptainAvatar size="lg" pose="wave" decorative />
            <p className={styles.asideEyebrow}>{t('account.benefits.eyebrow')}</p>
            <h2 className={styles.asideTitle}>{t('account.benefits.title')}</h2>
            <ul className={styles.benefitList}>
              <li>
                <strong>{t('account.roles.pilot')}</strong>
                <span>{t('account.benefits.pilot')}</span>
              </li>
              <li>
                <strong>{t('account.roles.student')}</strong>
                <span>{t('account.benefits.student')}</span>
              </li>
              <li>
                <strong>{t('account.roles.instructor')}</strong>
                <span>{t('account.benefits.instructor')}</span>
              </li>
            </ul>
            <p className={styles.note}>{t('account.benefits.local')}</p>
          </aside>
        </div>
        <Disclaimer compact />
      </section>
    );
  }

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
