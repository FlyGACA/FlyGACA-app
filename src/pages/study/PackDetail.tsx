import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useFetchJson } from '../../lib/useFetchJson';
import type {
  CorpusIndex,
  GroundSchoolData,
  PathsIndex,
  PdfsIndex,
  QuizData,
} from '../../lib/content';
import { useStudyProgress } from '../../lib/studyProgress';
import { useAccount, refreshAccount } from '../../lib/account';
import { hasPackAccess, ownsPack } from '../../lib/packEntitlements';
import { canCheckout, startPackCheckout } from '../../lib/billing';
import { captureRefFromUrl, getStoredRef } from '../../lib/referral';
import { usePageMeta } from '../../lib/usePageMeta';
import { courseLd } from '../../lib/jsonld';
import { adelLink } from '../../lib/adel';
import { Disclaimer } from '../../components/Disclaimer';
import { ProgressBar } from '../../components/ProgressBar';
import { findPack, packItemCount, PREP_PACK_PRICE } from '../../lib/prepCatalog';
import { NotFound } from '../NotFound';
import styles from './Study.module.css';

export function PackDetail() {
  const { t, i18n } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const pack = findPack(id);
  // `soon` packs are announced but have no content/detail page — treat as not found
  // so the storefront card (with its waitlist form) is the only surface for them.
  const shown = pack && pack.status === 'live' ? pack : undefined;

  // A pack detail page is indexable; an unknown/soon id renders <NotFound/>, so
  // noindex it here (this hook runs before that early return).
  usePageMeta(
    shown ? t(`study.packCatalog.${shown.id}.name`) : undefined,
    shown ? t(`study.packCatalog.${shown.id}.desc`) : undefined,
    shown
      ? courseLd({
          title: t(`study.packCatalog.${shown.id}.name`),
          description: t(`study.packCatalog.${shown.id}.desc`),
          path: `/study/packs/${shown.id}`,
          lang: i18n.language,
        })
      : undefined,
    shown ? undefined : { noindex: true },
  );

  const { entitlement, ownedPacks } = useAccount();
  const { quizBest, flagged, exam } = useStudyProgress();
  const quiz = useFetchJson<QuizData>('/data/quiz.json');
  const gs = useFetchJson<GroundSchoolData>('/data/groundschool.json');
  const paths = useFetchJson<PathsIndex>('/data/paths-index.json');
  const pdfs = useFetchJson<PdfsIndex>('/data/pdfs-index.json');
  const refs = useFetchJson<CorpusIndex>('/data/reference-index.json');

  const [searchParams, setSearchParams] = useSearchParams();
  const checkout = searchParams.get('checkout');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Persist an inbound ?ref=CODE so it survives the sign-in / Stripe round-trip.
  useEffect(() => {
    captureRefFromUrl();
  }, []);

  // After a pack checkout returns, ownership is granted asynchronously by the
  // webhook — poll a few times so the unlocked pack appears without a manual reload.
  useEffect(() => {
    if (checkout !== 'success') return;
    void refreshAccount();
    let n = 0;
    const poll = window.setInterval(() => {
      void refreshAccount();
      if (++n >= 8) window.clearInterval(poll);
    }, 2500);
    return () => window.clearInterval(poll);
  }, [checkout]);

  if (!shown) return <NotFound />;
  const pack2 = shown;

  const packName = t(`study.packCatalog.${pack2.id}.name`);
  const packDesc = t(`study.packCatalog.${pack2.id}.desc`);
  const access = hasPackAccess(pack2, entitlement, ownedPacks);
  const owned = ownsPack(pack2, ownedPacks);
  const justPurchased = checkout === 'success' && owned;

  function dismissCheckoutParam() {
    const next = new URLSearchParams(searchParams);
    next.delete('checkout');
    setSearchParams(next, { replace: true });
  }

  async function buy() {
    setBusy(true);
    setError('');
    try {
      await startPackCheckout(pack2.id, { ref: getStoredRef() });
    } catch (e) {
      const code = e instanceof Error ? e.message : '';
      if (code === 'sign-in-required') {
        navigate('/account');
        return;
      }
      setError(t('study.packCheckoutError'));
    } finally {
      setBusy(false);
    }
  }

  // Locked = a paid pack the user neither owns nor has via a plan. Show a real product
  // page: what's inside, price, Buy (or "included with Pro"). Buy is web-only.
  if (!access) {
    return (
      <section className={`container ${styles.page}`}>
        <p className={styles.back}>
          <Link to="/study/packs">← {t('study.packs')}</Link>
        </p>
        <header className={styles.packHero}>
          <div className={styles.packHeroTop}>
            <h1>{packName}</h1>
            <span className={styles.proTag}>{t('study.packPaid')}</span>
          </div>
          <p className={styles.packHeroDesc}>{packDesc}</p>

          <p className={styles.packInsideLine}>
            {t('study.packItemCount', { n: packItemCount(pack2) })} ·{' '}
            {t('study.questions', { n: countQuestions(quiz.data, pack2.bankIds) })}
          </p>

          <div className={styles.packBuyRow}>
            <span className={styles.packBuyPrice}>
              <bdi dir="ltr">{t('study.packPriceOnce', { n: PREP_PACK_PRICE })}</bdi>
            </span>
            {canCheckout() ? (
              <button
                type="button"
                className={styles.primary}
                disabled={busy}
                onClick={() => void buy()}
              >
                {busy ? t('pricing.checkoutBusy') : t('study.packBuy')}
              </button>
            ) : (
              // Native shells buy through store IAP, not Stripe web checkout.
              <button type="button" className={styles.primary} disabled aria-disabled="true">
                {t('pricing.passComingSoon')}
              </button>
            )}
          </div>
          <p className={styles.packIncludedWith}>
            <Link to="/pricing">{t('study.packIncludedWithPro')}</Link>
          </p>
          {error && (
            <p role="alert" className={styles.notifyError}>
              {error}
            </p>
          )}
        </header>
        <Disclaimer compact />
      </section>
    );
  }

  const banks = (quiz.data?.banks ?? []).filter((b) => pack2.bankIds.includes(b.id));
  const modules = (gs.data?.modules ?? []).filter((m) => pack2.moduleIds?.includes(m.id));
  const readingPaths = (paths.data?.paths ?? []).filter((p) => pack2.pathIds?.includes(p.id));
  const sheets = (pdfs.data?.documents ?? []).filter((d) => pack2.sheetSlugs?.includes(d.slug));
  // Keep the pack's own slug order so the reading list reads GEN → ENR, not index order.
  const reading = (pack2.librarySlugs ?? [])
    .map((slug) => refs.data?.documents.find((d) => d.slug === slug))
    .filter((d): d is NonNullable<typeof d> => d != null);

  // Overall mastery = mean of each bank's best quiz score (unattempted banks count 0),
  // so the meter reflects progress across the whole pack, not a single good run.
  const mastery = pack2.bankIds.length
    ? Math.round(
        pack2.bankIds.reduce((sum, bid) => sum + (quizBest[bid] ?? 0), 0) / pack2.bankIds.length,
      )
    : 0;
  const flaggedCount = pack2.bankIds.reduce((n, bid) => n + (flagged[bid]?.length ?? 0), 0);

  const adelHref = adelLink(t('study.askAdelPrompt', { topic: packName }));

  return (
    <section className={`container ${styles.page}`}>
      <p className={styles.back}>
        <Link to="/study/packs">← {t('study.packs')}</Link>
      </p>

      {justPurchased && (
        <p role="status" className={styles.purchaseOk}>
          <span>{t('study.packPurchaseSuccess')}</span>
          <button type="button" className={styles.canceledDismiss} onClick={dismissCheckoutParam}>
            {t('pricing.checkoutCanceledDismiss')}
          </button>
        </p>
      )}
      {checkout === 'cancel' && (
        <p role="status" className={styles.purchaseCancel}>
          <span>{t('study.packCheckoutCanceled')}</span>
          <button type="button" className={styles.canceledDismiss} onClick={dismissCheckoutParam}>
            {t('pricing.checkoutCanceledDismiss')}
          </button>
        </p>
      )}

      <header className={styles.packHero}>
        <div className={styles.packHeroTop}>
          <h1>{packName}</h1>
          {owned ? (
            <span className={styles.ownedTag}>{t('study.packOwned')}</span>
          ) : (
            pack2.access === 'paid' && (
              <span className={styles.includedTag}>{t('study.packIncluded')}</span>
            )
          )}
        </div>
        <p className={styles.packHeroDesc}>{packDesc}</p>

        {banks.length > 0 && (
          <div className={styles.packMeter}>
            <div className={styles.packMeterHead}>
              <span className={styles.packMeterLabel}>{t('study.packMastery')}</span>
              <span className={styles.packMeterPct}>{mastery}%</span>
            </div>
            <ProgressBar percent={mastery} label={t('study.packMastery')} />
          </div>
        )}

        <ul className={styles.packStats}>
          <li className={styles.packStat}>
            <span className={styles.packStatNum}>{banks.length}</span>
            <span className={styles.packStatLabel}>{t('study.statBanks')}</span>
          </li>
          {reading.length > 0 && (
            <li className={styles.packStat}>
              <span className={styles.packStatNum}>{reading.length}</span>
              <span className={styles.packStatLabel}>{t('study.statReading')}</span>
            </li>
          )}
          {sheets.length > 0 && (
            <li className={styles.packStat}>
              <span className={styles.packStatNum}>{sheets.length}</span>
              <span className={styles.packStatLabel}>{t('study.statSheets')}</span>
            </li>
          )}
          {exam && (
            <li className={styles.packStat}>
              <span className={styles.packStatNum}>{exam.pct}%</span>
              <span className={styles.packStatLabel}>{t('study.statBestExam')}</span>
            </li>
          )}
        </ul>

        <div className={styles.packActionRow}>
          {banks.length > 0 && (
            <Link
              to={`/study/quiz?pack=${pack2.id}`}
              className={styles.primary}
              style={{ textDecoration: 'none' }}
            >
              {t('study.startPackQuiz')}
            </Link>
          )}
          {banks.length > 0 && (
            <Link
              to={`/study/exam?pack=${pack2.id}`}
              className={styles.secondary}
              style={{ textDecoration: 'none' }}
            >
              {t('study.packExamStart')}
            </Link>
          )}
          {adelHref && (
            <Link to={adelHref} className={styles.secondary} style={{ textDecoration: 'none' }}>
              {t('study.askAdel')}
            </Link>
          )}
          {flaggedCount > 0 && (
            <Link
              to="/study/quiz?review=flagged"
              className={styles.secondary}
              style={{ textDecoration: 'none' }}
            >
              {t('study.reviewFlagged', { n: flaggedCount })}
            </Link>
          )}
        </div>
      </header>

      {banks.length > 0 && (
        <section className={styles.packSection}>
          <h2 className={styles.packSectionHead}>{t('study.packInside')}</h2>
          <ul className={styles.packCards}>
            {banks.map((b) => {
              const best = quizBest[b.id];
              const bankFlags = flagged[b.id]?.length ?? 0;
              return (
                <li key={b.id} className={styles.packCard}>
                  <div className={styles.packCardHead}>
                    <span className={styles.bankTitle}>{b.title}</span>
                    <span className={styles.packCardMeta}>
                      <span>{t('study.questions', { n: b.questions.length })}</span>
                      {best != null && (
                        <span className={styles.packCardBest}>
                          {t('study.best', { pct: best })}
                        </span>
                      )}
                    </span>
                  </div>
                  {best != null && (
                    <div className={styles.packCardBar}>
                      <ProgressBar percent={best} label={b.title} />
                    </div>
                  )}
                  <span className={styles.packActions}>
                    <Link to={`/study/quiz?bank=${b.id}`} className={styles.packChip}>
                      {t('study.quiz')}
                    </Link>
                    <Link to={`/study/flashcards?bank=${b.id}`} className={styles.packChip}>
                      {t('study.flashcards')}
                    </Link>
                  </span>
                  {bankFlags > 0 && (
                    <Link to="/study/quiz?review=flagged" className={styles.packFlagChip}>
                      ★ {t('study.reviewFlagged', { n: bankFlags })}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {reading.length > 0 && (
        <section className={styles.packSection}>
          <h2 className={styles.packSectionHead}>{t('study.packReading')}</h2>
          <p className={styles.subtitle}>{t('study.packReadingDesc')}</p>
          <ul className={styles.readingList}>
            {reading.map((d) => (
              <li key={d.slug}>
                <Link to={`/library/reference/${d.slug}`} className={styles.readingRow}>
                  {d.badge && <span className={styles.readingBadge}>{d.badge}</span>}
                  <span className={styles.readingMain}>
                    <span className={styles.readingTitle}>{d.title}</span>
                    {d.sections != null && (
                      <span className={styles.readingMeta}>
                        {t('study.sections', { n: d.sections })}
                      </span>
                    )}
                  </span>
                  <span className={styles.readingArrow} aria-hidden="true">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {modules.length > 0 && (
        <section className={styles.packSection}>
          <h2 className={styles.packSectionHead}>{t('study.groundschool')}</h2>
          <ul className={styles.banks}>
            {modules.map((m) => (
              <li key={m.id}>
                <Link to="/study/groundschool" className={styles.bank}>
                  <span className={styles.bankTitle}>{m.title}</span>
                  <span className={styles.bankDesc}>{m.summary}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {readingPaths.length > 0 && (
        <section className={styles.packSection}>
          <h2 className={styles.packSectionHead}>{t('study.paths')}</h2>
          <ul className={styles.banks}>
            {readingPaths.map((p) => (
              <li key={p.id}>
                <Link to="/study/paths" className={styles.bank}>
                  <span className={styles.bankTitle}>{p.title}</span>
                  <span className={styles.bankDesc}>{p.desc}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {sheets.length > 0 && (
        <section className={styles.packSection}>
          <h2 className={styles.packSectionHead}>{t('study.sheets')}</h2>
          <ul className={styles.banks}>
            {sheets.map((d) => (
              <li key={d.slug}>
                <Link to="/study/sheets" className={styles.bank}>
                  <span className={styles.bankTitle}>{d.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className={styles.footnote}>
        <Disclaimer compact />
      </div>
    </section>
  );
}

/** Total questions across a pack's banks — for the locked page's "what's inside". */
function countQuestions(data: QuizData | null | undefined, bankIds: string[]): number {
  if (!data) return 0;
  return bankIds.reduce(
    (n, id) => n + (data.banks.find((b) => b.id === id)?.questions.length ?? 0),
    0,
  );
}
