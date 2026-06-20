import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { RequireSession } from './RequireSession';
import { CaptainAvatar } from '../../components/CaptainAvatar';
import { CurrencyBoard } from '../../components/CurrencyBoard';
import { UpsellCard } from '../../components/UpsellCard';
import { ResultStat } from '../../components/calc/ResultStat';
import { useAccount } from '../../lib/account';
import { effectivePlan } from '../../lib/entitlements';
import { usePageMeta } from '../../lib/usePageMeta';
import { computeCurrency, actionNeeded } from '../../calc/currency';
import { summarizeLogbook } from '../../calc/logbook';
import styles from './dashboard.module.css';

export function Dashboard() {
  return (
    <RequireSession>
      <Inner />
    </RequireSession>
  );
}

function Inner() {
  const { t } = useTranslation();
  usePageMeta(t('meta.dashboard'));
  const { profile, flights, entitlement } = useAccount();
  const plan = effectivePlan(entitlement);
  const isPro = plan !== 'free';

  const currency = computeCurrency(profile, flights);
  const needs = actionNeeded(currency);
  const log = summarizeLogbook(flights);
  const name = profile.displayName || profile.email || t('account.title');

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

      <div className={styles.grid}>
        <section className={`${styles.card} ${styles.currencyCard}`}>
          <div className={styles.cardHead}>
            <h2>{t('dashboard.currencyBoard')}</h2>
            <Link to="/currency" className={styles.cardLink}>
              {t('dashboard.viewAll')}
            </Link>
          </div>
          <CurrencyBoard items={currency} />
        </section>

        <section className={`${styles.card} ${styles.logCard}`}>
          <div className={styles.cardHead}>
            <h2>{t('dashboard.logbookSummary')}</h2>
            <Link to="/logbook" className={styles.cardLink}>
              {t('dashboard.openLogbook')}
            </Link>
          </div>
          <dl className={styles.stats}>
            <ResultStat
              label={t('account.totalHours')}
              value={log.totalHours.toFixed(1)}
              tone="headline"
            />
            <ResultStat label={t('account.pic')} value={log.picHours.toFixed(1)} />
            <ResultStat label={t('account.night')} value={log.nightHours.toFixed(1)} />
            <ResultStat
              label={t('dashboard.last90Days')}
              value={log.last90.flightCount}
              sub={t('account.flightsLogged', { n: log.flightCount })}
            />
          </dl>
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
        </section>
      </div>

      {!isPro && <UpsellCard />}
    </section>
  );
}
