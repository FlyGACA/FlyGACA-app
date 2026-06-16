import { Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Header } from './Header';
import { Footer } from './Footer';

/** The shared chrome: header + routed page + footer. Replaces the legacy
 *  build-chrome.js stamper — the chrome is now a component, never copied. */
export function Layout() {
  const { t } = useTranslation();
  return (
    <>
      <a className="skip-link" href="#main">
        {t('common.skipToContent')}
      </a>
      <Header />
      <main id="main">
        <Outlet />
      </main>
      <Footer />
    </>
  );
}
