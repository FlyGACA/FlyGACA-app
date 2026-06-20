import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Disclaimer } from '../../components/Disclaimer';
import { SectionHeader } from '../../components/SectionHeader';
import { usePageMeta } from '../../lib/usePageMeta';
import { readingMinutes } from '../../lib/readingTime';
import { GUIDE_SLUGS, GUIDE_META, GUIDE_TOPICS, type GuideLevel, type GuideTopic } from './guides';
import styles from './Guides.module.css';

interface Section {
  h: string;
  p: string;
}

const TOPIC_ICON: Record<GuideTopic, string> = {
  licensing: '🪪',
  medical: '🩺',
  language: '🗣️',
  airspace: '🗺️',
  weather: '🌦️',
  planning: '🗓️',
};

const TOPIC_TONE: Record<GuideTopic, string> = {
  licensing: 'var(--cat-1)',
  medical: 'var(--cat-2)',
  language: 'var(--cat-3)',
  airspace: 'var(--cat-4)',
  weather: 'var(--cat-5)',
  planning: 'var(--cat-1)',
};

const LEVELS: GuideLevel[] = ['beginner', 'intermediate'];

export function GuidesIndex() {
  const { t } = useTranslation();
  usePageMeta(t('meta.guides'));
  const [query, setQuery] = useState('');
  const [topic, setTopic] = useState<GuideTopic | 'all'>('all');
  const [level, setLevel] = useState<GuideLevel | 'all'>('all');
  const q = query.trim().toLowerCase();

  const guides = useMemo(
    () =>
      GUIDE_SLUGS.map((slug) => {
        const name = t(`guides.items.${slug}.name`);
        const blurb = t(`guides.items.${slug}.blurb`);
        const intro = t(`guides.items.${slug}.intro`);
        const sections = t(`guides.items.${slug}.sections`, { returnObjects: true }) as Section[];
        const text = [intro, ...sections.flatMap((s) => [s.h, s.p])].join(' ');
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

  const filtered = guides.filter(
    (g) =>
      (topic === 'all' || g.topic === topic) &&
      (level === 'all' || g.level === level) &&
      (!q || g.haystack.includes(q)),
  );

  const grouped = topic === 'all' && !q;
  const groups = GUIDE_TOPICS.map((tp) => ({
    topic: tp,
    items: filtered.filter((g) => g.topic === tp),
  })).filter((grp) => grp.items.length > 0);

  type GuideRow = (typeof guides)[number];
  const card = (g: GuideRow) => (
    <li key={g.slug}>
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
        </span>
      </Link>
    </li>
  );

  return (
    <section className={`container ${styles.page}`}>
      <header className={styles.head}>
        <h1>{t('guides.title')}</h1>
        <p className={styles.subtitle}>{t('guides.subtitle')}</p>
        <input
          className={styles.search}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('guides.searchPlaceholder')}
          aria-label={t('guides.searchPlaceholder')}
        />
      </header>

      <div className={styles.filters}>
        <div className={styles.chips} role="group" aria-label={t('guides.title')}>
          <button
            type="button"
            className={`${styles.chip} ${topic === 'all' ? styles.chipActive : ''}`}
            onClick={() => setTopic('all')}
          >
            {t('guides.allTopics')}
          </button>
          {GUIDE_TOPICS.map((tp) => (
            <button
              key={tp}
              type="button"
              className={`${styles.chip} ${topic === tp ? styles.chipActive : ''}`}
              onClick={() => setTopic(tp)}
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
      </div>

      {filtered.length === 0 ? (
        <p className={styles.empty} role="status">
          {t('guides.empty')}
        </p>
      ) : grouped ? (
        groups.map((grp) => (
          <section key={grp.topic} className={styles.group}>
            <SectionHeader
              title={`${TOPIC_ICON[grp.topic]} ${t(`guides.topics.${grp.topic}`)}`}
              tone={TOPIC_TONE[grp.topic]}
              count={t('guides.guideCount', { count: grp.items.length })}
            />
            <ul className={`${styles.grid} stagger-grid`}>{grp.items.map(card)}</ul>
          </section>
        ))
      ) : (
        <ul className={`${styles.grid} stagger-grid`}>{filtered.map(card)}</ul>
      )}

      <div className={styles.footnote}>
        <Disclaimer compact />
      </div>
    </section>
  );
}
