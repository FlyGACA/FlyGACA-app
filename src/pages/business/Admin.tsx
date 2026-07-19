import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RequireSession } from '../account/RequireSession';
import { Disclaimer } from '../../components/Disclaimer';
import { usePageMeta } from '../../lib/usePageMeta';
import {
  getMyOrgs,
  getCohortReadiness,
  type OrgSummary,
  type CohortReadiness,
  type CohortRow,
} from '../../lib/org';
import styles from './admin.module.css';

/** Cohort admin dashboard — an org owner sees their seats + study readiness. */
export function BusinessAdmin() {
  const { t } = useTranslation();
  usePageMeta(t('business.admin.title'), undefined, undefined, { noindex: true });
  return (
    <RequireSession>
      <Inner />
    </RequireSession>
  );
}

type State =
  | { kind: 'loading' }
  | { kind: 'no-org' }
  | { kind: 'ready'; orgs: OrgSummary[]; data: CohortReadiness };

function Inner() {
  const { t } = useTranslation();
  const [state, setState] = useState<State>({ kind: 'loading' });

  useEffect(() => {
    let live = true;
    (async () => {
      const orgs = await getMyOrgs();
      if (!live) return;
      if (orgs.length === 0) {
        setState({ kind: 'no-org' });
        return;
      }
      const data = await getCohortReadiness(orgs[0].id);
      if (!live) return;
      if (!data) {
        setState({ kind: 'no-org' });
        return;
      }
      setState({ kind: 'ready', orgs, data });
    })();
    return () => {
      live = false;
    };
  }, []);

  if (state.kind === 'loading') {
    return (
      <section className={`container ${styles.page}`}>
        <p className={styles.muted}>{t('business.admin.loading')}</p>
      </section>
    );
  }

  if (state.kind === 'no-org') {
    return (
      <section className={`container-narrow ${styles.page}`}>
        <h1>{t('business.admin.title')}</h1>
        <p className={styles.muted}>{t('business.admin.noAccess')}</p>
        <Disclaimer />
      </section>
    );
  }

  const { data } = state;
  return (
    <section className={`container ${styles.page}`}>
      <header className={styles.head}>
        <h1>{data.name}</h1>
        <p className={styles.muted}>
          {t('business.admin.subtitle', { threshold: data.threshold })}
        </p>
      </header>

      <div className={styles.stats}>
        <Stat label={t('business.admin.seats')} value={data.counts.total} />
        <Stat label={t('business.admin.active')} value={data.counts.active} />
        <Stat label={t('business.admin.ready')} value={data.counts.ready} />
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t('business.admin.col.email')}</th>
              <th>{t('business.admin.col.seat')}</th>
              <th>{t('business.admin.col.coverage')}</th>
              <th>{t('business.admin.col.exam')}</th>
              <th>{t('business.admin.col.readyCol')}</th>
              <th>{t('business.admin.col.active')}</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r) => (
              <tr key={r.email}>
                <td>
                  <bdi dir="ltr">{r.email}</bdi>
                </td>
                <td>{t(`business.admin.status.${r.status}`)}</td>
                <td>{r.coverage}</td>
                <td>{r.hasProgress ? `${r.examBest}%` : '—'}</td>
                <td>{readyCell(r, t)}</td>
                <td>
                  <bdi dir="ltr">{r.lastActive || '—'}</bdi>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.actions}>
        <button type="button" className="btn btn-clay" onClick={() => exportCsv(data)}>
          {t('business.admin.exportCsv')}
        </button>
      </div>

      <p className={styles.note}>{t('business.admin.note')}</p>
      <Disclaimer />
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className={styles.stat}>
      <span className={styles.statValue}>{value}</span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  );
}

function readyCell(r: CohortRow, t: (k: string) => string): string {
  if (!r.hasProgress) return '—';
  return r.ready ? t('business.admin.yes') : t('business.admin.no');
}

/** Client-side CSV export — same columns as school-cohort-report.mjs. */
function exportCsv(data: CohortReadiness) {
  const header = 'email,seat_status,coverage,exam_best,ready,last_active';
  const lines = data.rows.map((r) =>
    [
      r.email,
      r.status,
      r.coverage,
      r.hasProgress ? r.examBest : '',
      r.hasProgress ? (r.ready ? 'yes' : 'no') : '',
      r.lastActive,
    ].join(','),
  );
  const blob = new Blob([`${[header, ...lines].join('\n')}\n`], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${data.orgId}-cohort.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
