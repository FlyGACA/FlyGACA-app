import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';
import { type Lang } from '../i18n';
import { localePath } from '../lib/seo';

/**
 * Bilingual toggle. A real `<a href>` to the *other* language's URL of the current
 * page (crawlers follow it as the cross-cluster link that ties the hreflang set
 * together). Clicking it is a full navigation, so the router remounts under the
 * matching `basename` and the whole document flips LTR↔RTL. `useLocation().pathname`
 * is the logical (basename-stripped) path, so `localePath` rebuilds the alternate.
import { canonicalUrl, normalizePath } from '../lib/seo';

/**
 * Bilingual toggle. Shows the *other* language's glyph (ع on EN, EN on AR),
 * matching the legacy .lang-toggle button. The Arabic variant lives at a real
 * `/ar` URL, so switching language crosses the router basename — a real
 * navigation, not a client toggle. Rendered as an `<a>` so the link between the
 * English and Arabic documents is crawlable (reinforcing hreflang), and so a
 * full load boots the target page in the right language via its URL prefix.
 */
export function LangToggle({ className }: { className?: string }) {
  const { i18n, t } = useTranslation();
  const { pathname, search, hash } = useLocation();
  const next: Lang = i18n.language === 'ar' ? 'en' : 'ar';
  const href = `${localePath(pathname, next)}${search}${hash}`;

  // `pathname` is basename-stripped (logical path); build the target language's
  // absolute path from it. canonicalUrl returns an origin-absolute URL, so take
  // just the path portion to keep the link same-origin/relative.
  const href = `${new URL(canonicalUrl(normalizePath(pathname), next)).pathname}${search}${hash}`;

  return (
    <a className={className} href={href} hrefLang={next} aria-label={t('common.switchLanguage')}>
    <a className={className} aria-label={t('common.switchLanguage')} href={href}>
      {t('common.langToggleLabel')}
    </a>
  );
}
