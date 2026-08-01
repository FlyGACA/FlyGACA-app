import { useTranslation } from 'react-i18next';
import { BentoCard } from '@/components/bento/BentoCard';
import shared from './widgets.module.css';
import styles from './HudWidget.module.css';

/**
 * Teaser tile for the Interactive Kingdom Airspace HUD (`/hud`). The strip
 * rows are static, decorative flavour text mirroring the page's simulated
 * training callsigns — deliberately declarative-only, with the SIM framing
 * carried by the localized note.
 */
const STRIPS = ['FALCON-07 · OERK → OEJN · FL360', 'UAS-09 · 400 FT · 55 KT', 'ROTOR-02 · OEDF'];

export function HudWidget() {
  const { t } = useTranslation();
  return (
    <BentoCard span="md" tone="green" to="/hud" label={t('home.dashboard.hud.cta')}>
      <p className={shared.eyebrow}>{t('home.dashboard.hud.eyebrow')}</p>
      <p className={shared.heading}>{t('home.dashboard.hud.heading')}</p>
      <ul className={styles.strips}>
        {STRIPS.map((strip) => (
          <li key={strip} className={styles.strip}>
            <span className={styles.blip} aria-hidden="true" />
            <bdi dir="ltr">{strip}</bdi>
          </li>
        ))}
      </ul>
      <p className={styles.note}>{t('home.dashboard.hud.note')}</p>
      <span className={`${shared.foot} cardHoverArrow`}>
        {t('home.dashboard.hud.cta')}
        <span className={shared.arrow} aria-hidden="true">
          →
        </span>
      </span>
    </BentoCard>
  );
}
