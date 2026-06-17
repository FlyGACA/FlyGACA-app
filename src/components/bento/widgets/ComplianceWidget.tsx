import { useTranslation } from 'react-i18next';
import { BentoCard } from '../BentoCard';
import { useFetchJson } from '../../../lib/useFetchJson';
import { CORPUS, type CorpusIndex } from '../../../lib/content';
import { StatValue } from './StatValue';
import shared from './widgets.module.css';

/** Reference library — GACA guidance, FAA/ICAO and safety material, reproduced for study. */
export function ComplianceWidget() {
  const { t } = useTranslation();
  const { data, loading } = useFetchJson<CorpusIndex>(CORPUS.reference.index);

  return (
    <BentoCard span="md" tone="cyan" to="/library" label={t('home.dashboard.compliance.cta')}>
      <p className={shared.eyebrow}>{t('home.dashboard.compliance.eyebrow')}</p>
      <p className={shared.heading}>{t('home.dashboard.compliance.heading')}</p>
      {loading || !data ? (
        <div className={shared.skeleton} />
      ) : (
        <div className={shared.statRow}>
          <StatValue value={data.count} className={`${shared.stat} ${shared.statCyan}`} />
          <span className={shared.unit}>
            {t('home.dashboard.compliance.docs', { count: data.categories.length })}
          </span>
        </div>
      )}
      <span className={`${shared.foot} cardHoverArrow`}>
        {t('home.dashboard.compliance.cta')}
        <span className={shared.arrow} aria-hidden="true">
          →
        </span>
      </span>
    </BentoCard>
  );
}
