import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SearchHero } from '../../components/SearchHero';
import type { HeroStat } from '../../components/SearchHero';
import { Disclaimer } from '../../components/Disclaimer';
import { usePageMeta } from '../../lib/usePageMeta';
import { itemListLd } from '../../lib/jsonld';
import { useFetchJson } from '../../lib/useFetchJson';
import type { GroundSchoolData, QuizData } from '../../lib/content';
import { GuidesBrowser } from '../guides/GuidesBrowser';
import { StudyDashboard, STUDY_MODES } from '../study/StudyDashboard';
import { LIVE_GUIDE_SLUGS, type GuideTopic } from '../guides/guides';
import styles from './Learn.module.css';

type Tab = 'guides' | 'practice';
const TABS: Tab[] = ['guides', 'practice'];

/** Curated quick-pick topics surfaced as chips in the hero (jump into the Guides tab). */
const POPULAR_TOPICS: GuideTopic[] = ['licensing', 'medical', 'airspace', 'weather', 'planning'];

/**
 * The unified "Learn" hub — one search-first hero over a Guides ⇄ Practice
 * segmented control. The Guides tab renders the guide browser; the Practice tab
 * renders the study dashboard. The two former hubs (/guides, /study) redirect here.
 */
export function LearnHub() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get('tab') === 'practice' ? 'practice' : 'guides';
  const setTab = (next: Tab) => {
    const p = new URLSearchParams(params);
    if (next === 'guides') p.delete('tab');
    else p.set('tab', next);
    setParams(p, { replace: true });
  };

  // Guides search + topic filter live here so the shared hero can drive them.
  const [query, setQuery] = useState('');
  const [topic, setTopic] = useState<GuideTopic | 'all'>('all');

  const quiz = useFetchJson<QuizData>('/data/quiz.json');
  const gs = useFetchJson<GroundSchoolData>('/data/groundschool.json');
  const questions = quiz.data?.banks.reduce((s, b) => s + b.questions.length, 0) ?? 0;
  const lessons = gs.data?.modules.reduce((s, m) => s + m.lessons.length, 0) ?? 0;

  // Expose the guides + study modes as one ItemList so the hub reads as a
  // catalog of its leaf pages for crawlers.
  const learnLd = useMemo(
    () =>
      itemListLd([
        ...LIVE_GUIDE_SLUGS.map((slug) => ({
          name: t(`guides.items.${slug}.name`),
          path: `/guides/${slug}`,
        })),
        ...STUDY_MODES.map((m) => ({ name: t(`study.${m.key}`), path: m.to })),
      ]),
    [t],
  );
  usePageMeta(t('meta.learn'), t('metaDesc.learn'), learnLd);

  // Questions/lessons come from async JSON; only surface a stat once its data has
  // loaded so its CountUp mounts with the real figure (and animates to it) instead
  // of locking onto 0 at first paint.
  const stats: HeroStat[] = [
    { label: t('learn.stats.guides'), value: LIVE_GUIDE_SLUGS.length, tone: 'cyan' },
  ];
  if (quiz.data) stats.push({ label: t('learn.stats.questions'), value: questions, tone: 'green' });
  if (gs.data) stats.push({ label: t('learn.stats.lessons'), value: lessons, tone: 'gold' });

  // Typing in the hero filters the guides and lands the user on the Guides tab.
  const handleSearch = (q: string) => {
    setQuery(q);
    if (q && tab !== 'guides') setTab('guides');
  };
  const chips = POPULAR_TOPICS.map((tp) => ({
    label: t(`guides.topics.${tp}`),
    onClick: () => {
      setTopic((cur) => (cur === tp ? 'all' : tp));
      if (tab !== 'guides') setTab('guides');
    },
    active: tab === 'guides' && topic === tp,
  }));

  return (
    <section className={`container ${styles.page}`}>
      <SearchHero
        eyebrow={t('learn.eyebrow')}
        title={t('learn.title')}
        subtitle={t('learn.subtitle')}
        placeholder={t('guides.searchPlaceholder')}
        query={query}
        onQueryChange={handleSearch}
        stats={stats}
        chipsLabel={t('learn.popular')}
        chips={chips}
      />

      <div className={styles.tabs} role="tablist" aria-label={t('learn.title')}>
        {TABS.map((tb) => (
          <button
            key={tb}
            type="button"
            role="tab"
            aria-selected={tab === tb}
            className={`${styles.tab} ${tab === tb ? styles.tabActive : ''}`}
            onClick={() => setTab(tb)}
          >
            {t(`learn.tabs.${tb}`)}
          </button>
        ))}
      </div>

      {tab === 'guides' ? (
        <GuidesBrowser query={query} topic={topic} onTopicChange={setTopic} />
      ) : (
        <StudyDashboard />
      )}

      <div className={styles.footnote}>
        <Disclaimer compact />
      </div>
    </section>
  );
}
