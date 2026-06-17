import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { Header } from './Header';
import { Footer } from './Footer';
import { RouteFallback } from './RouteFallback';

/** The shared chrome: header + routed page + footer. Replaces the legacy
 *  build-chrome.js stamper — the chrome is now a component, never copied.
 *  The Suspense boundary covers lazily code-split route chunks. */
export function Layout() {
  const { t } = useTranslation();
  return (
    <>
      <a className="skip-link" href="#main">
        {t('common.skipToContent')}
      </a>
      <Header />
      <main id="main">
        <Suspense fallback={<RouteFallback />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <SpeedInsights />
    </>
  );
}
