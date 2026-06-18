import { useTranslation } from 'react-i18next';
import { RequireSession } from './RequireSession';
import { TextField } from '../../components/calc/TextField';
import { LangToggle } from '../../components/LangToggle';
import { deleteAllData, saveProfile, useAccount } from '../../lib/account';
import { usePageMeta } from '../../lib/usePageMeta';
import styles from './account.module.css';

export function Settings() {
  return (
    <RequireSession>
      <Inner />
    </RequireSession>
  );
}

function Inner() {
  const { t } = useTranslation();
  usePageMeta(t('meta.settings'));
  const { profile } = useAccount();

  return (
    <section className={`container-narrow ${styles.page}`}>
      <header className={styles.head}>
        <h1>{t('account.settings')}</h1>
      </header>

      <h2>{t('account.profile')}</h2>
      <div className={styles.form}>
        <TextField
          label={t('account.name')}
          value={profile.displayName}
          onChange={(v) => saveProfile({ displayName: v })}
        />
        <TextField
          label={t('account.homeBase')}
          value={profile.homeBase}
          onChange={(v) => saveProfile({ homeBase: v })}
          placeholder="OERK"
        />
        <TextField
          label={t('account.licence')}
          value={profile.licenceType}
          onChange={(v) => saveProfile({ licenceType: v })}
          placeholder="PPL"
        />
        <TextField
          label={t('account.medicalExpiry')}
          value={profile.medicalExpiry}
          onChange={(v) => saveProfile({ medicalExpiry: v })}
          placeholder="2025-06-01"
        />
        <TextField
          label={t('account.lastReview')}
          value={profile.lastFlightReview}
          onChange={(v) => saveProfile({ lastFlightReview: v })}
          placeholder="2024-01-15"
        />
      </div>

      <h2>{t('account.language')}</h2>
      <div>
        <LangToggle className={styles.btn} />
      </div>

      <h2>{t('account.data')}</h2>
      <div className={styles.actions}>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnDanger}`}
          onClick={() => {
            if (window.confirm(t('account.deleteConfirm'))) deleteAllData();
          }}
        >
          {t('account.deleteData')}
        </button>
      </div>
      <p className={styles.note}>{t('account.localNote')}</p>
    </section>
  );
}
