import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Disclaimer } from '../components/Disclaimer';
import { usePageMeta } from '../lib/usePageMeta';
import { canCheckout, startProCheckout } from '../lib/billing';
import { useAccount } from '../lib/account';
import { effectivePlan } from '../lib/entitlements';
import { annualSavingsPct } from '../lib/pricing';
import styles from './Pricing.module.css';

/** Indicative Pro pricing (SAR). Drives the computed savings badge. */
const PRO_PRICE = { monthly: 59, annual: 349 };

interface CompareRow {
  feature: string;
  free: string;
  pro: string;
  school: string;
}
interface Faq {
  q: string;
  a: string;
}

export function Pricing() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  usePageMeta(t('meta.pricing'));
  const { entitlement } = useAccount();
  const plan = effectivePlan(entitlement);
  const [annual, setAnnual] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const f = (base: string) => t(`${base}.features`, { returnObjects: true }) as unknown as string[];
  const savePct = annualSavingsPct(PRO_PRICE.monthly, PRO_PRICE.annual);
  const compare = t('pricing.compare', { returnObjects: true }) as unknown as CompareRow[];
  const faqs = t('pricing.faq', { returnObjects: true }) as unknown as Faq[];

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

  // A paid plan already covers Pro, so the Pro CTA becomes "Your plan".
  const isPaid = plan !== 'free';

  return (
    <section className={`container ${styles.page}`}>
      <header className={styles.head}>
        <p className={styles.eyebrow}>{t('pricing.eyebrow')}</p>
        <h1>{t('pricing.title')}</h1>
        <p className={styles.subtitle}>{t('pricing.subtitle')}</p>
        <div className={styles.toggle} role="group" aria-label={t('pricing.billingCycle')}>
          <button
            type="button"
            className={!annual ? styles.active : ''}
            aria-pressed={!annual}
            onClick={() => setAnnual(false)}
          >
            {t('pricing.monthly')}
          </button>
          <button
            type="button"
            className={annual ? styles.active : ''}
            aria-pressed={annual}
            onClick={() => setAnnual(true)}
          >
            {t('pricing.annual')}{' '}
            <span className={styles.save}>{t('pricing.saveBadge', { pct: savePct })}</span>
          </button>
        </div>
      </header>

      <div className={styles.plans}>
        <Plan
          name={t('pricing.plans.free.name')}
          price={t('pricing.plans.free.price')}
          features={f('pricing.plans.free')}
          cta={plan === 'free' ? t('pricing.current') : t('pricing.included')}
          ctaDisabled
          current={plan === 'free'}
          currentLabel={t('pricing.yourPlan')}
        />
        <Plan
          name={t('pricing.plans.pro.name')}
          price={annual ? t('pricing.plans.pro.priceYr') : t('pricing.plans.pro.priceMo')}
          features={f('pricing.plans.pro')}
          cta={
            isPaid ? t('pricing.yourPlan') : busy ? t('pricing.checkoutBusy') : t('pricing.goPro')
          }
          highlight
          badge={t('pricing.popular')}
          ctaOnClick={!isPaid && canCheckout() ? () => void goPro() : undefined}
          ctaDisabled={isPaid || busy || !canCheckout()}
          current={plan === 'pro'}
          currentLabel={t('pricing.yourPlan')}
          note={`${t('pricing.indicative')} ${t('pricing.billingNote')}`}
        />
        <Plan
          name={t('pricing.plans.school.name')}
          price={t('pricing.plans.school.price')}
          features={f('pricing.plans.school')}
          cta={plan === 'school' ? t('pricing.yourPlan') : t('pricing.contact')}
          ctaHref="/schools"
          current={plan === 'school'}
          currentLabel={t('pricing.yourPlan')}
        />
      </div>

      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}

      <section className={styles.compareSection} aria-labelledby="compare-head">
        <h2 id="compare-head" className={styles.sectionHead}>
          {t('pricing.compareHead')}
        </h2>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">{t('pricing.feature')}</th>
                <th scope="col">{t('pricing.plans.free.name')}</th>
                <th scope="col">{t('pricing.plans.pro.name')}</th>
                <th scope="col">{t('pricing.plans.school.name')}</th>
              </tr>
            </thead>
            <tbody>
              {compare.map((row) => (
                <tr key={row.feature}>
                  <th scope="row">{row.feature}</th>
                  <td>{row.free}</td>
                  <td>{row.pro}</td>
                  <td>{row.school}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.faqSection} aria-labelledby="faq-head">
        <h2 id="faq-head" className={styles.sectionHead}>
          {t('pricing.faqHead')}
        </h2>
        <div className={styles.faqList}>
          {faqs.map((item) => (
            <details key={item.q} className={styles.faq}>
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </section>

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
  current?: boolean;
  currentLabel?: string;
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
  current,
  currentLabel,
}: PlanProps) {
  return (
    <div
      className={`${styles.plan} ${highlight ? styles.highlight : ''} ${current ? styles.currentPlan : ''}`}
    >
      {badge && !current && <span className={styles.popularBadge}>{badge}</span>}
      {current && currentLabel && <span className={styles.currentBadge}>{currentLabel}</span>}
      <h2 className={styles.planName}>{name}</h2>
      <p className={styles.price}>{price}</p>
      <ul className={styles.features}>
        {features.map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ul>
      {ctaHref ? (
        <Link className={styles.cta} to={ctaHref}>
          {cta}
        </Link>
      ) : (
        <button type="button" className={styles.cta} disabled={ctaDisabled} onClick={ctaOnClick}>
          {cta}
        </button>
      )}
      {note && <p className={styles.note}>{note}</p>}
    </div>
  );
}
