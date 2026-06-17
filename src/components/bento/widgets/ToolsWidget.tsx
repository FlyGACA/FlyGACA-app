import { useTranslation } from 'react-i18next';
import { BentoCard } from '../BentoCard';
import { useFetchJson } from '../../../lib/useFetchJson';
import { type ToolsManifest } from '../../../lib/content';
import shared from './widgets.module.css';

const QUICK = ['crosswind', 'tas', 'density-altitude'];

/** Flight-planning tools — live calculator count + quick chips. */
export function ToolsWidget() {
  const { t } = useTranslation();
  const { data, loading } = useFetchJson<ToolsManifest>('/data/tools.json');
  const liveCount = data?.tools.filter((tool) => tool.live).length ?? 0;

  return (
    <BentoCard span="md" tone="default" to="/tools" label={t('home.dashboard.tools.cta')}>
      <p className={shared.eyebrow}>{t('home.dashboard.tools.eyebrow')}</p>
      <p className={shared.heading}>{t('home.dashboard.tools.heading')}</p>
      {loading || !data ? (
        <div className={shared.skeleton} />
      ) : (
        <>
          <div className={shared.statRow}>
            <span className={shared.stat}>{liveCount}</span>
            <span className={shared.unit}>{t('home.dashboard.tools.live')}</span>
          </div>
          <div className={shared.chips}>
            {QUICK.map((id) => (
              <span key={id} className={shared.chip}>
                {t(`tools.items.${id}.name`)}
              </span>
            ))}
          </div>
        </>
      )}
      <span className={`${shared.foot} cardHoverArrow`}>
        {t('home.dashboard.tools.cta')}
        <span className={shared.arrow} aria-hidden="true">
          →
        </span>
      </span>
    </BentoCard>
  );
}
