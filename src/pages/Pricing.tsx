import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Disclaimer } from '../components/Disclaimer';
import { usePageMeta } from '../lib/usePageMeta';
import { canCheckout, startProCheckout } from '../lib/billing';
import styles from './Pricing.module.css';

export function Pricing() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  usePageMeta(t('meta.pricing'));
  const [annual, setAnnual] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const f = (base: string) => t(`${base}.features`, { returnObjects: true }) as unknown as string[];

  async function goPro() {
    setBusy(true);
    setError('');
    try {
      await startProCheckout(annual ? 'annual' : 'monthly');
    } catch (e) {
      const code = e instanceof Error ? e.message : '';
      if (code === 'sign-in-required') {
        navigate('/account');
        return;
      }
      setError(t('pricing.checkoutError'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={`container ${styles.page}`}>
      <header className={styles.head}>
        <p className={styles.eyebrow}>{t('pricing.eyebrow')}</p>
        <h1>{t('pricing.title')}</h1>
        <p className={styles.subtitle}>{t('pricing.subtitle')}</p>
        <div className={styles.toggle} role="group">
          <button
            type="button"
            className={!annual ? styles.active : ''}
            onClick={() => setAnnual(false)}
          >
            {t('pricing.monthly')}
          </button>
          <button
            type="button"
            className={annual ? styles.active : ''}
            onClick={() => setAnnual(true)}
          >
            {t('pricing.annual')} <span className={styles.save}>{t('pricing.saveBadge')}</span>
          </button>
        </div>
      </header>

      <div className={styles.plans}>
        <Plan
          name={t('pricing.plans.free.name')}
          price={t('pricing.plans.free.price')}
          features={f('pricing.plans.free')}
          cta={t('pricing.current')}
          ctaDisabled
        />
        <Plan
          name={t('pricing.plans.pro.name')}
          price={annual ? t('pricing.plans.pro.priceYr') : t('pricing.plans.pro.priceMo')}
          features={f('pricing.plans.pro')}
          cta={busy ? t('pricing.checkoutBusy') : t('pricing.goPro')}
          highlight
          badge={t('pricing.popular')}
          ctaOnClick={canCheckout() ? () => void goPro() : undefined}
          ctaDisabled={busy || !canCheckout()}
          note={`${t('pricing.indicative')} ${t('pricing.billingNote')}`}
        />
        <Plan
          name={t('pricing.plans.school.name')}
          price={t('pricing.plans.school.price')}
          features={f('pricing.plans.school')}
          cta={t('pricing.contact')}
          ctaHref="/schools"
        />
      </div>

      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}

      <Disclaimer compact />
    </section>
  );
}

interface PlanProps {
  name: string;
  price: string;
  features: string[];
  cta: string;
  highlight?: boolean;
  badge?: string;
  ctaDisabled?: boolean;
  ctaHref?: string;
  ctaOnClick?: () => void;
  note?: string;
}

function Plan({
  name,
  price,
  features,
  cta,
  highlight,
  badge,
  ctaDisabled,
  ctaHref,
  ctaOnClick,
  note,
}: PlanProps) {
  return (
    <div className={`${styles.plan} ${highlight ? styles.highlight : ''}`}>
      {badge && <span className={styles.popularBadge}>{badge}</span>}
      <h2 className={styles.planName}>{name}</h2>
      <p className={styles.price}>{price}</p>
      <ul className={styles.features}>
        {features.map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ul>
      {ctaHref ? (
        <a className={styles.cta} href={ctaHref}>
          {cta}
        </a>
      ) : (
        <button type="button" className={styles.cta} disabled={ctaDisabled} onClick={ctaOnClick}>
          {cta}
        </button>
      )}
      {note && <p className={styles.note}>{note}</p>}
    </div>
  );
}
