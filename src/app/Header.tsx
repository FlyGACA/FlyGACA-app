import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LangToggle } from '../components/LangToggle';
import { openCommandPalette } from '../components/CommandPalette/openCommandPalette';
import styles from './Header.module.css';

interface NavItem {
  to: string;
  key: string;
}

// Routes that are live in this build link internally; the rest are placeholders
// pointing at their eventual paths (tracked in MIGRATION.md).
const NAV: NavItem[] = [
  { to: '/library', key: 'nav.library' },
  { to: '/chat', key: 'nav.captainAdel' },
  { to: '/tools', key: 'nav.tools' },
  { to: '/guides', key: 'nav.guides' },
  { to: '/study', key: 'nav.study' },
  { to: '/pricing', key: 'nav.pricing' },
  { to: '/about', key: 'nav.about' },
  { to: '/account', key: 'nav.account' },
];

/** True once the page has scrolled past `threshold`px — drives the header's
 *  elevated state (hairline + shadow appear, background firms up). Passive
 *  listener; the global reduced-motion rule already neutralises the transition. */
function useScrolled(threshold = 8): boolean {
  const [scrolled, setScrolled] = useState(
    () => typeof window !== 'undefined' && window.scrollY > threshold,
  );
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);
  return scrolled;
}

export function Header() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const scrolled = useScrolled();
  const location = useLocation();
  const navRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  // While the drawer is open: lock body scroll, move focus into the drawer and
  // trap Tab within it so focus can't fall behind the overlay, and close on
  // Escape. Focus returns to the toggle when the drawer closes.
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Capture the trigger now so cleanup restores focus to the same node.
    const toggleEl = toggleRef.current;

    const focusables = () =>
      Array.from(
        navRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]') ??
          [],
      ).filter((el) => el.tabIndex !== -1);
    // Defer to the next tick: the drawer transitions out of visibility:hidden,
    // so the first link isn't focusable on the synchronous commit frame.
    const focusTimer = window.setTimeout(() => focusables()[0]?.focus(), 60);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        return;
      }
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const activeEl = document.activeElement;
      const inDrawer = navRef.current?.contains(activeEl);
      if (e.shiftKey && (activeEl === first || !inDrawer)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (activeEl === last || !inDrawer)) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
      window.clearTimeout(focusTimer);
      toggleEl?.focus();
    };
  }, [open]);

  return (
    <header className={`${styles.nav} ${scrolled ? styles.scrolled : ''}`}>
      <div className={`container ${styles.inner}`}>
        <Link className={styles.lockup} to="/" aria-label={t('nav.home')}>
          <img className={styles.mark} src="/img/flygaca-mark.png" alt="" width={36} height={36} />
          <span className={styles.wordmark} aria-hidden="true">
            <span className={styles.wmFly}>Fly</span>
            <span className={styles.wmGaca}>GACA</span>
          </span>
        </Link>

        <nav
          ref={navRef}
          id="primary-nav"
          className={`${styles.links} ${open ? styles.open : ''}`}
          aria-label={t('nav.primary')}
        >
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => (isActive ? styles.active : undefined)}
              onClick={() => setOpen(false)}
            >
              {t(item.key)}
            </NavLink>
          ))}
          {/* Primary CTA, surfaced inside the drawer on mobile (hidden ≥860px). */}
          <Link
            className={`btn btn-primary ${styles.drawerCta}`}
            to="/pricing"
            onClick={() => setOpen(false)}
          >
            {t('common.goPro')}
          </Link>
        </nav>

        <div className={styles.actions}>
          <button
            className={styles.searchPill}
            type="button"
            onClick={openCommandPalette}
            aria-label={t('cmdk.label')}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <span className={styles.searchPillText}>{t('cmdk.search')}</span>
            <kbd className={styles.searchPillKbd} aria-hidden="true">
              ⌘K
            </kbd>
          </button>
          <LangToggle className={styles.langToggle} />
          <Link className={`btn btn-primary ${styles.cta}`} to="/pricing">
            {t('common.goPro')}
          </Link>
          <button
            ref={toggleRef}
            className={styles.toggle}
            type="button"
            aria-label={t('nav.menu')}
            aria-expanded={open}
            aria-controls="primary-nav"
            onClick={() => setOpen((v) => !v)}
          >
            <span
              className={`${styles.burger} ${open ? styles.burgerOpen : ''}`}
              aria-hidden="true"
            >
              <span />
              <span />
              <span />
            </span>
          </button>
        </div>
      </div>

      {/* Dimmed backdrop behind the mobile drawer; tap to dismiss. */}
      <button
        className={`${styles.backdrop} ${open ? styles.backdropShown : ''}`}
        type="button"
        aria-label={t('common.close')}
        tabIndex={open ? 0 : -1}
        onClick={() => setOpen(false)}
      />
    </header>
  );
}
