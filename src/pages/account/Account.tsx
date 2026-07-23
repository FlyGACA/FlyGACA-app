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
import { refreshAccount, signIn, signOut, useAccount } from '@/lib/account';
import { uiPlan } from '@/lib/entitlements';
import {
  isAuthAvailable,
  registerWithEmail,
  resendEmailVerification,
  sendPasswordReset,
  signInWithEmail,
  signInWithGoogle,
} from '@/lib/auth';
import { authErrorInfo } from '@/calc/authError';
import { usePageMeta } from '@/lib/usePageMeta';
import { useForm } from '@/hooks/useForm';
import { PasswordStrength } from '@/components/account/PasswordStrength';
import styles from './account.module.css';

interface FieldErrors {
  name?: string;
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
  const [animating, setAnimating] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const toggleMode = () => {
    setAnimating(true);
    setTimeout(() => {
      setMode((m) => (m === 'in' ? 'up' : 'in'));
      setErrors({});
      setNotice('');
      loginForm.resetForm();
      signupForm.resetForm();
    }, 200);
    setTimeout(() => {
      setAnimating(false);
    }, 400);
  };

  async function run(
    fn: () => Promise<unknown>,
    setFormErrors?: (errs: Partial<Record<string, string>>) => void,
  ) {
    setBusy(true);
    setErrors({});
    setNotice('');
    try {
      await fn();
    } catch (e) {
      const code = (e as { code?: string }).code;
      const { field, key } = authErrorInfo(code);
      const generic = key === 'account.authError';
      if (generic) console.error('Auth failure', code, e);

      let errorMessage = t(key);
      // For deployment/config/unknown failures (never credential ones), append the
      // raw Firebase code so the exact cause is visible and copyable from the page —
      // it maps 1:1 to the triage steps in docs/RUNBOOK-firebase.md and ends the
      // "still broken but which error?" guessing loop.
      if (field === 'general' && code) {
        errorMessage = `${errorMessage} ${t('account.errors.technicalDetail', { code })}`;
      }

      if (setFormErrors && (field === 'email' || field === 'password')) {
        setFormErrors({ [field]: errorMessage });
      } else {
        setErrors({ [field]: errorMessage });
      }
    } finally {
      setBusy(false);
    }
  }

  const loginForm = useForm({
    initialValues: { email: '', password: '' },
    validate: (values) => {
      const errs: FieldErrors = {};
      if (!values.email.trim()) {
        errs.email = t('account.errors.invalidEmail');
      } else if (!looksLikeEmail(values.email.trim())) {
        errs.email = t('account.errors.invalidEmail');
      }
      if (!values.password) {
        errs.password = t('account.passwordRequired');
      }
      return errs;
    },
    onSubmit: async (values) => {
      await run(() => signInWithEmail(values.email.trim(), values.password), loginForm.setErrors);
    },
  });

  const signupForm = useForm({
    initialValues: { name: '', email: '', password: '', confirmPassword: '' },
    validate: (values) => {
      const errs: FieldErrors & { confirmPassword?: string } = {};
      if (!values.name.trim()) {
        errs.name = t('account.nameRequired');
      }
      if (!values.email.trim()) {
        errs.email = t('account.errors.invalidEmail');
      } else if (!looksLikeEmail(values.email.trim())) {
        errs.email = t('account.errors.invalidEmail');
      }
      if (!values.password) {
        errs.password = t('account.passwordRequired');
      } else {
        const hasNumber = /\d/.test(values.password);
        const hasSpecial = /[^A-Za-z0-9]/.test(values.password);
        const hasMixed = /[a-z]/.test(values.password) && /[A-Z]/.test(values.password);
        if (values.password.length < 8 || !hasNumber || !hasSpecial || !hasMixed) {
          errs.password = t('account.errors.passwordTooWeak');
        }
      }
      if (values.password !== values.confirmPassword) {
        errs.confirmPassword = t('account.errors.passwordsDoNotMatch');
      }
      return errs;
    },
    onSubmit: async (values) => {
      await run(
        () =>
          registerWithEmail(values.email.trim(), values.password, values.name.trim() || undefined),
        signupForm.setErrors,
      );
    },
  });

  function forgotPassword() {
    const emailToUse =
      mode === 'in' ? loginForm.values.email.trim() : signupForm.values.email.trim();
    if (!emailToUse) {
      if (mode === 'in') {
        loginForm.setErrors({ email: t('account.resetNeedEmail') });
      } else {
        signupForm.setErrors({ email: t('account.resetNeedEmail') });
      }
      return;
    }
    void run(async () => {
      await sendPasswordReset(emailToUse);
      setNotice(t('account.resetSent'));
    });
  }

  const containerClass = `${styles.fadeTransition} ${animating ? styles.animating : ''}`;

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

      <div className={containerClass}>
        {mode === 'in' ? (
          <form className={styles.authFields} onSubmit={loginForm.handleSubmit} noValidate>
            <TextField
              label={t('account.email')}
              value={loginForm.values.email}
              onChange={(v) => loginForm.setFieldValue('email', v)}
              onBlur={() => loginForm.handleBlur('email')}
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              error={loginForm.touched.email ? loginForm.errors.email : undefined}
            />
            <PasswordField
              label={t('account.password')}
              value={loginForm.values.password}
              onChange={(v) => loginForm.setFieldValue('password', v)}
              onBlur={() => loginForm.handleBlur('password')}
              autoComplete="current-password"
              error={loginForm.touched.password ? loginForm.errors.password : undefined}
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
              disabled={busy || !loginForm.values.email.trim() || !loginForm.values.password}
            >
              {t('account.signIn')}
            </button>
          </form>
        ) : (
          <form className={styles.authFields} onSubmit={signupForm.handleSubmit} noValidate>
            <TextField
              label={t('account.name')}
              value={signupForm.values.name}
              onChange={(v) => signupForm.setFieldValue('name', v)}
              onBlur={() => signupForm.handleBlur('name')}
              error={signupForm.touched.name ? signupForm.errors.name : undefined}
            />
            <TextField
              label={t('account.email')}
              value={signupForm.values.email}
              onChange={(v) => signupForm.setFieldValue('email', v)}
              onBlur={() => signupForm.handleBlur('email')}
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              error={signupForm.touched.email ? signupForm.errors.email : undefined}
            />
            <PasswordField
              label={t('account.password')}
              value={signupForm.values.password}
              onChange={(v) => signupForm.setFieldValue('password', v)}
              onBlur={() => signupForm.handleBlur('password')}
              autoComplete="new-password"
              error={signupForm.touched.password ? signupForm.errors.password : undefined}
            />
            <PasswordStrength password={signupForm.values.password} />
            <PasswordField
              label={t('account.confirmPassword')}
              value={signupForm.values.confirmPassword}
              onChange={(v) => signupForm.setFieldValue('confirmPassword', v)}
              onBlur={() => signupForm.handleBlur('confirmPassword')}
              autoComplete="new-password"
              error={
                signupForm.touched.confirmPassword ? signupForm.errors.confirmPassword : undefined
              }
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
              disabled={
                busy ||
                !signupForm.values.name.trim() ||
                !signupForm.values.email.trim() ||
                !signupForm.values.password ||
                !signupForm.values.confirmPassword
              }
            >
              {t('account.register')}
            </button>
          </form>
        )}
      </div>

      <div className={styles.signInLinks}>
        <button type="button" className={styles.linkBtn} onClick={toggleMode}>
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
            {isAuthAvailable() ? (
              <FirebaseSignIn />
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
