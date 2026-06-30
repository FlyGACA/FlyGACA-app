import { useTranslation } from 'react-i18next';
import { useTheme } from '../lib/theme';

/** Toggles the Cockpit / Night-Ops dark theme (amber on charcoal) on and off.
 *  A toggle button (`aria-pressed`) showing a crescent-moon glyph — "night".
 *  The icon inherits `currentColor`, so it adopts each theme's accent. */
export function ThemeToggle({ className }: { className?: string }) {
  const { t } = useTranslation();
  const [theme, setTheme] = useTheme();
  const isCockpit = theme === 'cockpit';

  return (
    <button
      type="button"
      className={className}
      aria-label={t('common.toggleTheme')}
      aria-pressed={isCockpit}
      onClick={() => setTheme(isCockpit ? 'falcon' : 'cockpit')}
    >
      <svg
        viewBox="0 0 24 24"
        width="20"
        height="20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
      </svg>
    </button>
  );
}
