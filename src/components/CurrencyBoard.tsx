import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { StatusPill, type StatusTone } from './StatusPill';
import type { CurrencyItem, CurrencyStatus } from '../calc/currency';
import styles from './CurrencyBoard.module.css';

const tone: Record<CurrencyStatus, StatusTone> = {
  current: 'success',
  expiring: 'warning',
  expired: 'danger',
  unknown: 'data',
};

const statusLabel: Record<CurrencyStatus, string> = {
  current: 'validity.current',
  expiring: 'validity.expiring',
  expired: 'validity.expired',
  unknown: 'validity.unknown',
};

const fmtDate = (d: Date) =>
  d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });

interface Props {
  items: CurrencyItem[];
  /** Show the per-row "how to renew" link (default true). */
  showFix?: boolean;
}

/**
 * The currency sheet: one row per recency requirement with a colour-coded pill,
 * days remaining, renewal date and a link to the tool that explains the renewal.
 * Shared by the dashboard board and the dedicated /currency page.
 */
export function CurrencyBoard({ items, showFix = true }: Props) {
  const { t } = useTranslation();
  return (
    <ul className={styles.board}>
      {items.map((item) => (
        <li key={item.id} className={styles.row} data-status={item.status}>
          <div className={styles.main}>
            <span className={styles.label}>{t(item.labelKey)}</span>
            <span className={styles.detail}>{t(item.detailKey, item.detailVars)}</span>
          </div>
          <div className={styles.meta}>
            <StatusPill tone={tone[item.status]}>{t(statusLabel[item.status])}</StatusPill>
            {item.daysLeft != null && (
              <span className={styles.days}>
                <bdi dir="ltr">
                  {item.daysLeft >= 0
                    ? t('currency.daysLeft', { n: item.daysLeft })
                    : t('currency.daysOver', { n: Math.abs(item.daysLeft) })}
                </bdi>
              </span>
            )}
            {item.expiry && (
              <span className={styles.date}>
                <bdi dir="ltr">{fmtDate(item.expiry)}</bdi>
              </span>
            )}
          </div>
          {showFix && (
            <Link to={item.fixTo} className={styles.fix}>
              {t('currency.fixNow')}
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}
