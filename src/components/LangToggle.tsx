import { useTranslation } from 'react-i18next';
import type { Lang } from '../i18n';

/** Bilingual toggle. Shows the *other* language's glyph (ع on EN, EN on AR),
 *  matching the legacy .lang-toggle button. */
export function LangToggle({ className }: { className?: string }) {
  const { i18n, t } = useTranslation();
  const next: Lang = i18n.language === 'ar' ? 'en' : 'ar';

  return (
    <button
      type="button"
      className={className}
      aria-label={t('common.switchLanguage')}
      onClick={() => void i18n.changeLanguage(next)}
    >
      {t('common.langToggleLabel')}
    </button>
  );
}
