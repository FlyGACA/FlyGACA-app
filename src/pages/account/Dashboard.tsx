import { Link, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { RequireSession } from './RequireSession';
import { CaptainAvatar } from '../../components/CaptainAvatar';
import { CurrencyBoard } from '../../components/CurrencyBoard';
import { SectionHeader } from '../../components/SectionHeader';
import { SetupChecklist } from '../../components/SetupChecklist';
import { UpsellCard } from '../../components/UpsellCard';
import { BarSparkline } from '../../components/BarSparkline';
import { BentoGrid } from '../../components/bento/BentoGrid';
import { BentoCard } from '../../components/bento/BentoCard';
import { StatValue } from '../../components/bento/widgets/StatValue';
import { StatusPill } from '../../components/StatusPill';
import { useAccount } from '../../lib/account';
import { effectivePlan } from '../../lib/entitlements';
import { useFeature } from '../../lib/features';
import { usePageMeta } from '../../lib/usePageMeta';
import { computeCurrency, recordCurrency, actionNeeded } from '../../calc/currency';
import { summarizeLogbook, monthlyHours } from '../../calc/logbook';
import { achievements, earnedCount } from '../../calc/achievements';
import { profileCompleteness } from '../../calc/onboarding';
import { buildIcs } from '../../calc/ics';
import styles from './dashboard.module.css';

export function Dashboard() {
  const { t } = useTranslation();
  // Session-gated — keep out of the index.
  usePageMeta(t('meta.dashboard'), undefined, undefined, { noindex: true });
  return (
    <RequireSession>
      <Inner />
    </RequireSession>
  );
}

function Inner() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profile, flights, records, entitlement } = useAccount();
  const plan = effectivePlan(entitlement);
  const isPro = plan !== 'free';
  const canExport = useFeature('currency-export');

  const currency = [...computeCurrency(profile, flights), ...recordCurrency(records)];
  const needs = actionNeeded(currency);
  const log = summarizeLogbook(flights);
  const trend = monthlyHours(flights, 6);
  const setup = profileCompleteness(profile, flights);
  const name = profile.displayName || profile.email || t('account.title');

  const icsEvents = currency
    .filter((i) => i.expiry)
    .map((i) => ({ summary: t(i.labelKey), date: i.expiry as Date }));

  function exportIcs() {
    if (!canExport) {
      navigate('/pricing');
      return;
    }
    const blob = new Blob([buildIcs(icsEvents)], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'flygaca-currency.ics';
    a.click();
    URL.revokeObjectURL(url);
  }

  const totalTrend = trend.reduce((s, b) => s + b.hours, 0);

  // Earned milestones first; lock the rest with a progress hint.
  const badges = achievements(flights).sort((a, b) => Number(b.earned) - Number(a.earned));
  const earned = earnedCount(badges);

  return (
    <section className={`container ${styles.page}`}>
      <header className={styles.hero}>
        <CaptainAvatar size="lg" pose="smile" glow decorative className={styles.avatar} />
        <div className={styles.heroText}>
          <p className={styles.eyebrow}>{t('dashboard.eyebrow')}</p>
          <h1>{t('dashboard.greeting', { name })}</h1>
          <p className={styles.sub}>
            <span className={styles.planBadge} data-plan={plan}>
              {t(`account.plan.${plan}`)}
            </span>
            <span className={`${styles.status} ${needs ? styles.statusWarn : styles.statusOk}`}>
              {needs ? t('dashboard.actionNeeded') : t('dashboard.allCurrent')}
            </span>
          </p>
        </div>
      </header>

      {setup.percent < 100 && (
        <div className={styles.setupCard}>
          <SetupChecklist completeness={setup} />
        </div>
      )}

      <section aria-labelledby="dash-numbers">
        <SectionHeader
          id="dash-numbers"
          title={t('dashboard.groups.numbers')}
          tone="var(--neon-cyan)"
        />
        <BentoGrid label={t('dashboard.groups.numbers')}>
          <BentoCard span="sm" tone="cyan">
            <span className={styles.metricLabel}>{t('account.totalHours')}</span>
            <StatValue value={log.totalHours} decimals={1} className={styles.metricValue} />
          </BentoCard>
          <BentoCard span="sm">
            <span className={styles.metricLabel}>{t('account.pic')}</span>
            <StatValue value={log.picHours} decimals={1} className={styles.metricValue} />
          </BentoCard>
          <BentoCard span="sm" tone="green">
            <span className={styles.metricLabel}>{t('account.ldg')}</span>
            <StatValue value={log.landings} className={styles.metricValue} />
          </BentoCard>
          <BentoCard span="sm" tone="cyan">
            <span className={styles.metricLabel}>{t('dashboard.last90Days')}</span>
            <StatValue value={log.last90.flightCount} className={styles.metricValue} />
          </BentoCard>
        </BentoGrid>
      </section>

      <section aria-labelledby="dash-activity">
        <SectionHeader
          id="dash-activity"
          title={t('dashboard.groups.activity')}
          tone="var(--neon-green)"
        />
        <BentoGrid label={t('dashboard.groups.activity')}>
          <BentoCard span="wide">
            <div className={styles.tileHead}>
              <h2>{t('dashboard.currencyBoard')}</h2>
              <div className={styles.tileActions}>
                {icsEvents.length > 0 && (
                  <button type="button" className={styles.ghostBtn} onClick={exportIcs}>
                    {t('currency.addCalendar')}
                    {!isPro && <span className={styles.proTag}>{t('upsell.proOnly')}</span>}
                  </button>
                )}
                <Link to="/currency" className={styles.cardLink}>
                  {t('dashboard.viewAll')}
                </Link>
              </div>
            </div>
            <CurrencyBoard items={currency} />
          </BentoCard>

          <BentoCard span="wide">
            <div className={styles.tileHead}>
              <h2>{t('dashboard.logbookSummary')}</h2>
              <Link to="/logbook" className={styles.cardLink}>
                {t('dashboard.openLogbook')}
              </Link>
            </div>
            {log.recent.length > 0 ? (
              <ul className={styles.recent}>
                {log.recent.map((f) => (
                  <li key={f.id} className={styles.recentRow}>
                    <span className={styles.recentDate}>
                      <bdi dir="ltr">{f.date || '—'}</bdi>
                    </span>
                    <span className={styles.recentRoute}>
                      <bdi dir="ltr">
                        {(f.type || '—') + ' · ' + (f.from || '?') + '→' + (f.to || '?')}
                      </bdi>
                    </span>
                    <span className={styles.recentHrs}>
                      <bdi dir="ltr">{f.total || '—'}</bdi>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.empty}>{t('account.emptyLog')}</p>
            )}
          </BentoCard>

          <BentoCard span="wide">
            <div className={styles.tileHead}>
              <h2>{t('dashboard.hoursTrend')}</h2>
              <span className={styles.cardLink}>{t('dashboard.last6Months')}</span>
            </div>
            <BarSparkline
              bars={trend.map((b) => ({ label: b.label, value: b.hours }))}
              title={t('dashboard.hoursTrendSummary', { hours: totalTrend.toFixed(1) })}
            />
          </BentoCard>
        </BentoGrid>
      </section>

      <section aria-labelledby="dash-more">
        <SectionHeader id="dash-more" title={t('dashboard.groups.more')} tone="var(--gold)" />
        <BentoGrid label={t('dashboard.groups.more')}>
          <BentoCard span="wide">
            <div className={styles.tileHead}>
              <h2>{t('dashboard.achievements')}</h2>
              <span className={styles.cardLink}>
                {t('dashboard.achievementsEarned', { earned, total: badges.length })}
              </span>
            </div>
            <div className={styles.badges}>
              {badges.map((b) => (
                <StatusPill
                  key={b.id}
                  tone={b.earned ? 'success' : 'data'}
                  title={b.earned ? undefined : `${b.have} / ${b.target}`}
                >
                  {b.earned ? '★ ' : ''}
                  {t(`dashboard.achievementItems.${b.id}`)}
                  {!b.earned && (
                    <span className={styles.badgeProg}>
                      {' '}
                      · {b.have}/{b.target}
                    </span>
                  )}
                </StatusPill>
              ))}
            </div>
          </BentoCard>

          <BentoCard span="wide">
            <div className={styles.tileHead}>
              <h2>{t('dashboard.quickActions')}</h2>
            </div>
            <div className={styles.quick}>
              <Link to="/logbook?add=1" className={styles.quickLink}>
                {t('dashboard.logFlight')}
              </Link>
              <Link to="/records" className={styles.quickLink}>
                {t('records.title')}
              </Link>
              <Link to="/currency" className={styles.quickLink}>
                {t('currency.title')}
              </Link>
              <Link to="/updates" className={styles.quickLink}>
                {t('alerts.title')}
              </Link>
              <Link to="/settings" className={styles.quickLink}>
                {t('account.settings')}
              </Link>
            </div>
          </BentoCard>
        </BentoGrid>
      </section>

      {!isPro && <UpsellCard />}
    </section>
  );
}
