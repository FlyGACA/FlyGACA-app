import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { RequireSession } from './RequireSession';
import { BrandMark } from '../../components/BrandMark';
import { CurrencyBoard } from '../../components/CurrencyBoard';
import { SetupChecklist } from '../../components/SetupChecklist';
import { UpsellCard } from '../../components/UpsellCard';
import { ReferralCard } from '../../components/ReferralCard';
import { BarSparkline } from '../../components/BarSparkline';
import { BentoGrid } from '../../components/bento/BentoGrid';
import { BentoCard } from '../../components/bento/BentoCard';
import { StatValue } from '../../components/bento/widgets/StatValue';
import { StatusPill } from '../../components/StatusPill';
import { RolePickerCard } from '../../components/dashboard/RolePickerCard';
import { StudyWidget } from '../../components/dashboard/StudyWidget';
import { ToolShortcutsWidget } from '../../components/dashboard/ToolShortcutsWidget';
import { BookmarksWidget } from '../../components/dashboard/BookmarksWidget';
import { AdelThreadsWidget } from '../../components/dashboard/AdelThreadsWidget';
import { UpdatesWatchWidget } from '../../components/dashboard/UpdatesWatchWidget';
import { isUserRole, useAccount } from '../../lib/account';
import { effectivePlan } from '../../lib/entitlements';
import { useFeature } from '../../lib/features';
import { toggleWidget, useDashboardPrefs } from '../../lib/dashboardPrefs';
import { usePageMeta } from '../../lib/usePageMeta';
import {
  dashboardOrder,
  quickActionsFor,
  visibleWidgets,
  type WidgetId,
} from '../../calc/dashboardLayout';
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
  const prefs = useDashboardPrefs();

  const currency = [...computeCurrency(profile, flights), ...recordCurrency(records)];
  const needs = actionNeeded(currency);
  const log = summarizeLogbook(flights);
  const trend = monthlyHours(flights, 6);
  const setup = profileCompleteness(profile, flights);
  const name = profile.displayName || profile.email || t('account.title');

  const order = dashboardOrder(profile.role);
  const widgets = visibleWidgets(order, prefs.hidden);
  const showRolePicker = !isUserRole(profile.role) && !prefs.roleDismissed;

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

  /** Human title for a widget id — shared by tiles and the customize row. */
  function widgetTitle(id: WidgetId): string {
    switch (id) {
      case 'numbers':
        return t('dashboard.groups.numbers');
      case 'currency':
        return t('dashboard.currencyBoard');
      case 'logbook':
        return t('dashboard.logbookSummary');
      case 'trend':
        return t('dashboard.hoursTrend');
      case 'study':
        return t('dashboard.widgets.study.title');
      case 'tools':
        return t('dashboard.widgets.tools.title');
      case 'bookmarks':
        return t('dashboard.widgets.bookmarks.title');
      case 'adel':
        return t('dashboard.widgets.adel.title');
      case 'updates':
        return t('dashboard.widgets.updates.title');
      case 'achievements':
        return t('dashboard.achievements');
    }
  }

  /** One widget id → its bento tile(s). */
  function renderWidget(id: WidgetId): ReactNode {
    switch (id) {
      case 'numbers':
        return [
          <BentoCard key="n-total" span="sm" tone="cyan">
            <span className={styles.metricLabel}>{t('account.totalHours')}</span>
            <StatValue value={log.totalHours} decimals={1} className={styles.metricValue} />
          </BentoCard>,
          <BentoCard key="n-pic" span="sm">
            <span className={styles.metricLabel}>{t('account.pic')}</span>
            <StatValue value={log.picHours} decimals={1} className={styles.metricValue} />
          </BentoCard>,
          <BentoCard key="n-ldg" span="sm" tone="green">
            <span className={styles.metricLabel}>{t('account.ldg')}</span>
            <StatValue value={log.landings} className={styles.metricValue} />
          </BentoCard>,
          <BentoCard key="n-90" span="sm" tone="cyan">
            <span className={styles.metricLabel}>{t('dashboard.last90Days')}</span>
            <StatValue value={log.last90.flightCount} className={styles.metricValue} />
          </BentoCard>,
        ];
      case 'currency':
        return (
          <BentoCard key={id} span="wide">
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
        );
      case 'logbook':
        return (
          <BentoCard key={id} span="wide">
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
        );
      case 'trend':
        return (
          <BentoCard key={id} span="wide">
            <div className={styles.tileHead}>
              <h2>{t('dashboard.hoursTrend')}</h2>
              <span className={styles.cardLink}>{t('dashboard.last6Months')}</span>
            </div>
            <BarSparkline
              bars={trend.map((b) => ({ label: b.label, value: b.hours }))}
              title={t('dashboard.hoursTrendSummary', { hours: totalTrend.toFixed(1) })}
            />
          </BentoCard>
        );
      case 'study':
        return (
          <BentoCard key={id} span="wide">
            <StudyWidget />
          </BentoCard>
        );
      case 'tools':
        return (
          <BentoCard key={id} span="wide" tone="cyan">
            <ToolShortcutsWidget />
          </BentoCard>
        );
      case 'bookmarks':
        return (
          <BentoCard key={id} span="wide">
            <BookmarksWidget />
          </BentoCard>
        );
      case 'adel':
        return (
          <BentoCard key={id} span="wide" tone="green">
            <AdelThreadsWidget />
          </BentoCard>
        );
      case 'updates':
        return (
          <BentoCard key={id} span="wide">
            <UpdatesWatchWidget />
          </BentoCard>
        );
      case 'achievements':
        return (
          <BentoCard key={id} span="wide">
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
        );
    }
  }

  return (
    <section className={`container ${styles.page}`}>
      <header className={styles.hero}>
        <BrandMark />
        <div className={styles.heroText}>
          <p className={styles.eyebrow}>{t('dashboard.eyebrow')}</p>
          <h1>{t('dashboard.greeting', { name })}</h1>
          <p className={styles.sub}>
            <span className={styles.planBadge} data-plan={plan}>
              {t(`account.plan.${plan}`)}
            </span>
            {isUserRole(profile.role) && (
              <span className={styles.roleBadge}>{t(`account.roles.${profile.role}`)}</span>
            )}
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

      {showRolePicker && <RolePickerCard />}

      <BentoGrid label={t('dashboard.eyebrow')}>
        {widgets.flatMap((id) => renderWidget(id))}
        <BentoCard span="wide">
          <div className={styles.tileHead}>
            <h2>{t('dashboard.quickActions')}</h2>
          </div>
          <div className={styles.quick}>
            {quickActionsFor(profile.role).map((a) => (
              <Link key={a.to} to={a.to} className={styles.quickLink}>
                {t(a.labelKey)}
              </Link>
            ))}
          </div>
        </BentoCard>
      </BentoGrid>

      <details className={styles.customize}>
        <summary>{t('dashboard.customize.title')}</summary>
        <p className={styles.customizeHint}>{t('dashboard.customize.hint')}</p>
        <div className={styles.customizeGrid}>
          {order.map((id) => (
            <label key={id} className={styles.customizeItem}>
              <input
                type="checkbox"
                checked={!prefs.hidden.includes(id)}
                onChange={() => toggleWidget(id)}
              />
              <span>{widgetTitle(id)}</span>
            </label>
          ))}
        </div>
      </details>

      {!isPro && <UpsellCard />}
      <ReferralCard />
    </section>
  );
}
