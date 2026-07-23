import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TextField } from '@/components/calc/TextField';
import { PasswordField } from '@/components/calc/PasswordField';
import { Alert } from '@/components/Alert';
import { Disclaimer } from '@/components/Disclaimer';
import { BrandMark } from '@/components/BrandMark';
import { signIn } from '@/lib/services/account';
import {
  isAuthAvailable,
  registerWithEmail,
  sendPasswordReset,
  signInWithEmail,
  signInWithGoogle,
} from '@/lib/services/auth';
import { authErrorInfo, isDomainAuthError } from '@/calc/app/authError';
import { SITE_ORIGIN, isMirrorHost } from '@/lib/seo/seo';
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
  // Set when a sign-in fails because *this* host isn't an authorized Firebase
  // origin (a preview/mirror deploy). The remedy is to sign in on the canonical
  // site, so we surface a real click-through link on the error alert.
  const [mainSiteHref, setMainSiteHref] = useState<string | null>(null);

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
    setMainSiteHref(null);
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

      // A domain-authorization failure on a preview/mirror host is a dead end here
      // ("use the main site" with nowhere to go). Turn it into a click-through to
      // the same page on the canonical origin, which *is* an authorized domain.
      if (
        isDomainAuthError(code) &&
        typeof window !== 'undefined' &&
        isMirrorHost(window.location.hostname)
      ) {
        setMainSiteHref(`${SITE_ORIGIN}${window.location.pathname}`);
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

  // The general-error band, shared by the sign-in and sign-up forms. On a
  // domain-authorization failure it also carries the click-through to the
  // authorized main site.
  const errorAlert = errors.general ? (
    <Alert tone="error" role="alert" icon="⚠">
      {errors.general}
      {mainSiteHref && (
        <>
          {' '}
          <a className={styles.alertLink} href={mainSiteHref}>
            {t('account.errors.useMainSite')}
          </a>
        </>
      )}
    </Alert>
  ) : null;

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
            {errorAlert}
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
            {errorAlert}
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

/** The entire signed-out /account surface: auth panel + benefits aside. */
export function AccountSignedOut() {
  const { t } = useTranslation();
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
