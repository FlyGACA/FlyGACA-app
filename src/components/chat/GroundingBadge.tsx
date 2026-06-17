import { useTranslation } from 'react-i18next';
import type { GroundingKind } from '../../lib/api';
import styles from './GroundingBadge.module.css';

const LABEL_KEY: Record<'grounded' | 'partial' | 'refusal', string> = {
  grounded: 'chat.grounding.grounded',
  partial: 'chat.grounding.partial',
  refusal: 'chat.grounding.refusal',
};

/**
 * Renders the brain's grounding verdict (grounded / partially grounded / hold).
 * `na` or an unknown kind renders nothing — same rule as the legacy client.
 * For a refusal, the cited rule is shown LTR via <bdi> even under RTL.
 */
export function GroundingBadge({
  kind,
  refusalClass,
}: {
  kind?: GroundingKind;
  refusalClass?: string;
}) {
  const { t } = useTranslation();
  if (!kind || kind === 'na') return null;
  const key = LABEL_KEY[kind];
  if (!key) return null;

  return (
    <div className={styles.badge} data-state={kind} role="status">
      <span className={styles.dot} aria-hidden="true" />
      <span className={styles.label}>{t(key)}</span>
      {kind === 'refusal' && refusalClass && (
        <span className={styles.cls}>
          <bdi dir="ltr" lang="en">
            §{refusalClass}
          </bdi>
        </span>
      )}
    </div>
  );
}
