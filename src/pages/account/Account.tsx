import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { TextField } from '@/components/calc/TextField';
import { PasswordField } from '@/components/calc/PasswordField';
import { Alert } from '@/components/Alert';
import { Disclaimer } from '@/components/Disclaimer';
import { BrandMark } from '@/components/BrandMark';
import { CaptainAvatar } from '@/components/CaptainAvatar';
import { StatusPill } from '@/components/StatusPill';
import { SubscriptionPanel } from '@/components/account/SubscriptionPanel';
import { refreshAccount, signIn, signOut, useAccount } from '@/lib/services/account';
import { uiPlan } from '@/lib/services/entitlements';
import {
  isAuthAvailable,
  registerWithEmail,
  resendEmailVerification,
  sendPasswordReset,
  signInWithEmail,
  signInWithGoogle,
} from '@/lib/services/auth';
import { authErrorInfo, isAuthDismiss } from '@/calc/app/authError';
import { MIN_PASSWORD_LENGTH, passwordStrength } from '@/calc/app/passwordStrength';
import { usePageMeta } from '@/hooks/usePageMeta';
import styles from './account.module.css';

/** Sign-in vs create-account. Lifted to `Account` so the panel heading tracks it. */
type AuthMode = 'in' | 'up';

interface FieldErrors {
  email?: string;
  password?: string;
  confirm?: string;
  general?: string;
}

/** Cheap client-side shape check so obvious typos fail before a round-trip. */
function looksLikeEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

/** Google's four-colour "G", inline so the button carries the brand affordance with no network fetch. */
function GoogleIcon() {
  return (
    <svg className={styles.googleIcon} viewBox="0 0 18 18" aria-hidden="true" focusable="false">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.47.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}

/**
 * The sign-up Terms/Privacy acknowledgement. Renders the translated sentence with
 * `{terms}`/`{privacy}` placeholders swapped for real links — the ordering (and RTL
 * mirroring) stays in the translator's hands, and we avoid pulling react-i18next's
 * heavier `<Trans>` into the initial vendor chunk.
 */
function LegalLine() {
  const { t } = useTranslation();
  const parts = t('account.createLegal').split(/(\{terms\}|\{privacy\})/);
  return (
    <p className={styles.legalNote}>
      {parts.map((part, i) => {
        if (part === '{terms}')
          return (
            <Link key={i} to="/terms" className={styles.inlineLink}>
              {t('account.termsLink')}
            </Link>
          );
        if (part === '{privacy}')
          return (
            <Link key={i} to="/privacy" className={styles.inlineLink}>
              {t('account.privacyLink')}
            </Link>
          );
        return part;
      })}
    </p>
  );
}

/** Segmented strength meter (4 bars) for the sign-up password. Hidden until the user types. */
function PasswordMeter({ value }: { value: string }) {
  const { t } = useTranslation();
  const { score, label } = passwordStrength(value);
  if (!value) return null;
  return (
    <div className={styles.pwMeter}>
      <div className={styles.pwBars} aria-hidden="true">
        {[1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={styles.pwBar}
            data-on={i <= score || undefined}
            data-level={label}
          />
        ))}
      </div>
      <span className={styles.pwLabel} data-level={label} role="status">
        {t('account.pwStrength', { label: t(`account.pw.${label}`) })}
      </span>
    </div>
  );
}

function FirebaseAuth({
  mode,
  onModeChange,
}: {
  mode: AuthMode;
  onModeChange: (m: AuthMode) => void;
}) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [name, setName] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  function reset() {
    setErrors({});
    setNotice('');
  }

  function switchMode(next: AuthMode) {
    if (next === mode) return;
    reset();
    onModeChange(next);
  }

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    reset();
    try {
      await fn();
      // The account store adopts the session via onAuthChange.
    } catch (e) {
      const code = (e as { code?: string }).code;
      // A user who just closed the Google popup didn't fail — say nothing.
      if (isAuthDismiss(code)) return;
      const { field, key } = authErrorInfo(code);
      // When we fell back to the generic message the real code is unknown to us —
      // append it (Firebase codes are non-secret) and log the full error so a
      // deployment/config failure on a preview domain is diagnosable instead of
      // masquerading as a bad-credentials message.
      const generic = key === 'account.authError';
      if (generic) console.error('Auth failure', code, e);
      setErrors({ [field]: generic && code ? `${t(key)} (${code})` : t(key) });
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

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const mail = email.trim();
    if (!mail || !password) return;
    reset();
    if (!looksLikeEmail(mail)) {
      setErrors({ email: t('account.errors.invalidEmail') });
      return;
    }
    if (mode === 'up') {
      if (password.length < MIN_PASSWORD_LENGTH) {
        setErrors({ password: t('account.errors.weakPassword') });
        return;
      }
      if (confirm !== password) {
        setErrors({ confirm: t('account.errors.passwordMismatch') });
        return;
      }
    }
    void run(() =>
      mode === 'in'
        ? signInWithEmail(mail, password)
        : registerWithEmail(mail, password, name.trim() || undefined),
    );
  }

  return (
    <>
      <div className={styles.authTabs} role="tablist" aria-label={t('account.tabsLabel')}>
        <button
          type="button"
          role="tab"
          id="auth-tab-in"
          aria-selected={mode === 'in'}
          className={styles.authTab}
          onClick={() => switchMode('in')}
        >
          {t('account.signIn')}
        </button>
        <button
          type="button"
          role="tab"
          id="auth-tab-up"
          aria-selected={mode === 'up'}
          className={styles.authTab}
          onClick={() => switchMode('up')}
        >
          {t('account.register')}
        </button>
      </div>

      <button
        type="button"
        className={styles.googleBtn}
        disabled={busy}
        onClick={() => void run(signInWithGoogle)}
      >
        <GoogleIcon />
        {t('account.continueGoogle')}
      </button>
      <p className={styles.or}>
        <span>{t('account.or')}</span>
      </p>

      <form className={styles.authFields} onSubmit={submit}>
        {mode === 'up' && (
          <TextField
            label={t('account.name')}
            value={name}
            onChange={setName}
            autoComplete="name"
          />
        )}
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
        {mode === 'up' && (
          <>
            <PasswordMeter value={password} />
            <PasswordField
              label={t('account.confirmPassword')}
              value={confirm}
              onChange={setConfirm}
              autoComplete="new-password"
              error={errors.confirm}
            />
          </>
        )}
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
          className={`${styles.btn} ${styles.btnPrimary}`}
          aria-busy={busy || undefined}
          disabled={busy || !email.trim() || !password}
        >
          {mode === 'in' ? t('account.signIn') : t('account.register')}
        </button>
      </form>

      {mode === 'in' && (
        <div className={styles.signInLinks}>
          <button type="button" className={styles.linkBtn} disabled={busy} onClick={forgotPassword}>
            {t('account.forgotPassword')}
          </button>
        </div>
      )}
      {mode === 'up' && <LegalLine />}
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
  const [error, setError] = useState('');
  return (
    <>
      <form
        className={styles.authFields}
        onSubmit={(e) => {
          e.preventDefault();
          const trimmed = email.trim();
          if (!trimmed) return;
          if (!looksLikeEmail(trimmed)) {
            setError(t('account.errors.invalidEmail'));
            return;
          }
          setError('');
          signIn(trimmed, name);
        }}
      >
        <TextField
          label={t('account.email')}
          value={email}
          onChange={(v) => {
            setEmail(v);
            if (error) setError('');
          }}
          type="email"
          placeholder="you@example.com"
          error={error}
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

/**
 * Shown in a PRODUCTION build when Firebase auth isn't configured. It deliberately
 * offers NO form and mints NO session — a config-less deploy must never present a
 * working "email + name" sign-in that looks like a real account. The email+name
 * `LocalSignIn` is a local-first dev convenience only (see the chooser below).
 */
function AuthUnavailable() {
  const { t } = useTranslation();
  return (
    <Alert tone="warning" role="status">
      <strong>{t('account.unavailableTitle')}</strong> {t('account.unavailableBody')}
    </Alert>
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
  // Sign-in vs create-account, held here so the panel heading/intro track the tab.
  const [authMode, setAuthMode] = useState<AuthMode>('in');
  const firebaseAuth = isAuthAvailable();
  const creating = firebaseAuth && authMode === 'up';

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
              <h1>{t(creating ? 'account.createTitle' : 'account.signInTitle')}</h1>
              <p className={styles.sub}>
                {t(creating ? 'account.createIntro' : 'account.signInIntro')}
              </p>
            </header>
            {firebaseAuth ? (
              <FirebaseAuth mode={authMode} onModeChange={setAuthMode} />
            ) : import.meta.env.DEV ? (
              <LocalSignIn />
            ) : (
              <AuthUnavailable />
            )}
          </div>
          <aside className={styles.authAside}>
            <BrandMark />
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
