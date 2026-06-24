import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SectionHeader } from '../../components/SectionHeader';
import { readingMinutes } from '../../lib/readingTime';
import { useGuidePrefs, toggleBookmark } from '../../lib/guidePrefs';
import {
  LIVE_GUIDE_SLUGS,
  GUIDE_META,
  GUIDE_TOPICS,
  type GuideLevel,
  type GuideTopic,
} from './guides';
import styles from './Guides.module.css';

interface Section {
  h: string;
  p: string;
}

const TOPIC_ICON: Record<GuideTopic, string> = {
  regulation: '📋',
  licensing: '🪪',
  medical: '🩺',
  language: '🗣️',
  airspace: '🗺️',
  operations: '🛫',
  performance: '📈',
  weather: '🌦️',
  planning: '🗓️',
};

const TOPIC_TONE: Record<GuideTopic, string> = {
  regulation: 'var(--cat-4)',
  licensing: 'var(--cat-1)',
  medical: 'var(--cat-2)',
  language: 'var(--cat-3)',
  airspace: 'var(--cat-4)',
  operations: 'var(--cat-5)',
  performance: 'var(--cat-2)',
  weather: 'var(--cat-5)',
  planning: 'var(--cat-1)',
};

const LEVELS: GuideLevel[] = ['beginner', 'intermediate', 'advanced'];
const LEVEL_ORDER: Record<GuideLevel, number> = { beginner: 0, intermediate: 1, advanced: 2 };

/** Sort orders; 'topic' keeps the grouped-by-collection view, the rest go flat. */
type SortKey = 'topic' | 'title' | 'time' | 'level';
const SORTS: SortKey[] = ['topic', 'title', 'time', 'level'];

/** Grid vs list layout, persisted across visits (mirrors the Library hub). */
type ViewMode = 'grid' | 'list';
const VIEW_KEY = 'flygaca:guides-view';
function readView(): ViewMode {
  try {
    return localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'grid';
  } catch {
    return 'grid';
  }
}

interface GuidesBrowserProps {
  /** Live search value (owned by the Learn hub so the hero search drives it). */
  query: string;
  /** Active topic filter (controlled by the hub so the hero chips can set it). */
  topic: GuideTopic | 'all';
  onTopicChange: (topic: GuideTopic | 'all') => void;
}

/**
 * The Guides browsing surface: topic/level filters, sort + grid/list toolbar, and
 * the grouped/flat card grid with the Saved row. Extracted from the former Guides
 * hub so the Learn hub can compose it under a shared SearchHero alongside the
 * study dashboard. `query` and `topic` are lifted to the hub; level/sort/view stay
 * local.
 */
export function GuidesBrowser({ query, topic, onTopicChange }: GuidesBrowserProps) {
  const { t } = useTranslation();
  const [level, setLevel] = useState<GuideLevel | 'all'>('all');
  const [sort, setSort] = useState<SortKey>('topic');
  const [view, setView] = useState<ViewMode>(readView);
  const { bookmarks, read } = useGuidePrefs();
  const q = query.trim().toLowerCase();

  // Persist the chosen view so it survives reloads.
  useEffect(() => {
    try {
      localStorage.setItem(VIEW_KEY, view);
    } catch {
      /* storage unavailable — keep in-memory */
    }
  }, [view]);

  const guides = useMemo(
    () =>
      LIVE_GUIDE_SLUGS.map((slug) => {
        const name = t(`guides.items.${slug}.name`);
        const blurb = t(`guides.items.${slug}.blurb`);
        const intro = t(`guides.items.${slug}.intro`);
        const sections = t(`guides.items.${slug}.sections`, { returnObjects: true }) as Section[];
        const takeaways = t(`guides.items.${slug}.takeaways`, { returnObjects: true }) as string[];
        const text = [intro, ...sections.flatMap((s) => [s.h, s.p]), ...takeaways].join(' ');
        return {
          slug,
          name,
          blurb,
          sectionCount: sections.length,
          minutes: readingMinutes(text),
          topic: GUIDE_META[slug].topic,
          level: GUIDE_META[slug].level,
          haystack: `${name} ${blurb} ${text}`.toLowerCase(),
        };
      }),
    [t],
  );

  type GuideRow = (typeof guides)[number];

  const filtered = guides.filter(
    (g) =>
      (topic === 'all' || g.topic === topic) &&
      (level === 'all' || g.level === level) &&
      (!q || g.haystack.includes(q)),
  );

  // 'topic' renders the grouped-by-collection view; every other sort is a flat,
  // sorted list. Grouping only kicks in with no active search/filter.
  const grouped = sort === 'topic' && topic === 'all' && level === 'all' && !q;
  const sortedFlat = useMemo(() => {
    const arr = [...filtered];
    if (sort === 'title') arr.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === 'time')
      arr.sort((a, b) => a.minutes - b.minutes || a.name.localeCompare(b.name));
    else if (sort === 'level')
      arr.sort(
        (a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level] || a.name.localeCompare(b.name),
      );
    return arr;
    // filtered is derived from these inputs; recompute when any changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guides, topic, level, q, sort]);

  const groups = GUIDE_TOPICS.map((tp) => ({
    topic: tp,
    items: filtered.filter((g) => g.topic === tp),
  })).filter((grp) => grp.items.length > 0);

  const saved = grouped ? guides.filter((g) => bookmarks.includes(g.slug)) : [];
  const readCount = read.length;

  const card = (g: GuideRow) => {
    const isSaved = bookmarks.includes(g.slug);
    const isRead = read.includes(g.slug);
    return (
      <li key={g.slug} className={styles.cardWrap}>
        <button
          type="button"
          className={`${styles.star} ${isSaved ? styles.starOn : ''}`}
          aria-label={t(isSaved ? 'guides.unbookmark' : 'guides.bookmark')}
          aria-pressed={isSaved}
          onClick={() => toggleBookmark(g.slug)}
        >
          {isSaved ? '★' : '☆'}
        </button>
        <Link to={`/guides/${g.slug}`} className={styles.card}>
          <h3 className={styles.cardTitle}>{g.name}</h3>
          <p className={styles.blurb}>{g.blurb}</p>
          <span className={styles.metaRow}>
            <span className={styles.level} data-level={g.level}>
              {t(`guides.level.${g.level}`)}
            </span>
            <span className={styles.metaDim}>{t('guides.readTime', { min: g.minutes })}</span>
            <span className={styles.metaDim}>
              {t('guides.sectionCount', { count: g.sectionCount })}
            </span>
            {isRead && (
              <span className={styles.readBadge}>
                <span aria-hidden="true">✓</span> {t('guides.readDone')}
              </span>
            )}
          </span>
        </Link>
      </li>
    );
  };

  // Compact list row — same guide, denser for scanning.
  const row = (g: GuideRow) => {
    const isSaved = bookmarks.includes(g.slug);
    const isRead = read.includes(g.slug);
    return (
      <li key={g.slug} className={styles.rowWrap}>
        <Link to={`/guides/${g.slug}`} className={styles.row}>
          <span className={styles.rowLevel} data-level={g.level}>
            {t(`guides.level.${g.level}`)}
          </span>
          <span className={styles.rowTitle}>{g.name}</span>
          <span className={styles.rowMeta}>{t('guides.readTime', { min: g.minutes })}</span>
          <span className={styles.rowMeta}>
            {t('guides.sectionCount', { count: g.sectionCount })}
          </span>
          {isRead && (
            <span className={styles.rowRead}>
              <span aria-hidden="true">✓</span> {t('guides.readDone')}
            </span>
          )}
        </Link>
        <button
          type="button"
          className={`${styles.rowStar} ${isSaved ? styles.starOn : ''}`}
          aria-label={t(isSaved ? 'guides.unbookmark' : 'guides.bookmark')}
          aria-pressed={isSaved}
          onClick={() => toggleBookmark(g.slug)}
        >
          {isSaved ? '★' : '☆'}
        </button>
      </li>
    );
  };

  const renderDoc = (g: GuideRow) => (view === 'list' ? row(g) : card(g));
  const listClass = `${styles.grid} ${view === 'list' ? styles.list : ''} stagger-grid`;

  return (
    <>
      <div className={styles.filters}>
        <div className={styles.chips} role="group" aria-label={t('guides.title')}>
          <button
            type="button"
            className={`${styles.chip} ${topic === 'all' ? styles.chipActive : ''}`}
            onClick={() => onTopicChange('all')}
          >
            {t('guides.allTopics')}
          </button>
          {GUIDE_TOPICS.map((tp) => (
            <button
              key={tp}
              type="button"
              className={`${styles.chip} ${topic === tp ? styles.chipActive : ''}`}
              onClick={() => onTopicChange(tp)}
            >
              <span aria-hidden="true">{TOPIC_ICON[tp]}</span> {t(`guides.topics.${tp}`)}
            </button>
          ))}
        </div>
        <div className={styles.chips} role="group" aria-label={t('guides.levelLabel')}>
          <button
            type="button"
            className={`${styles.chip} ${level === 'all' ? styles.chipActive : ''}`}
            onClick={() => setLevel('all')}
          >
            {t('guides.allLevels')}
          </button>
          {LEVELS.map((lv) => (
            <button
              key={lv}
              type="button"
              className={`${styles.chip} ${level === lv ? styles.chipActive : ''}`}
              onClick={() => setLevel(lv)}
            >
              {t(`guides.level.${lv}`)}
            </button>
          ))}
        </div>

        <div className={styles.toolbar}>
          <p className={styles.progress} role="status">
            {t('guides.readProgress', { done: readCount, total: LIVE_GUIDE_SLUGS.length })}
          </p>
          <div className={styles.toolbarEnd}>
            <label className={styles.sortField}>
              <span className={styles.sortLabel}>{t('guides.sortBy')}</span>
              <select
                className={styles.sortSelect}
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
              >
                {SORTS.map((s) => (
                  <option key={s} value={s}>
                    {t(`guides.sort.${s}`)}
                  </option>
                ))}
              </select>
            </label>
            <div className={styles.viewToggle} role="group" aria-label={t('guides.view')}>
              <button
                type="button"
                className={`${styles.viewBtn} ${view === 'grid' ? styles.viewBtnActive : ''}`}
                aria-pressed={view === 'grid'}
                aria-label={t('guides.viewGrid')}
                title={t('guides.viewGrid')}
                onClick={() => setView('grid')}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <rect x="3" y="3" width="8" height="8" rx="1.5" />
                  <rect x="13" y="3" width="8" height="8" rx="1.5" />
                  <rect x="3" y="13" width="8" height="8" rx="1.5" />
                  <rect x="13" y="13" width="8" height="8" rx="1.5" />
                </svg>
              </button>
              <button
                type="button"
                className={`${styles.viewBtn} ${view === 'list' ? styles.viewBtnActive : ''}`}
                aria-pressed={view === 'list'}
                aria-label={t('guides.viewList')}
                title={t('guides.viewList')}
                onClick={() => setView('list')}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <rect x="3" y="4" width="18" height="3" rx="1.5" />
                  <rect x="3" y="10.5" width="18" height="3" rx="1.5" />
                  <rect x="3" y="17" width="18" height="3" rx="1.5" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className={styles.empty} role="status">
          {t('guides.empty')}
        </p>
      ) : grouped ? (
        <>
          {saved.length > 0 && (
            <section className={styles.group}>
              <SectionHeader
                title={`★ ${t('guides.saved')}`}
                tone="var(--gold)"
                count={t('guides.guideCount', { count: saved.length })}
              />
              <ul className={listClass}>{saved.map(renderDoc)}</ul>
            </section>
          )}
          {groups.map((grp) => (
            <section key={grp.topic} className={styles.group}>
              <SectionHeader
                title={`${TOPIC_ICON[grp.topic]} ${t(`guides.topics.${grp.topic}`)}`}
                tone={TOPIC_TONE[grp.topic]}
                count={t('guides.guideCount', { count: grp.items.length })}
              />
              <ul className={listClass}>{grp.items.map(renderDoc)}</ul>
            </section>
          ))}
        </>
      ) : (
        <ul className={listClass}>{sortedFlat.map(renderDoc)}</ul>
      )}
    </>
  );
}
