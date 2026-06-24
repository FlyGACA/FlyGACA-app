import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CountUp } from '../../components/CountUp';
import styles from './LibraryHero.module.css';

/** One animated stat in the hero readout strip. */
export interface HeroStat {
  /** Translated label, e.g. "Documents". */
  label: string;
  /** The figure to count up to. */
  value: number;
  /** Neon accent token driving the tile's glow. */
  tone: 'cyan' | 'green' | 'gold';
}

interface LibraryHeroProps {
  /** Live search value (lifted from the page so debounce + full-text stay in Library). */
  query: string;
  onQueryChange: (q: string) => void;
  /** Per-corpus animated figures (Documents / Pages|Sections / Collections). */
  stats: HeroStat[];
  /** Quick-search seed terms shown as chips below the input. */
  suggestions: string[];
}

const TONE_VAR: Record<HeroStat['tone'], string> = {
  cyan: 'var(--neon-cyan)',
  green: 'var(--neon-green)',
  gold: 'var(--gold)',
};

/**
 * Search-first Library hero. The signature falcon-stroke band, but with the
 * search field promoted to the centerpiece (the page's primary task), quick-search
 * chips, and an instrument-style stats readout that counts up on first paint.
 * Purely presentational — all search state lives in Library.tsx.
 */
export function LibraryHero({ query, onQueryChange, stats, suggestions }: LibraryHeroProps) {
  const { t } = useTranslation();

  return (
    <header className={styles.hero}>
      <div className={styles.glow} aria-hidden="true" />
      <div className={styles.inner}>
        <p className={styles.eyebrow}>{t('library.eyebrow')}</p>
        <h1 className={styles.title}>{t('library.title')}</h1>
        <p className={styles.subtitle}>{t('library.subtitle')}</p>

        <form className={styles.searchForm} role="search" onSubmit={(e) => e.preventDefault()}>
          <span className={styles.searchIcon} aria-hidden="true">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor">
              <circle cx="11" cy="11" r="7" strokeWidth="2" />
              <path d="m20 20-3.5-3.5" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </span>
          <input
            className={styles.search}
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={t('library.searchPlaceholder')}
            aria-label={t('library.searchPlaceholder')}
            autoComplete="off"
          />
          {query && (
            <button
              type="button"
              className={styles.clear}
              aria-label={t('common.clear')}
              onClick={() => onQueryChange('')}
            >
              ×
            </button>
          )}
        </form>

        {suggestions.length > 0 && (
          <div className={styles.suggest}>
            <span className={styles.suggestLabel}>{t('library.popular')}</span>
            <ul className={styles.suggestList}>
              {suggestions.map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    className={styles.suggestChip}
                    onClick={() => onQueryChange(s)}
                  >
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className={styles.afterRow}>
          <dl className={styles.stats}>
            {stats.map((s) => (
              <div
                key={s.label}
                className={styles.stat}
                style={{ '--stat-tone': TONE_VAR[s.tone] } as CSSProperties}
              >
                <dt className={styles.statLabel}>{s.label}</dt>
                <dd className={styles.statValue}>
                  <CountUp to={s.value} />
                </dd>
              </div>
            ))}
          </dl>
          <Link className={styles.chartsLink} to="/library/charts">
            {t('library.viewCharts')} →
          </Link>
        </div>
      </div>
    </header>
  );
}
