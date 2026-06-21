import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/** Resets the window scroll to the top on every route change. Without this an
 *  in-place SPA navigation keeps the previous page's scroll offset, so a new
 *  page would open already scrolled down (often at the footer).
 *
 *  Keys on `pathname` only — hash/search changes are left alone so in-page
 *  anchor jumps and query-string calculator state keep working. The jump is
 *  instant (`behavior: 'auto'`) to bypass the global `html { scroll-behavior:
 *  smooth }`, which would otherwise animate a long scroll on every navigation. */
export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname]);

  return null;
}
