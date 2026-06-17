import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RequireSession } from './RequireSession';
import { TextField } from '../../components/calc/TextField';
import {
  addFlight,
  deleteFlight,
  exportAll,
  sumHours,
  useAccount,
  type Flight,
} from '../../lib/account';
import styles from './account.module.css';

const BLANK: Omit<Flight, 'id'> = {
  date: '',
  type: '',
  reg: '',
  from: '',
  to: '',
  total: '',
  pic: '',
  night: '',
  ifr: '',
  ldg: '',
  remarks: '',
};

export function Logbook() {
  return (
    <RequireSession>
      <Inner />
    </RequireSession>
  );
}

function Inner() {
  const { t } = useTranslation();
  const { flights } = useAccount();
  const [draft, setDraft] = useState(BLANK);
  const [adding, setAdding] = useState(false);
  const set = (k: keyof typeof BLANK, v: string) => setDraft((d) => ({ ...d, [k]: v }));

  function save() {
    if (!draft.date && !draft.type) return;
    addFlight(draft);
    setDraft(BLANK);
    setAdding(false);
  }

  function exportJson() {
    const blob = new Blob([exportAll()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'flygaca-logbook.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  const cols: (keyof typeof BLANK)[] = [
    'date',
    'type',
    'reg',
    'from',
    'to',
    'total',
    'pic',
    'night',
    'ifr',
    'ldg',
  ];

  return (
    <section className={`container ${styles.page}`}>
      <header className={styles.head}>
        <h1>{t('account.logbook')}</h1>
      </header>

      <div className={styles.actions}>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnPrimary}`}
          onClick={() => setAdding((a) => !a)}
        >
          {t('account.addFlight')}
        </button>
        {flights.length > 0 && (
          <button type="button" className={styles.btn} onClick={exportJson}>
            {t('account.exportData')}
          </button>
        )}
      </div>

      {adding && (
        <>
          <div className={styles.form}>
            <TextField
              label={t('account.date')}
              value={draft.date}
              onChange={(v) => set('date', v)}
              placeholder="2024-06-01"
            />
            <TextField
              label={t('account.type')}
              value={draft.type}
              onChange={(v) => set('type', v)}
              placeholder="C172"
            />
            <TextField
              label={t('account.reg')}
              value={draft.reg}
              onChange={(v) => set('reg', v)}
              placeholder="HZ-ABC"
            />
            <TextField
              label={t('account.from')}
              value={draft.from}
              onChange={(v) => set('from', v)}
              placeholder="OERK"
            />
            <TextField
              label={t('account.to')}
              value={draft.to}
              onChange={(v) => set('to', v)}
              placeholder="OEJN"
            />
            <TextField
              label={t('account.total')}
              value={draft.total}
              onChange={(v) => set('total', v)}
              placeholder="1.5"
            />
            <TextField
              label={t('account.pic')}
              value={draft.pic}
              onChange={(v) => set('pic', v)}
              placeholder="1.5"
            />
            <TextField
              label={t('account.night')}
              value={draft.night}
              onChange={(v) => set('night', v)}
            />
            <TextField label={t('account.ifr')} value={draft.ifr} onChange={(v) => set('ifr', v)} />
            <TextField
              label={t('account.ldg')}
              value={draft.ldg}
              onChange={(v) => set('ldg', v)}
              placeholder="1"
            />
            <TextField
              label={t('account.remarks')}
              value={draft.remarks}
              onChange={(v) => set('remarks', v)}
            />
          </div>
          <div className={styles.actions}>
            <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={save}>
              {t('account.save')}
            </button>
            <button
              type="button"
              className={styles.btn}
              onClick={() => {
                setDraft(BLANK);
                setAdding(false);
              }}
            >
              {t('account.cancel')}
            </button>
          </div>
        </>
      )}

      {flights.length === 0 ? (
        <p className={styles.sub}>{t('account.emptyLog')}</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                {cols.map((c) => (
                  <th key={c}>{t(`account.${c}`)}</th>
                ))}
                <th />
              </tr>
            </thead>
            <tbody>
              {flights.map((f) => (
                <tr key={f.id}>
                  {cols.map((c) => (
                    <td key={c}>{f[c] || '—'}</td>
                  ))}
                  <td>
                    <button
                      type="button"
                      className={styles.del}
                      onClick={() => deleteFlight(f.id)}
                      aria-label={t('account.delete')}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
              <tr className={styles.totals}>
                <td colSpan={5}>{t('account.totals')}</td>
                <td>{sumHours(flights, 'total').toFixed(1)}</td>
                <td>{sumHours(flights, 'pic').toFixed(1)}</td>
                <td>{sumHours(flights, 'night').toFixed(1)}</td>
                <td>{sumHours(flights, 'ifr').toFixed(1)}</td>
                <td>{sumHours(flights, 'ldg').toFixed(0)}</td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
