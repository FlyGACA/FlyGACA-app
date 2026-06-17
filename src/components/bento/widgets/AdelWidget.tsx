import { useTranslation } from 'react-i18next';
import { BentoCard } from '../BentoCard';
import shared from './widgets.module.css';

/** Captain Adel — the AI flight instructor that cites the exact Part and section. */
export function AdelWidget() {
  const { t } = useTranslation();

  return (
    <BentoCard span="sm" tone="green" to="/chat" label={t('home.dashboard.adel.cta')}>
      <span className={shared.pill}>
        <span className={shared.dot} aria-hidden="true" />
        {t('home.dashboard.adel.status')}
      </span>
      <p className={shared.heading}>{t('home.dashboard.adel.heading')}</p>
      <p className={shared.desc}>{t('home.dashboard.adel.desc')}</p>
      <span className={`${shared.foot} cardHoverArrow`}>
        {t('home.dashboard.adel.cta')}
        <span className={shared.arrow} aria-hidden="true">
          →
        </span>
      </span>
    </BentoCard>
  );
}
