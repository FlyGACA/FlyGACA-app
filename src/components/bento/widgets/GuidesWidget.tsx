import { useTranslation } from 'react-i18next';
import { BentoCard } from '../BentoCard';
import { GUIDE_SLUGS } from '../../../pages/guides/guides';
import shared from './widgets.module.css';

const FEATURED = ['saudi-ppl-requirements', 'airspace-explained', 'reading-metar-taf'];

/** Learning guides — total count + a few featured explainers. */
export function GuidesWidget() {
  const { t } = useTranslation();

  return (
    <BentoCard span="md" tone="cyan" to="/guides" label={t('home.dashboard.guides.cta')}>
      <p className={shared.eyebrow}>{t('home.dashboard.guides.eyebrow')}</p>
      <p className={shared.heading}>{t('home.dashboard.guides.heading')}</p>
      <div className={shared.statRow}>
        <span className={shared.statSecondary}>{GUIDE_SLUGS.length}</span>
        <span className={shared.unit}>{t('home.dashboard.guides.count')}</span>
      </div>
      <div className={shared.chips}>
        {FEATURED.map((slug) => (
          <span key={slug} className={shared.chip}>
            {t(`guides.items.${slug}.name`)}
          </span>
        ))}
      </div>
      <span className={`${shared.foot} cardHoverArrow`}>
        {t('home.dashboard.guides.cta')}
        <span className={shared.arrow} aria-hidden="true">
          →
        </span>
      </span>
    </BentoCard>
  );
}
