import { useTranslation } from 'react-i18next';
import { liveTools } from '../../../lib/tools';
import { GUIDE_SLUGS } from '../../guides/guides';
import { CountUp } from './CountUp';
import styles from './sections.module.css';

/**
 * Credibility strip under the hero CTAs — real, factual product counts with a
 * lightweight count-up. Numeric chips animate; the bilingual / free chips are
 * static text. No fabricated social proof.
 */
export function TrustStrip() {
  const { t } = useTranslation();
  const tools = liveTools().length;
  const guides = GUIDE_SLUGS.length;

  return (
    <ul className={styles.trust} aria-label={t('home.trust.label')}>
      <li className={styles.chip}>
        <span className={styles.chipValue}>
          <CountUp value={70} />+
        </span>
        <span className={styles.chipLabel}>{t('home.trust.parts')}</span>
      </li>
      <li className={styles.chip}>
        <span className={styles.chipValue}>
          <CountUp value={tools} />
        </span>
        <span className={styles.chipLabel}>{t('home.trust.tools')}</span>
      </li>
      <li className={styles.chip}>
        <span className={styles.chipValue}>
          <CountUp value={guides} />
        </span>
        <span className={styles.chipLabel}>{t('home.trust.guides')}</span>
      </li>
      <li className={styles.chip}>
        <span className={styles.chipValue}>
          <bdi dir="ltr">EN / AR</bdi>
        </span>
        <span className={styles.chipLabel}>{t('home.trust.languages')}</span>
      </li>
      <li className={styles.chip}>
        <span className={styles.chipValue}>{t('home.trust.priceValue')}</span>
        <span className={styles.chipLabel}>{t('home.trust.price')}</span>
      </li>
    </ul>
  );
}
