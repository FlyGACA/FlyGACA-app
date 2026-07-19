import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RequireSession } from '../account/RequireSession';
import { Disclaimer } from '../../components/Disclaimer';
import { usePageMeta } from '../../lib/usePageMeta';
import {
  getMyOrgs,
  getCohortReadiness,
  provisionSeats,
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
  const [showInvitePanel, setShowInvitePanel] = useState(false);

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

  const { data, orgs } = state;
  const org = orgs[0];
  const handleInviteClose = async () => {
    setShowInvitePanel(false);
    // Refresh cohort data after provisioning.
    const updated = await getCohortReadiness(org.id);
    if (updated) {
      setState({ kind: 'ready', orgs, data: updated });
    }
  };

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
        <button type="button" className="btn btn-clay" onClick={() => setShowInvitePanel(true)}>
          {t('business.admin.addSeats')}
        </button>
        <button type="button" className="btn btn-clay" onClick={() => exportCsv(data)}>
          {t('business.admin.exportCsv')}
        </button>
      </div>

      {showInvitePanel && (
        <ProvisionPanel
          orgId={data.orgId}
          seatLimit={org.seatLimit}
          seatsUsed={data.counts.total}
          onClose={handleInviteClose}
        />
      )}

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

interface ProvisionPanelProps {
  orgId: string;
  seatLimit: number | null;
  seatsUsed: number;
  onClose: () => void;
}

function ProvisionPanel({ orgId, seatLimit, seatsUsed, onClose }: ProvisionPanelProps) {
  const { t } = useTranslation();
  const [emails, setEmails] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [results, setResults] = useState<Array<{
    email: string;
    success: boolean;
    error?: string;
  }> | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const emailList = emails
      .split('\n')
      .map((e) => e.trim())
      .filter(Boolean);
    const res = await provisionSeats(orgId, emailList, expiresAt || undefined);
    if (res) {
      setResults(res.results);
    } else {
      setResults(emailList.map((e) => ({ email: e, success: false, error: 'network-error' })));
    }
    setIsSubmitting(false);
  };

  const availableSeats = seatLimit !== null ? seatLimit - seatsUsed : null;
  const canAddMore = availableSeats === null || availableSeats > 0;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHead}>
          <h2>{t('business.admin.addSeats')}</h2>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {results ? (
          <div className={styles.modalBody}>
            <h3>{t('business.admin.provisionResults')}</h3>
            <ul className={styles.resultsList}>
              {results.map((r) => (
                <li key={r.email} className={r.success ? styles.resultSuccess : styles.resultError}>
                  <bdi dir="ltr">{r.email}</bdi>
                  {r.success ? '✓' : `✗ ${r.error}`}
                </li>
              ))}
            </ul>
            <button type="button" className="btn btn-primary" onClick={onClose}>
              {t('business.admin.done')}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.modalBody}>
            {seatLimit !== null && (
              <div className={styles.seatInfo}>
                {t('business.admin.seatUsage', {
                  used: seatsUsed,
                  limit: seatLimit,
                  available: availableSeats,
                })}
              </div>
            )}

            {!canAddMore && (
              <div className={styles.warning}>{t('business.admin.seatLimitReached')}</div>
            )}

            <div className={styles.formGroup}>
              <label htmlFor="emails">{t('business.admin.emailsLabel')}</label>
              <textarea
                id="emails"
                value={emails}
                onChange={(e) => setEmails(e.target.value)}
                placeholder={t('business.admin.emailsPlaceholder')}
                disabled={!canAddMore}
                rows={5}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="expiresAt">{t('business.admin.expirationLabel')}</label>
              <input
                type="date"
                id="expiresAt"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                disabled={!canAddMore}
              />
            </div>

            <div className={styles.modalFooter}>
              <button type="button" className="btn btn-clay" onClick={onClose}>
                {t('business.admin.cancel')}
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting || !canAddMore || !emails.trim()}
              >
                {isSubmitting ? t('business.admin.provisioning') : t('business.admin.sendInvites')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
