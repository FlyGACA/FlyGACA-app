import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { RequireSession } from './RequireSession';
import { TextField } from '../../components/calc/TextField';
import { ResultStat } from '../../components/calc/ResultStat';
import { OutputGrid } from '../../components/calc/Grids';
import {
  addFlight,
  deleteFlight,
  exportAll,
  sumHours,
  useAccount,
  type Flight,
} from '../../lib/account';
import { effectivePlan } from '../../lib/entitlements';
import { summarizeLogbook, flightsToCsv } from '../../calc/logbook';
import { usePageMeta } from '../../lib/usePageMeta';
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
  nightLdg: '',
  appr: '',
  remarks: '',
};

function download(name: string, data: string, mime: string) {
  const blob = new Blob([data], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function Logbook() {
  return (
    <RequireSession>
      <Inner />
    </RequireSession>
  );
}

function Inner() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  usePageMeta(t('meta.logbook'));
  const { flights, entitlement, syncError } = useAccount();
  const isPro = effectivePlan(entitlement) !== 'free';
  const [draft, setDraft] = useState(BLANK);
  const [adding, setAdding] = useState(false);
  const set = (k: keyof typeof BLANK, v: string) => setDraft((d) => ({ ...d, [k]: v }));

  const summary = summarizeLogbook(flights);

  function save() {
    if (!draft.date && !draft.type) return;
    addFlight(draft);
    setDraft(BLANK);
    setAdding(false);
  }

  function exportJson() {
    download('flygaca-logbook.json', exportAll(), 'application/json');
  }

  function exportCsv() {
    // CSV/PDF export is a Pro feature — send free users to the plans page.
    if (!isPro) {
      navigate('/pricing');
      return;
    }
    download('flygaca-logbook.csv', flightsToCsv(flights), 'text/csv');
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
    'nightLdg',
    'appr',
  ];

  return (
    <section className={`container ${styles.page}`}>
      <header className={styles.head}>
        <h1>{t('account.logbook')}</h1>
      </header>

      {syncError && (
        <p className={styles.syncNotice} role="status">
          {t('account.syncError')}
        </p>
      )}

      {flights.length > 0 && (
        <OutputGrid>
          <ResultStat label={t('account.totalHours')} value={summary.totalHours.toFixed(1)} tone="headline" />
          <ResultStat label={t('account.pic')} value={summary.picHours.toFixed(1)} />
          <ResultStat label={t('account.night')} value={summary.nightHours.toFixed(1)} />
          <ResultStat label={t('account.ifr')} value={summary.ifrHours.toFixed(1)} />
          <ResultStat label={t('account.ldg')} value={summary.landings.toFixed(0)} />
          <ResultStat
            label={t('account.last90')}
            value={summary.last90.hours.toFixed(1)}
            sub={t('account.flightsLogged', { n: summary.last90.flightCount })}
          />
        </OutputGrid>
      )}

      <div className={styles.actions}>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnPrimary}`}
          onClick={() => setAdding((a) => !a)}
        >
          {t('account.addFlight')}
        </button>
        {flights.length > 0 && (
          <>
            <button type="button" className={styles.btn} onClick={exportJson}>
              {t('account.exportData')}
            </button>
            <button type="button" className={styles.btn} onClick={exportCsv}>
              {t('account.exportCsv')}
              {!isPro && <span className={styles.proTag}>{t('upsell.proOnly')}</span>}
            </button>
          </>
        )}
      </div>
      {flights.length > 0 && !isPro && <p className={styles.note}>{t('account.csvProNote')}</p>}

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
              label={t('account.nightLdg')}
              value={draft.nightLdg ?? ''}
              onChange={(v) => set('nightLdg', v)}
              placeholder="0"
            />
            <TextField
              label={t('account.appr')}
              value={draft.appr ?? ''}
              onChange={(v) => set('appr', v)}
              placeholder="0"
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
        <p className={styles.sub}>
          {t('account.emptyLog')}{' '}
          <Link to="/currency" className={styles.inlineLink}>
            {t('currency.title')}
          </Link>
        </p>
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
                <td>{sumHours(flights, 'nightLdg').toFixed(0)}</td>
                <td>{sumHours(flights, 'appr').toFixed(0)}</td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
