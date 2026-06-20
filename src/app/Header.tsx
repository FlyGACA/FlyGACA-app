import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LangToggle } from '../components/LangToggle';
import { InstallButton } from '../components/pwa/InstallButton';
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

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  // While the drawer is open: lock body scroll and close on Escape.
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
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
            <kbd className={styles.searchPillKbd}>⌘K</kbd>
          </button>
          <LangToggle className={styles.langToggle} />
          <InstallButton />
          <Link className={`btn btn-primary ${styles.cta}`} to="/pricing">
            {t('common.goPro')}
          </Link>
          <button
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
