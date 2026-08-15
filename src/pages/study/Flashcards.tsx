import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useFetchJson } from '@/hooks/useFetchJson';
import type { QuizBank, QuizData, QuizQuestion } from '@/lib/content';
import { useStudyProgress, gradeCard } from '@/lib/studyProgress';
import { dueKeys, type SrsEntry } from '@/calc/study/srs';
import { glidePathBins } from '@/calc/study/glidePath';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { GlidePathStrip } from '@/components/study/GlidePathStrip';
import { usePageMeta } from '@/hooks/usePageMeta';
import { courseLd } from '@/lib/seo/jsonld';
import { ProgressBar } from '@/components/ProgressBar';
import { HubBackLink } from '@/components/HubBackLink';
import styles from './Study.module.css';
import { shuffle } from '@/calc/study/shuffle';

export function Flashcards() {
  const { t, i18n } = useTranslation();
  usePageMeta(
    t('meta.flashcards'),
    t('metaDesc.flashcards'),
    courseLd({
      title: t('meta.flashcards'),
      description: t('metaDesc.flashcards'),
      path: '/study/flashcards',
      lang: i18n.language,
    }),
  );
  const [reload, setReload] = useState(0);
  const { data, error, loading } = useFetchJson<QuizData>('/data/quiz.json', reload);
  const [params, setParams] = useSearchParams();

  const [category, setCategory] = useState<string>('all');

  const categories = [
    { id: 'all', label: t('study.filterAll') },
    { id: 'part61', label: t('study.filterPart61') },
    { id: 'part91', label: t('study.filterPart91') },
    { id: 'part121_135', label: t('study.filterPart121_135') },
    { id: 'saelpt', label: t('study.filterSaelpt') },
  ];

  const filteredBanks = useMemo(() => {
    if (!data) return [];
    if (category === 'all') return data.banks;
    if (category === 'part61') return data.banks.filter((b) => b.source.includes('Part 61'));
    if (category === 'part91') return data.banks.filter((b) => b.source.includes('Part 91'));
    if (category === 'part121_135')
      return data.banks.filter(
        (b) => b.source.includes('Part 121') || b.source.includes('Part 135'),
      );
    if (category === 'saelpt')
      return data.banks.filter(
        (b) =>
          b.id.includes('saelpt') || b.source.includes('Doc 9835') || b.source.includes('Annex 1'),
      );
    return data.banks;
  }, [data, category]);

  // Deep-link straight into one bank's deck via ?bank=<id>
  const deepLinkedBank = useMemo(() => {
    if (!data) return null;
    const id = params.get('bank');
    return id ? data.banks.find((b) => b.id === id) : null;
  }, [data, params]);

  if (loading)
    return <section className={`container-narrow ${styles.page}`}>{t('common.loading')}</section>;
  if (error || !data)
    return (
      <section className={`container-narrow ${styles.page}`}>
        <div className={styles.errorBox} role="alert">
          <p>{t('common.loadError')}</p>
          <button type="button" className={styles.primary} onClick={() => setReload((r) => r + 1)}>
            {t('library.retry')}
          </button>
        </div>
      </section>
    );

  if (deepLinkedBank) {
    return (
      <Deck
        banks={[deepLinkedBank]}
        onBack={() => {
          setParams({}, { replace: true });
        }}
      />
    );
  }

  return (
    <section className={`container-narrow ${styles.page}`}>
      <HubBackLink to="/learn?tab=practice" label={t('nav.learn')} />
      <h1>{t('study.flashcards')}</h1>

      <div className={styles.categoryFilters}>
        {categories.map((c) => (
          <button
            key={c.id}
            className={`${styles.categoryBtn} ${category === c.id ? styles.categoryBtnActive : ''}`}
            onClick={() => setCategory(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>

      {filteredBanks.length > 0 ? (
        <Deck banks={filteredBanks} onBack={() => {}} hideBack />
      ) : (
        <p>No cards found for this category.</p>
      )}
    </section>
  );
}

type Card = QuizQuestion & { key: string; bankId: string };

function Deck({
  banks,
  onBack,
  hideBack,
}: {
  banks: QuizBank[];
  onBack: () => void;
  hideBack?: boolean;
}) {
  const { t } = useTranslation();
  const { fcSrs } = useStudyProgress();
  const reduce = usePrefersReducedMotion();

  const allCards: Card[] = useMemo(
    () =>
      banks.flatMap((b) => b.questions.map((c, idx) => ({ ...c, key: String(idx), bankId: b.id }))),
    [banks],
  );

  const initial = useMemo(() => {
    const due = allCards.filter((c) => {
      const srs = fcSrs[c.bankId] ?? {};
      const keys = dueKeys(srs, [c.key], new Date());
      return keys.length > 0;
    });
    return shuffle(due.length ? due : allCards);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [banks]);

  const [queue, setQueue] = useState<Card[]>(initial);
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [got, setGot] = useState(0);
  const [again, setAgain] = useState<Card[]>([]);
  const [leaving, setLeaving] = useState<'known' | 'again' | null>(null);

  const card = queue[i];
  const done = i >= queue.length;

  function grade(correct: boolean) {
    if (leaving) return;
    gradeCard(card.bankId, card.key, correct);
    if (correct) setGot((n) => n + 1);
    else setAgain((r) => [...r, card]);
    if (reduce) advance();
    else setLeaving(correct ? 'known' : 'again');
  }

  function advance() {
    setLeaving(null);
    setFlipped(false);
    setI((n) => n + 1);
  }

  useEffect(() => {
    if (done) return;
    const onKey = (e: KeyboardEvent) => {
      if (leaving) return;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        setFlipped((f) => !f);
      } else if (flipped && (e.key === 'ArrowRight' || e.key === '1')) {
        e.preventDefault();
        grade(true);
      } else if (flipped && (e.key === 'ArrowLeft' || e.key === '2')) {
        e.preventDefault();
        grade(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flipped, done, i, leaving]);

  function restart(cards: Card[]) {
    setQueue(shuffle(cards));
    setI(0);
    setFlipped(false);
    setGot(0);
    setAgain([]);
    setLeaving(null);
  }

  const mergedSrs = useMemo(() => {
    const merged: Record<string, SrsEntry> = {};
    for (const c of allCards) {
      const srs = fcSrs[c.bankId] ?? {};
      if (srs[c.key]) {
        merged[`${c.bankId}:${c.key}`] = srs[c.key];
      }
    }
    return merged;
  }, [allCards, fcSrs]);

  return (
    <>
      {!hideBack && (
        <button type="button" className={styles.back} onClick={onBack}>
          ← {t('study.back')}
        </button>
      )}
      {done ? (
        <div className={styles.result} role="status">
          <p>{t('study.deckDone', { known: got, review: again.length })}</p>
          <div className={styles.resultActions}>
            <button type="button" className={styles.primary} onClick={() => restart(allCards)}>
              {t('study.reset')}
            </button>
            {again.length > 0 && (
              <button type="button" className={styles.secondary} onClick={() => restart(again)}>
                {t('study.reviewUnknowns', { n: again.length })}
              </button>
            )}
          </div>
        </div>
      ) : (
        <CardView
          key={`${card.bankId}:${card.key}`}
          card={card}
          flipped={flipped}
          leaving={leaving}
          onFlip={() => {
            if (!leaving) setFlipped((f) => !f);
          }}
          onGrade={grade}
          onLeaveEnd={advance}
          progress={{ done: i + 1, total: queue.length }}
        />
      )}
      <GlidePathStrip
        bins={glidePathBins(
          mergedSrs,
          allCards.map((c) => `${c.bankId}:${c.key}`),
        )}
      />
    </>
  );
}

function CardView({
  card,
  flipped,
  leaving,
  onFlip,
  onGrade,
  onLeaveEnd,
  progress,
}: {
  card: Card;
  flipped: boolean;
  leaving: 'known' | 'again' | null;
  onFlip: () => void;
  onGrade: (correct: boolean) => void;
  onLeaveEnd: () => void;
  progress: { done: number; total: number };
}) {
  const { t } = useTranslation();
  const wrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!leaving) return;
    const el = wrapRef.current;
    if (!el) return;
    const end = () => onLeaveEnd();
    el.addEventListener('animationend', end);
    return () => el.removeEventListener('animationend', end);
  }, [leaving, onLeaveEnd]);
  const wrapperClass = [
    styles.cardWrapper,
    styles.cardEnter,
    leaving === 'known' ? styles.cardLeaveKnown : '',
    leaving === 'again' ? styles.cardLeaveAgain : '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <>
      <p className={styles.qProgress} role="status" aria-live="polite">
        {t('study.progress', { done: progress.done, total: progress.total })}
      </p>
      <ProgressBar percent={Math.round(((progress.done - 1) / progress.total) * 100)} />
      <div
        ref={wrapRef}
        className={wrapperClass}
        role="button"
        tabIndex={0}
        aria-pressed={flipped}
        aria-label={t('study.flipHint')}
        onClick={onFlip}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onFlip();
          }
        }}
      >
        <div className={`${styles.cardInner} ${flipped ? styles.flippedCard : ''}`}>
          <div className={styles.cardFront}>
            <span className={styles.cardQ}>{card.q}</span>
            <span className={styles.cardFlipHint}>{t('study.flipHint')}</span>
          </div>
          <div className={styles.cardBack}>
            <span className={styles.cardA}>
              <strong>{card.options[card.answer]}</strong>
              <span className={styles.cardExplain}>{card.explain}</span>
            </span>
          </div>
        </div>
      </div>
      {!flipped ? (
        <button type="button" className={styles.primary} onClick={onFlip}>
          {t('study.flip')}
        </button>
      ) : (
        <div className={styles.markRow}>
          <button
            type="button"
            className={`${styles.mark} ${styles.markReview}`}
            onClick={() => onGrade(false)}
            disabled={leaving != null}
          >
            {t('study.again')}
          </button>
          <button
            type="button"
            className={`${styles.mark} ${styles.markKnown}`}
            onClick={() => onGrade(true)}
            disabled={leaving != null}
          >
            {t('study.gotIt')}
          </button>
        </div>
      )}
    </>
  );
}
