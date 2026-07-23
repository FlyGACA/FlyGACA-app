import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { RequireSession } from './RequireSession';
import { ResultStat } from '@/components/calc/ResultStat';
import { OutputGrid } from '@/components/calc/Grids';
import { FlightForm } from '@/components/account/FlightForm';
import { BLANK_FLIGHT, type FlightDraft } from '@/components/account/flight';
import {
  addFlight,
  updateFlight,
  deleteFlight,
  exportAll,
  sumHours,
  useAccount,
} from '@/lib/account';
import { uiIsPro } from '@/lib/entitlements';
import {
  summarizeLogbook,
  flightsToCsv,
  csvToFlights,
  filterFlights,
  sortFlights,
  aircraftTotals,
  monthTotals,
  type SortDir,
} from '@/calc/logbook';
import type { Flight } from '@/lib/account';
import { usePageMeta } from '@/hooks/usePageMeta';
import { Alert } from '@/components/Alert';
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
  // Session-gated — keep out of the index.
  usePageMeta(t('meta.logbook'), undefined, undefined, { noindex: true });
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
  const isPro = uiIsPro(entitlement);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [params, setParams] = useSearchParams();

  // ── Filter + sort state (pure client-side; nothing persisted) ──
  const [q, setQ] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [sort, setSort] = useState<{ key: keyof Flight; dir: SortDir }>({
    key: 'date',
    dir: 'desc',
  });
  const [importNote, setImportNote] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // Deep link from the dashboard "Log a flight" quick action opens the add form.
  useEffect(() => {
    if (params.get('add') === '1') {
      setAdding(true);
      setEditingId(null);
      params.delete('add');
      setParams(params, { replace: true });
    }
  }, [params, setParams]);

  const types = useMemo(
    () => [...new Set(flights.map((f) => f.type).filter(Boolean))].sort(),
    [flights],
  );
  const view = useMemo(
    () =>
      sortFlights(filterFlights(flights, { q, type: typeFilter, from, to }), sort.key, sort.dir),
    [flights, q, typeFilter, from, to, sort],
  );
  const filtered = view.length !== flights.length;
  const summary = summarizeLogbook(view);
  const editing = editingId ? flights.find((f) => f.id === editingId) : undefined;

  const toggleSort = (key: keyof Flight) =>
    setSort((s) => ({ key, dir: s.key === key && s.dir === 'desc' ? 'asc' : 'desc' }));
  const sortMark = (key: keyof Flight) =>
    sort.key === key ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : '';

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

  async function importCsv(file: File) {
    const text = await file.text();
    const { flights: drafts } = csvToFlights(text);
    drafts.forEach((d) => addFlight(d));
    setImportNote(
      drafts.length ? t('account.imported', { n: drafts.length }) : t('account.importEmpty'),
    );
    window.setTimeout(() => setImportNote(''), 4000);
  }

  const aircraft = useMemo(() => aircraftTotals(flights), [flights]);
  const months = useMemo(() => monthTotals(flights, 6), [flights]);

  return (
    <section className={`container ${styles.page}`}>
      <header className={styles.head}>
        <h1>{t('account.logbook')}</h1>
      </header>

      {syncError && (
        <Alert tone="warning" role="status" icon="⚠">
          {t('account.syncError')}
        </Alert>
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
        <button type="button" className={styles.btn} onClick={() => fileRef.current?.click()}>
          {t('account.importCsv')}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void importCsv(file);
            e.target.value = '';
          }}
        />
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
      {importNote && (
        <p className={styles.note} role="status">
          {importNote}
        </p>
      )}
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
        <>
          <div className={styles.filterBar} role="group" aria-label={t('account.filter')}>
            <input
              className={styles.filterInput}
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t('account.filterSearch')}
              aria-label={t('account.filterSearch')}
            />
            <select
              className={styles.filterSelect}
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              aria-label={t('account.type')}
            >
              <option value="">{t('account.allTypes')}</option>
              {types.map((ty) => (
                <option key={ty} value={ty}>
                  {ty}
                </option>
              ))}
            </select>
            <input
              className={styles.filterDate}
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              aria-label={t('account.dateFrom')}
            />
            <input
              className={styles.filterDate}
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              aria-label={t('account.dateTo')}
            />
            {filtered && (
              <span className={styles.note} role="status">
                {t('account.showingCount', { shown: view.length, total: flights.length })}
              </span>
            )}
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  {COLS.map((c) => (
                    <th key={c}>
                      <button
                        type="button"
                        className={styles.sortBtn}
                        onClick={() => toggleSort(c as keyof Flight)}
                        aria-label={t('account.sortBy', { col: t(`account.${c}`) })}
                      >
                        {t(`account.${c}`)}
                        {sortMark(c as keyof Flight)}
                      </button>
                    </th>
                  ))}
                  <th />
                </tr>
              </thead>
              <tbody>
                {view.map((f) => (
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
                  <td>{sumHours(view, 'total').toFixed(1)}</td>
                  <td>{sumHours(view, 'pic').toFixed(1)}</td>
                  <td>{sumHours(view, 'night').toFixed(1)}</td>
                  <td>{sumHours(view, 'ifr').toFixed(1)}</td>
                  <td>{sumHours(view, 'ldg').toFixed(0)}</td>
                  <td>{sumHours(view, 'nightLdg').toFixed(0)}</td>
                  <td>{sumHours(view, 'appr').toFixed(0)}</td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>

          <details className={styles.breakdown}>
            <summary>{t('account.breakdown')}</summary>
            <div className={styles.breakdownGrids}>
              <div>
                <h2 className={styles.breakdownHead}>{t('account.byAircraft')}</h2>
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>{t('account.reg')}</th>
                        <th>{t('account.type')}</th>
                        <th>{t('account.flightsCol')}</th>
                        <th>{t('account.totalHours')}</th>
                        <th>{t('account.ldg')}</th>
                        <th>{t('account.last')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {aircraft.map((a) => (
                        <tr key={a.reg}>
                          <td>{a.reg}</td>
                          <td>{a.type || '—'}</td>
                          <td>{a.flights}</td>
                          <td>{a.hours.toFixed(1)}</td>
                          <td>{a.landings}</td>
                          <td>{a.last || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div>
                <h2 className={styles.breakdownHead}>{t('account.byMonth')}</h2>
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>{t('account.month')}</th>
                        <th>{t('account.totalHours')}</th>
                        <th>{t('account.ldg')}</th>
                        <th>{t('account.flightsCol')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {months.map((m) => (
                        <tr key={m.key}>
                          <td>{m.label}</td>
                          <td>{m.hours.toFixed(1)}</td>
                          <td>{m.landings}</td>
                          <td>{m.flights}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </details>
        </>
      )}
    </section>
  );
}
