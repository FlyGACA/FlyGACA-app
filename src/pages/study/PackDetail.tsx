import { Link, useParams } from 'react-router';
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
import { useFeature } from '../../lib/features';
import { usePageMeta } from '../../lib/usePageMeta';
import { courseLd } from '../../lib/jsonld';
import { adelLink } from '../../lib/adel';
import { Disclaimer } from '../../components/Disclaimer';
import { ProgressBar } from '../../components/ProgressBar';
import { PACKS, PACKS_GATED } from './packCatalog';
import { NotFound } from '../NotFound';
import styles from './Study.module.css';

export function PackDetail() {
  const { t, i18n } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const pack = PACKS.find((p) => p.id === id);

  // A study pack is a curated, free course. An unknown id renders <NotFound/>, so
  // noindex it here (this hook runs before that early return).
  usePageMeta(
    pack ? t(`study.packCatalog.${pack.id}.name`) : undefined,
    pack ? t(`study.packCatalog.${pack.id}.desc`) : undefined,
    pack
      ? courseLd({
          title: t(`study.packCatalog.${pack.id}.name`),
          description: t(`study.packCatalog.${pack.id}.desc`),
          path: `/study/packs/${pack.id}`,
          lang: i18n.language,
        })
      : undefined,
    pack ? undefined : { noindex: true },
  );

  const canUsePro = useFeature('prep-packs');
  const { quizBest, flagged, exam } = useStudyProgress();
  const quiz = useFetchJson<QuizData>('/data/quiz.json');
  const gs = useFetchJson<GroundSchoolData>('/data/groundschool.json');
  const paths = useFetchJson<PathsIndex>('/data/paths-index.json');
  const pdfs = useFetchJson<PdfsIndex>('/data/pdfs-index.json');
  const refs = useFetchJson<CorpusIndex>('/data/reference-index.json');

  if (!pack) return <NotFound />;

  const packName = t(`study.packCatalog.${pack.id}.name`);
  const packDesc = t(`study.packCatalog.${pack.id}.desc`);

  const locked = PACKS_GATED && pack.pro && !canUsePro;
  if (locked) {
    return (
      <section className={`container ${styles.page}`}>
        <p className={styles.back}>
          <Link to="/study/packs">← {t('study.packs')}</Link>
        </p>
        <h1>{packName}</h1>
        <p className={styles.subtitle}>{packDesc}</p>
        <Link to="/pricing" className={styles.primary} style={{ textDecoration: 'none' }}>
          {t('study.packGo')}
        </Link>
        <Disclaimer compact />
      </section>
    );
  }

  const banks = (quiz.data?.banks ?? []).filter((b) => pack.bankIds.includes(b.id));
  const modules = (gs.data?.modules ?? []).filter((m) => pack.moduleIds?.includes(m.id));
  const readingPaths = (paths.data?.paths ?? []).filter((p) => pack.pathIds?.includes(p.id));
  const sheets = (pdfs.data?.documents ?? []).filter((d) => pack.sheetSlugs?.includes(d.slug));
  // Keep the pack's own slug order so the reading list reads GEN → ENR, not index order.
  const reading = (pack.librarySlugs ?? [])
    .map((slug) => refs.data?.documents.find((d) => d.slug === slug))
    .filter((d): d is NonNullable<typeof d> => d != null);

  // Overall mastery = mean of each bank's best quiz score (unattempted banks count 0),
  // so the meter reflects progress across the whole pack, not a single good run.
  const mastery = pack.bankIds.length
    ? Math.round(
        pack.bankIds.reduce((sum, bid) => sum + (quizBest[bid] ?? 0), 0) / pack.bankIds.length,
      )
    : 0;
  const flaggedCount = pack.bankIds.reduce((n, bid) => n + (flagged[bid]?.length ?? 0), 0);

  const adelHref = adelLink(t('study.askAdelPrompt', { topic: packName }));

  return (
    <section className={`container ${styles.page}`}>
      <p className={styles.back}>
        <Link to="/study/packs">← {t('study.packs')}</Link>
      </p>

      <header className={styles.packHero}>
        <div className={styles.packHeroTop}>
          <h1>{packName}</h1>
          {pack.pro && <span className={styles.proTag}>{t('study.packPro')}</span>}
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
              to={`/study/quiz?pack=${pack.id}`}
              className={styles.primary}
              style={{ textDecoration: 'none' }}
            >
              {t('study.startPackQuiz')}
            </Link>
          )}
          {adelHref && (
            <Link to={adelHref} className={styles.secondary} style={{ textDecoration: 'none' }}>
              {t('study.askAdel')}
            </Link>
          )}
          <Link to="/study/exam" className={styles.secondary} style={{ textDecoration: 'none' }}>
            {t('study.exam')}
          </Link>
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
