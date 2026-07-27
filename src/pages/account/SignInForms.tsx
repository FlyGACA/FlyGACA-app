import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TextField } from '@/components/calc/TextField';
import { PasswordField } from '@/components/calc/PasswordField';
import { Alert } from '@/components/Alert';
import { Button } from '@/components/ui/Button';
import { signIn } from '@/lib/services/account';
import {
  registerWithEmail,
  sendPasswordReset,
  signInWithEmail,
  signInWithGoogle,
} from '@/lib/services/auth';
import { authErrorInfo, isAuthDismiss, isDomainAuthError } from '@/calc/app/authError';
import { SITE_ORIGIN, isMirrorHost } from '@/lib/seo/seo';
import { useForm } from '@/hooks/useForm';
import { PasswordStrength } from '@/components/account/PasswordStrength';
import styles from './AccountPage.module.css';

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

/** The four-colour Google "G", on a white chip so it reads on the teal button. */
function GoogleMark() {
  return (
    <span className={styles.googleChip} aria-hidden="true">
      <svg width="18" height="18" viewBox="0 0 48 48" focusable="false">
        <path
          fill="#4285F4"
          d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
        />
        <path
          fill="#34A853"
          d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"
        />
        <path
          fill="#FBBC05"
          d="M11.69 28.18c-.44-1.32-.69-2.73-.69-4.18s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z"
        />
        <path
          fill="#EA4335"
          d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"
        />
      </svg>
    </span>
  );
}

export function FirebaseSignIn() {
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
      // Closing the Google popup (or opening a second one) isn't a failure — the
      // `finally` clears busy, so bail silently instead of flashing a scary error.
      if (isAuthDismiss(code)) return;
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
      <Button
        type="button"
        variant="clayPrimary"
        icon={<GoogleMark />}
        className={styles.fullWidth}
        disabled={busy}
        onClick={() => void run(signInWithGoogle)}
      >
        {t('account.continueGoogle')}
      </Button>
      <p className={styles.divider}>{t('account.or')}</p>

      <div className={containerClass}>
        {mode === 'in' ? (
          <form className={styles.fields} onSubmit={loginForm.handleSubmit} noValidate>
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
            <Button
              type="submit"
              variant="clay"
              className={styles.fullWidth}
              aria-busy={busy || undefined}
              disabled={busy || !loginForm.values.email.trim() || !loginForm.values.password}
            >
              {t('account.signIn')}
            </Button>
          </form>
        ) : (
          <form className={styles.fields} onSubmit={signupForm.handleSubmit} noValidate>
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
            <Button
              type="submit"
              variant="clay"
              className={styles.fullWidth}
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
            </Button>
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

export function LocalSignIn() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  return (
    <>
      <form
        className={styles.fields}
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
        <Button
          type="submit"
          variant="clayPrimary"
          className={styles.fullWidth}
          disabled={!email.trim()}
        >
          {t('account.signIn')}
        </Button>
      </form>
      <p className={styles.note}>{t('account.localNote')}</p>
    </>
  );
}

/**
 * Shown in a PRODUCTION build when Firebase auth isn't configured. It deliberately
 * offers NO form and mints NO session — a config-less deploy must never present a
 * working "email + name" sign-in that looks like a real account. The email+name
 * `LocalSignIn` is a local-first dev convenience only (see the chooser in
 * AccountSignedOut).
 */
export function AuthUnavailable() {
  const { t } = useTranslation();
  return (
    <Alert tone="warning" role="status">
      <strong>{t('account.unavailableTitle')}</strong> {t('account.unavailableBody')}
    </Alert>
  );
}
