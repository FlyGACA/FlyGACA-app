import { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Header } from './Header';
import { Footer } from './Footer';
import { RouteFallback } from './RouteFallback';
import { CommandPaletteProvider } from '../components/command/CommandPaletteProvider';
import { PwaPrompts } from '../components/pwa/PwaPrompts';

/** The shared chrome: header + routed page + footer. Replaces the legacy
 *  build-chrome.js stamper — the chrome is now a component, never copied.
 *  The Suspense boundary covers lazily code-split route chunks.
 *  The keyed wrapper div restarts the global page-enter CSS animation on
 *  every route change — zero bundle cost, prefers-reduced-motion aware. */
export function Layout() {
  const { t } = useTranslation();
  const location = useLocation();

  return (
    <CommandPaletteProvider>
      <a className="skip-link" href="#main">
        {t('common.skipToContent')}
      </a>
      <Header />
      <main id="main">
        <div key={location.pathname} className="page-enter">
          <Suspense fallback={<RouteFallback />}>
            <Outlet />
          </Suspense>
        </div>
      </main>
      <Footer />
      <PwaPrompts />
    </CommandPaletteProvider>
  );
}
