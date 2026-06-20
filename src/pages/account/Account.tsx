import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { TextField } from '../../components/calc/TextField';
import { Disclaimer } from '../../components/Disclaimer';
import { CaptainAvatar } from '../../components/CaptainAvatar';
import { signIn, signOut, useAccount } from '../../lib/account';
import { effectivePlan } from '../../lib/entitlements';
import {
  isAuthAvailable,
  registerWithEmail,
  signInWithEmail,
  signInWithGoogle,
} from '../../lib/auth';
import { usePageMeta } from '../../lib/usePageMeta';
import styles from './account.module.css';

function FirebaseSignIn() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError('');
    try {
      await fn();
      // The account store adopts the session via onAuthChange.
    } catch {
      setError(t('account.authError'));
    } finally {
      setBusy(false);
    }
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
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault();
          if (!email.trim() || !password) return;
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
        />
        <TextField
          label={t('account.password')}
          value={password}
          onChange={setPassword}
          type="password"
          autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
        />
        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
        <button type="submit" className={styles.btn} disabled={busy || !email.trim() || !password}>
          {mode === 'in' ? t('account.signIn') : t('account.register')}
        </button>
      </form>
      <button
        type="button"
        className={styles.linkBtn}
        onClick={() => setMode((m) => (m === 'in' ? 'up' : 'in'))}
      >
        {mode === 'in' ? t('account.needAccount') : t('account.haveAccount')}
      </button>
    </>
  );
}

function LocalSignIn() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  return (
    <>
      <form
        className={styles.form}
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
  usePageMeta(t('meta.account'));
  const { session, profile, entitlement, syncError } = useAccount();
  const plan = effectivePlan(entitlement);

  if (!session) {
    return (
      <section className={`container-narrow ${styles.page}`}>
        <header className={styles.head}>
          <h1>{t('account.signInTitle')}</h1>
          <p className={styles.sub}>{t('account.signInIntro')}</p>
        </header>
        {isAuthAvailable() ? <FirebaseSignIn /> : <LocalSignIn />}
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

      {syncError && (
        <p className={styles.syncNotice} role="status">
          {t('account.syncError')}
        </p>
      )}

      <div className={styles.linkRow}>
        <Link to="/dashboard" className={styles.btn}>
          {t('account.dashboard')}
        </Link>
        <Link to="/currency" className={styles.btn}>
          {t('currency.title')}
        </Link>
        <Link to="/logbook" className={styles.btn}>
          {t('account.logbook')}
        </Link>
        <Link to="/records" className={styles.btn}>
          {t('records.title')}
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
