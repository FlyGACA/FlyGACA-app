import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { TextField } from '../../components/calc/TextField';
import { Disclaimer } from '../../components/Disclaimer';
import { signIn, signOut, useAccount } from '../../lib/account';
import styles from './account.module.css';

export function Account() {
  const { t } = useTranslation();
  const { session, profile } = useAccount();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');

  if (!session) {
    return (
      <section className={`container-narrow ${styles.page}`}>
        <header className={styles.head}>
          <h1>{t('account.signInTitle')}</h1>
          <p className={styles.sub}>{t('account.signInIntro')}</p>
        </header>
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
        <Disclaimer compact />
      </section>
    );
  }

  return (
    <section className={`container-narrow ${styles.page}`}>
      <header className={styles.head}>
        <h1>{t('account.title')}</h1>
        <p className={styles.sub}>
          {t('account.signedInAs', { name: profile.displayName || profile.email })}
        </p>
      </header>
      <div className={styles.linkRow}>
        <Link to="/dashboard" className={styles.btn}>
          {t('account.dashboard')}
        </Link>
        <Link to="/logbook" className={styles.btn}>
          {t('account.logbook')}
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
