import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { RequireSession } from './RequireSession';
import { ResultStat } from '../../components/calc/ResultStat';
import { OutputGrid } from '../../components/calc/Grids';
import { FlightForm } from '../../components/account/FlightForm';
import { BLANK_FLIGHT, type FlightDraft } from '../../components/account/flight';
import {
  addFlight,
  updateFlight,
  deleteFlight,
  exportAll,
  sumHours,
  useAccount,
} from '../../lib/account';
import { effectivePlan } from '../../lib/entitlements';
import { summarizeLogbook, flightsToCsv } from '../../calc/logbook';
import { usePageMeta } from '../../lib/usePageMeta';
import styles from './account.module.css';

function download(name: string, data: string, mime: string) {
  const blob = new Blob([data], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

const COLS: (keyof FlightDraft)[] = [
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

export function Logbook() {
  const { t } = useTranslation();
  usePageMeta(t('meta.logbook'));
  return (
    <RequireSession>
      <Inner />
    </RequireSession>
  );
}

function Inner() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { flights, entitlement, syncError } = useAccount();
  const isPro = effectivePlan(entitlement) !== 'free';
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [params, setParams] = useSearchParams();

  // Deep link from the dashboard "Log a flight" quick action opens the add form.
  useEffect(() => {
    if (params.get('add') === '1') {
      setAdding(true);
      setEditingId(null);
      params.delete('add');
      setParams(params, { replace: true });
    }
  }, [params, setParams]);

  const summary = summarizeLogbook(flights);
  const editing = editingId ? flights.find((f) => f.id === editingId) : undefined;

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
          <ResultStat
            label={t('account.totalHours')}
            value={summary.totalHours.toFixed(1)}
            tone="headline"
          />
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
          onClick={() => {
            setEditingId(null);
            setAdding((a) => !a);
          }}
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
        <FlightForm
          initial={BLANK_FLIGHT}
          submitLabel={t('account.save')}
          onSubmit={(draft) => {
            addFlight(draft);
            setAdding(false);
          }}
          onCancel={() => setAdding(false)}
        />
      )}

      {editing && (
        <FlightForm
          key={editing.id}
          initial={editing}
          submitLabel={t('account.update')}
          onSubmit={(draft) => {
            updateFlight(editing.id, draft);
            setEditingId(null);
          }}
          onCancel={() => setEditingId(null)}
        />
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
                {COLS.map((c) => (
                  <th key={c}>{t(`account.${c}`)}</th>
                ))}
                <th />
              </tr>
            </thead>
            <tbody>
              {flights.map((f) => (
                <tr key={f.id}>
                  {COLS.map((c) => (
                    <td key={c}>{f[c] || '—'}</td>
                  ))}
                  <td className={styles.rowActions}>
                    <button
                      type="button"
                      className={styles.rowBtn}
                      onClick={() => {
                        setAdding(false);
                        setEditingId(f.id);
                      }}
                      aria-label={t('account.edit')}
                    >
                      ✎
                    </button>
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
