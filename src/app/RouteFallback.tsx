import { useTranslation } from 'react-i18next';

/**
 * Suspense fallback for lazily-loaded routes. Reserves vertical space to avoid
 * layout shift while a route chunk loads, and announces politely for a11y.
 */
export function RouteFallback() {
  const { t } = useTranslation();
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        minBlockSize: '60dvh',
        display: 'grid',
        placeItems: 'center',
        color: 'var(--text-muted)',
      }}
    >
      {t('common.loading')}
    </div>
  );
}
