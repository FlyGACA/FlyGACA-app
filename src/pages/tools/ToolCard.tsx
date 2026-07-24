import type { CSSProperties, ReactElement } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Star } from '@phosphor-icons/react';
import type { ToolMeta } from '@/lib/tools';
import { toggleFavorite, pushRecent } from '@/lib/prefs/toolPrefs';
import { CategoryIcon } from '@/lib/toolIcons';
import type { ViewMode } from '@/hooks/useViewMode';
import styles from './ToolsIndex.module.css';
import hub from '@/components/hub/hubList.module.css';

/** Split text on a case-insensitive needle, wrapping matches in <mark>. */
function highlight(text: string, needle: string) {
  const n = needle.trim().toLowerCase();
  if (!n) return text;
  const lower = text.toLowerCase();
  const out: (string | ReactElement)[] = [];
  let i = 0;
  let hit = lower.indexOf(n);
  let k = 0;
  while (hit !== -1) {
    if (hit > i) out.push(text.slice(i, hit));
    out.push(<mark key={k++}>{text.slice(hit, hit + n.length)}</mark>);
    i = hit + n.length;
    hit = lower.indexOf(n, i);
  }
  if (i < text.length) out.push(text.slice(i));
  return out;
}

export function ToolCard({
  tool,
  tone,
  query,
  favorite,
  view,
  featured = false,
}: {
  tool: ToolMeta;
  tone: string;
  query: string;
  favorite: boolean;
  view: ViewMode;
  featured?: boolean;
}) {
  const { t } = useTranslation();
  const live = tool.status === 'live';
  const name = t(`tools.items.${tool.id}.name`);
  const blurb = t(`tools.items.${tool.id}.blurb`);
  const starClass =
    view === 'list'
      ? `${hub.rowStar} ${favorite ? hub.starOn : ''}`
      : `${styles.star} ${favorite ? styles.starOn : ''}`;
  const star = (
    <button
      type="button"
      className={starClass}
      aria-label={t(favorite ? 'tools.unfavorite' : 'tools.favorite')}
      aria-pressed={favorite}
      onClick={() => toggleFavorite(tool.id)}
    >
      <Star size={18} weight={favorite ? 'fill' : 'regular'} aria-hidden />
    </button>
  );

  if (view === 'list') {
    const inner = (
      <>
        <span className={hub.rowBar} aria-hidden="true" />
        <CategoryIcon cat={tool.category} size={18} className={styles.rowIcon} />
        <span className={styles.rowTitle}>{highlight(name, query)}</span>
        {tool.badge === 'new' && live && <span className={styles.badge}>{t('tools.new')}</span>}
        <span className={styles.rowCat}>{t(`tools.categories.${tool.category}`)}</span>
        <span className={styles.rowCta}>{live ? t('tools.open') : t('common.soon')}</span>
      </>
    );
    return (
      <li
        className={`${hub.rowWrap} ${live ? '' : styles.pending}`}
        style={{ '--cat-color': tone } as CSSProperties}
      >
        {live ? (
          <Link
            to={tool.route}
            className={styles.row}
            data-toolcard="1"
            onClick={() => pushRecent(tool.id)}
          >
            {inner}
          </Link>
        ) : (
          <div className={styles.row} aria-disabled="true">
            {inner}
          </div>
        )}
        {star}
      </li>
    );
  }

  const inner = (
    <>
      <span className={styles.catBar} aria-hidden="true" />
      <span className={styles.cardHead}>
        <CategoryIcon cat={tool.category} size={18} className={styles.cardIcon} />
        <h3 className={styles.cardTitle}>{highlight(name, query)}</h3>
        {tool.badge === 'new' && live && <span className={styles.badge}>{t('tools.new')}</span>}
      </span>
      <p className={styles.blurb}>{highlight(blurb, query)}</p>
      <span className={styles.cta}>{live ? t('tools.open') : t('common.soon')}</span>
    </>
  );
  return (
    <li
      className={`${styles.card} ${featured ? styles.cardFeatured : ''} ${live ? '' : styles.pending}`}
      style={{ '--cat-color': tone } as CSSProperties}
    >
      {star}
      {live ? (
        <Link
          to={tool.route}
          className={styles.cardLink}
          data-toolcard="1"
          onClick={() => pushRecent(tool.id)}
        >
          {inner}
        </Link>
      ) : (
        <div className={styles.cardLink} aria-disabled="true">
          {inner}
        </div>
      )}
    </li>
  );
}
