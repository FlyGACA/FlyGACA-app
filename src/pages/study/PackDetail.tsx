import { Link, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useFetchJson } from '../../lib/useFetchJson';
import type { GroundSchoolData, PathsIndex, PdfsIndex, QuizData } from '../../lib/content';
import { useStudyProgress } from '../../lib/studyProgress';
import { useFeature } from '../../lib/features';
import { usePageMeta } from '../../lib/usePageMeta';
import { courseLd } from '../../lib/jsonld';
import { Disclaimer } from '../../components/Disclaimer';
import { PACKS, PACKS_GATED } from './packs';
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
  const { quizBest } = useStudyProgress();
  const quiz = useFetchJson<QuizData>('/data/quiz.json');
  const gs = useFetchJson<GroundSchoolData>('/data/groundschool.json');
  const paths = useFetchJson<PathsIndex>('/data/paths-index.json');
  const pdfs = useFetchJson<PdfsIndex>('/data/pdfs-index.json');

  if (!pack) return <NotFound />;

  const locked = PACKS_GATED && pack.pro && !canUsePro;
  if (locked) {
    return (
      <section className={`container ${styles.page}`}>
        <p className={styles.back}>
          <Link to="/study/packs">← {t('study.packs')}</Link>
        </p>
        <h1>{t(`study.packCatalog.${pack.id}.name`)}</h1>
        <p className={styles.subtitle}>{t(`study.packCatalog.${pack.id}.desc`)}</p>
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

  return (
    <section className={`container ${styles.page}`}>
      <p className={styles.back}>
        <Link to="/study/packs">← {t('study.packs')}</Link>
      </p>
      <header className={styles.head}>
        <h1>{t(`study.packCatalog.${pack.id}.name`)}</h1>
        <p className={styles.subtitle}>{t(`study.packCatalog.${pack.id}.desc`)}</p>
      </header>

      {banks.length > 0 && (
        <Link
          to={`/study/quiz?pack=${pack.id}`}
          className={styles.primary}
          style={{ textDecoration: 'none' }}
        >
          {t('study.startPackQuiz')}
        </Link>
      )}

      {banks.length > 0 && (
        <section className={styles.packSection}>
          <h2 className={styles.packSectionHead}>{t('study.quiz')}</h2>
          <ul className={styles.banks}>
            {banks.map((b) => {
              const best = quizBest[b.id];
              return (
                <li key={b.id} className={styles.packRow}>
                  <span className={styles.packRowMain}>
                    <span className={styles.bankTitle}>{b.title}</span>
                    <span className={styles.bankMeta}>
                      {t('study.questions', { n: b.questions.length })}
                      {best != null ? ` · ${t('study.best', { pct: best })}` : ''}
                    </span>
                  </span>
                  <span className={styles.packActions}>
                    <Link to={`/study/quiz?bank=${b.id}`} className={styles.packChip}>
                      {t('study.quiz')}
                    </Link>
                    <Link to={`/study/flashcards?bank=${b.id}`} className={styles.packChip}>
                      {t('study.flashcards')}
                    </Link>
                  </span>
                </li>
              );
            })}
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
