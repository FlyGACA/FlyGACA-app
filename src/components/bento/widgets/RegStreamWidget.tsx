import { useTranslation } from 'react-i18next';
import { BentoCard } from '../BentoCard';
import { useFetchJson } from '../../../lib/useFetchJson';
import { CORPUS, type GacarIndex } from '../../../lib/content';
import { StatValue } from './StatValue';
import { StatusPill } from '../../StatusPill';
import shared from './widgets.module.css';

/** GACAR regulatory stream — live count of Parts and category streams. */
export function RegStreamWidget() {
  const { t } = useTranslation();
  const { data, loading } = useFetchJson<GacarIndex>(CORPUS.regulations.index);

  return (
    <BentoCard span="md" tone="cyan" to="/library" label={t('home.dashboard.reg.cta')}>
      <StatusPill tone="live" pulse>
        {t('home.dashboard.reg.live')}
      </StatusPill>
      <p className={shared.heading}>{t('home.dashboard.reg.heading')}</p>
      {loading || !data ? (
        <div className={shared.skeleton} />
      ) : (
        <div className={shared.statRow}>
          <StatValue value={data.count} className={`${shared.stat} ${shared.statCyan}`} />
          <span className={shared.unit}>
            {t('home.dashboard.reg.streams', { count: data.categories.length })}
          </span>
        </div>
      )}
      <span className={`${shared.foot} cardHoverArrow`}>
        {t('home.dashboard.reg.cta')}
        <span className={shared.arrow} aria-hidden="true">
          →
        </span>
      </span>
    </BentoCard>
  );
}
