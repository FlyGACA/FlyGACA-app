import { useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Disclaimer } from '../components/Disclaimer';
import { PageHero } from '../components/PageHero';
import { SectionHeader } from '../components/SectionHeader';
import { usePageMeta } from '../lib/usePageMeta';
import { faqLd } from '../lib/jsonld';
import { canCheckout, startBillingPortal, startProCheckout, type ProPlan } from '../lib/billing';
import { useAccount } from '../lib/account';
import { effectivePlan } from '../lib/entitlements';
import { annualSavingsPct, monthlyEquivalent } from '../lib/pricing';
import { captureRefFromUrl, getStoredRef } from '../lib/referral';
import styles from './Pricing.module.css';

/**
 * Indicative pricing (SAR). One source of truth — the display strings are
 * templated from these numbers so they can never drift. Reading the regulatory
 * library is always free; these gate acceleration, AI depth, proof and ops.
 */
const PRO_PRICE = { monthly: 59, annual: 449 };
const STUDENT_PRICE = { monthly: 39, annual: 299 };
const PASS_PRICE = 149;
const SCHOOL_FROM = 250;

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
  const [searchParams, setSearchParams] = useSearchParams();
  // Stripe returns abandoned checkouts to /pricing?checkout=cancel; acknowledge it
  // so the user knows nothing was charged, and let them clear it.
  const showCanceled = searchParams.get('checkout') === 'cancel';
  function dismissCanceled() {
    const next = new URLSearchParams(searchParams);
    next.delete('checkout');
    setSearchParams(next, { replace: true });
  }
  usePageMeta(
    t('meta.pricing'),
    t('metaDesc.pricing'),
    faqLd(t('pricing.faq', { returnObjects: true }) as unknown as Faq[]),
  );
  const { entitlement } = useAccount();
  const plan = effectivePlan(entitlement);
  // Annual is the default — it's the better LTV/cash outcome and the headline saving.
  const [annual, setAnnual] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const f = (base: string) => t(`${base}.features`, { returnObjects: true }) as unknown as string[];
  const savePct = annualSavingsPct(PRO_PRICE.monthly, PRO_PRICE.annual);
  const compare = t('pricing.compare', { returnObjects: true }) as unknown as CompareRow[];
  // Render the boolean comparison cells as a tinted check / muted cross with an
  // sr-only label; value cells (e.g. "5 / day", "Unlimited") pass through as text.
  const cmpCell = (v: string): ReactNode => {
    if (v === '✓')
      return (
        <span className={styles.cmpYes}>
          <span aria-hidden="true">✓</span>
          <span className="sr-only">{t('pricing.cmpYes')}</span>
        </span>
      );
    if (v === '✕')
      return (
        <span className={styles.cmpNo}>
          <span aria-hidden="true">✕</span>
          <span className="sr-only">{t('pricing.cmpNo')}</span>
        </span>
      );
    return v;
  };
  const faqs = t('pricing.faq', { returnObjects: true }) as unknown as Faq[];
  const schoolPoints = t('pricing.schoolsPoints', { returnObjects: true }) as unknown as string[];

  const proPrice = annual
    ? t('pricing.perYr', { n: PRO_PRICE.annual, eq: monthlyEquivalent(PRO_PRICE.annual) })
    : t('pricing.perMo', { n: PRO_PRICE.monthly });
  const studentPrice = annual
    ? t('pricing.perYr', { n: STUDENT_PRICE.annual, eq: monthlyEquivalent(STUDENT_PRICE.annual) })
    : t('pricing.perMo', { n: STUDENT_PRICE.monthly });

  // Persist an inbound ?ref=CODE so it survives the sign-in / Stripe round-trip.
  useEffect(() => {
    captureRefFromUrl();
  }, []);

  async function checkout(variant: ProPlan) {
    setBusy(true);
    setError('');
    try {
      await startProCheckout(variant, { annual, ref: getStoredRef() });
    } catch (e) {
      const code = e instanceof Error ? e.message : '';
      if (code === 'sign-in-required') {
        navigate('/account');
        return;
      }
      setError(
        code === 'student-verification-required'
          ? t('pricing.studentVerifyNeeded')
          : t('pricing.checkoutError'),
      );
    } finally {
      setBusy(false);
    }
  }

  async function manage() {
    setBusy(true);
    setError('');
    try {
      await startBillingPortal();
    } catch {
      setError(t('pricing.checkoutError'));
    } finally {
      setBusy(false);
    }
  }

  // A paid plan already covers Pro, so the Pro CTA manages the subscription.
  const isPaid = plan !== 'free';

  return (
    <section className={`container ${styles.page}`}>
      <PageHero
        align="center"
        eyebrow={t('pricing.eyebrow')}
        title={t('pricing.title')}
        subtitle={t('pricing.subtitle')}
      >
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
      </PageHero>

      <p className={styles.trustBanner}>{t('pricing.trustBanner')}</p>
      <p className={styles.planIntro}>{t(`pricing.planIntro.${plan}`)}</p>

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
          price={proPrice}
          priceNote={t('pricing.vatIncl')}
          features={f('pricing.plans.pro')}
          cta={
            isPaid
              ? t('account.subscription.manage')
              : busy
                ? t('pricing.checkoutBusy')
                : t('pricing.goPro')
          }
          highlight
          badge={t('pricing.popular')}
          ctaOnClick={
            canCheckout()
              ? isPaid
                ? () => void manage()
                : () => void checkout(annual ? 'annual' : 'monthly')
              : undefined
          }
          ctaDisabled={busy || !canCheckout()}
          current={plan === 'pro'}
          currentLabel={t('pricing.yourPlan')}
          note={`${t('pricing.indicative')} ${t('pricing.billingNote')}`}
          belowCta={
            !isPaid && (
              <>
                <p className={styles.proExtras}>
                  <span>{t('pricing.trial')}</span>
                  <span>{t('pricing.moneyBack')}</span>
                </p>
                <details className={styles.studentDisc}>
                  <summary>{t('pricing.studentToggle')}</summary>
                  <p>
                    <bdi dir="ltr">{studentPrice}</bdi> · {t('pricing.studentNote')}
                  </p>
                  {canCheckout() && (
                    <button
                      type="button"
                      className="btn"
                      disabled={busy}
                      onClick={() => void checkout('student')}
                    >
                      {t('pricing.studentCta')}
                    </button>
                  )}
                </details>
              </>
            )
          }
        />
        <Plan
          name={t('pricing.plans.school.name')}
          price={t('pricing.perSeat', { n: SCHOOL_FROM })}
          priceNote={t('pricing.vatExcl')}
          features={f('pricing.plans.school')}
          cta={plan === 'school' ? t('pricing.yourPlan') : t('pricing.contact')}
          ctaHref="/schools"
          current={plan === 'school'}
          currentLabel={t('pricing.yourPlan')}
        />
      </div>

      {showCanceled && (
        <p role="status" className={styles.canceled}>
          <span>{t('pricing.checkoutCanceled')}</span>
          <button type="button" className={styles.canceledDismiss} onClick={dismissCanceled}>
            {t('pricing.checkoutCanceledDismiss')}
          </button>
        </p>
      )}

      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}

      {/* Exam Season Pass — serves "just need it until my checkride" buyers. */}
      <section className={styles.passBand} aria-labelledby="pass-head">
        <div>
          <h2 id="pass-head" className={styles.passHead}>
            {t('pricing.passHead')}
          </h2>
          <p className={styles.passLead}>{t('pricing.passLead')}</p>
        </div>
        <div className={styles.passAside}>
          <span className={styles.passPrice}>
            <bdi dir="ltr">{t('pricing.pass', { n: PASS_PRICE })}</bdi>
          </span>
          {canCheckout() ? (
            <button
              type="button"
              className={styles.passCta}
              disabled={busy}
              onClick={() => void checkout('pass')}
            >
              {t('pricing.passCta')}
            </button>
          ) : (
            // Native shells buy through store IAP, not Stripe web checkout.
            <button type="button" className={styles.passCta} disabled aria-disabled="true">
              {t('pricing.passComingSoon')}
            </button>
          )}
        </div>
      </section>

      <section className={styles.compareSection} aria-labelledby="compare-head">
        <SectionHeader id="compare-head" title={t('pricing.compareHead')} tone="var(--cat-1)" />
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <caption className="sr-only">{t('pricing.compareHead')}</caption>
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
                  <td>{cmpCell(row.free)}</td>
                  <td>{cmpCell(row.pro)}</td>
                  <td>{cmpCell(row.school)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* B2B band — route the highest-value buyer to the schools sales path. */}
      <section className={styles.schoolsBand} aria-labelledby="schools-head">
        <div className={styles.schoolsText}>
          <p className={styles.eyebrow}>{t('pricing.schoolsEyebrow')}</p>
          <h2 id="schools-head" className={styles.schoolsHead}>
            {t('pricing.schoolsHead')}
          </h2>
          <ul className={styles.schoolsPoints}>
            {schoolPoints.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
          <p className={styles.schoolsPrice}>
            <bdi dir="ltr">{t('pricing.perSeat', { n: SCHOOL_FROM })}</bdi> ·{' '}
            {t('pricing.schoolsMin')}
          </p>
        </div>
        <Link to="/schools" className={styles.schoolsCta}>
          {t('pricing.schoolsCta')}
        </Link>
      </section>

      <section className={styles.faqSection} aria-labelledby="faq-head">
        <SectionHeader id="faq-head" title={t('pricing.faqHead')} tone="var(--cat-5)" />
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
  priceNote?: string;
  features: string[];
  cta: string;
  highlight?: boolean;
  badge?: string;
  ctaDisabled?: boolean;
  ctaHref?: string;
  ctaOnClick?: () => void;
  note?: string;
  belowCta?: ReactNode;
  current?: boolean;
  currentLabel?: string;
}

function Plan({
  name,
  price,
  priceNote,
  features,
  cta,
  highlight,
  badge,
  ctaDisabled,
  ctaHref,
  ctaOnClick,
  note,
  belowCta,
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
      {/* Fixed-height block so every card's feature list starts at the same Y,
          whether or not the plan carries a VAT note (Free has none). */}
      <div className={styles.priceBlock}>
        <p className={styles.price}>
          <bdi dir="ltr">{price}</bdi>
        </p>
        {priceNote && <p className={styles.priceNote}>{priceNote}</p>}
      </div>
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
      {belowCta}
      {note && <p className={styles.note}>{note}</p>}
    </div>
  );
}
