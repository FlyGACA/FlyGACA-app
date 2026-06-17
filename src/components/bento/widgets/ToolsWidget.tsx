import { useTranslation } from 'react-i18next';
import { BentoCard } from '../BentoCard';
import { TOOLS } from '../../../lib/tools';
import { StatValue } from './StatValue';
import shared from './widgets.module.css';

const QUICK = ['crosswind', 'tas', 'density-altitude'];

// The flight-tools registry is the single source of truth the /tools hub also
// counts from — read it directly so the dashboard stat never drifts from the
// real catalog (the public/data/tools.json manifest is only a partial subset).
const LIVE_COUNT = TOOLS.filter((tool) => tool.status === 'live').length;

/** Flight-planning tools — live calculator count + quick chips. */
export function ToolsWidget() {
  const { t } = useTranslation();

  return (
    <BentoCard span="md" tone="default" to="/tools" label={t('home.dashboard.tools.cta')}>
      <p className={shared.eyebrow}>{t('home.dashboard.tools.eyebrow')}</p>
      <p className={shared.heading}>{t('home.dashboard.tools.heading')}</p>
      <div className={shared.statRow}>
        <StatValue value={LIVE_COUNT} className={shared.stat} />
        <span className={shared.unit}>{t('home.dashboard.tools.live')}</span>
      </div>
      <div className={shared.chips}>
        {QUICK.map((id) => (
          <span key={id} className={shared.chip}>
            {t(`tools.items.${id}.name`)}
          </span>
        ))}
      </div>
      <span className={`${shared.foot} cardHoverArrow`}>
        {t('home.dashboard.tools.cta')}
        <span className={shared.arrow} aria-hidden="true">
          →
        </span>
      </span>
    </BentoCard>
  );
}
