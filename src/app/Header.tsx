import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LangToggle } from '../components/LangToggle';
import { InstallButton } from '../components/pwa/InstallButton';
import { openCommandPalette } from '../components/CommandPalette/openCommandPalette';
import { DockIcon, MoreIcon } from './DockIcons';
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

// The four destinations surfaced as quick-access tabs in the mobile bottom dock;
// everything else falls into the dock's "More" sheet. Adjust this set to retune
// which routes get a dedicated tab.
const PRIMARY_KEYS = new Set(['/library', '/chat', '/tools', '/study']);
const PRIMARY = NAV.filter((item) => PRIMARY_KEYS.has(item.to));
const MORE = NAV.filter((item) => !PRIMARY_KEYS.has(item.to));

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
  const sheetRef = useRef<HTMLElement>(null);
  const moreRef = useRef<HTMLButtonElement>(null);

  // Close the "More" sheet whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  // While the sheet is open: lock body scroll, move focus into the sheet and
  // trap Tab within it so focus can't fall behind the overlay, and close on
  // Escape. Focus returns to the More button when the sheet closes.
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Capture the trigger now so cleanup restores focus to the same node.
    const moreEl = moreRef.current;

    const focusables = () =>
      Array.from(
        sheetRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]',
        ) ?? [],
      ).filter((el) => el.tabIndex !== -1);
    // Defer to the next tick: the sheet transitions out of visibility:hidden,
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
      const inSheet = sheetRef.current?.contains(activeEl);
      if (e.shiftKey && (activeEl === first || !inSheet)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (activeEl === last || !inSheet)) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
      window.clearTimeout(focusTimer);
      moreEl?.focus();
    };
  }, [open]);

  return (
    <>
      <header className={`${styles.nav} ${scrolled ? styles.scrolled : ''}`}>
        <div className={`container ${styles.inner}`}>
          <Link className={styles.lockup} to="/" aria-label={t('nav.home')}>
            <img
              className={styles.mark}
              src="/img/flygaca-mark.png"
              alt=""
              width={36}
              height={36}
              decoding="async"
            />
            <span className={styles.wordmark} aria-hidden="true">
              <span className={styles.wmFly}>Fly</span>
              <span className={styles.wmGaca}>GACA</span>
            </span>
          </Link>

          {/* Desktop inline nav (hidden ≤860px, where the bottom dock takes over). */}
          <nav className={styles.links} aria-label={t('nav.primary')}>
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => (isActive ? styles.active : undefined)}
              >
                {t(item.key)}
              </NavLink>
            ))}
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
            <InstallButton />
            <Link className={`btn btn-primary ${styles.cta}`} to="/pricing">
              {t('common.goPro')}
            </Link>
          </div>
        </div>
      </header>

      {/* Mobile floating bottom dock — quick-access primary tabs + "More". Sits
          outside <header> so it anchors to the viewport (the header's
          backdrop-filter would otherwise become the containing block). */}
      <nav className={styles.dock} aria-label={t('nav.primary')}>
        {PRIMARY.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              isActive ? `${styles.dockItem} ${styles.dockActive}` : styles.dockItem
            }
          >
            <DockIcon route={item.to} />
            <span>{t(item.key)}</span>
          </NavLink>
        ))}
        <button
          ref={moreRef}
          className={`${styles.dockItem} ${styles.dockMore} ${open ? styles.dockActive : ''}`}
          type="button"
          aria-expanded={open}
          aria-controls="more-sheet"
          onClick={() => setOpen((v) => !v)}
        >
          <MoreIcon />
          <span>{t('nav.more')}</span>
        </button>
      </nav>

      {/* Dimmed backdrop behind the "More" sheet; tap to dismiss. */}
      <button
        className={`${styles.backdrop} ${open ? styles.backdropShown : ''}`}
        type="button"
        aria-label={t('common.close')}
        tabIndex={open ? 0 : -1}
        onClick={() => setOpen(false)}
      />

      {/* "More" bottom sheet — the secondary destinations + the Go Pro CTA. */}
      <nav
        ref={sheetRef}
        id="more-sheet"
        className={`${styles.sheet} ${open ? styles.open : ''}`}
        aria-label={t('nav.more')}
      >
        {MORE.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => (isActive ? styles.active : undefined)}
            onClick={() => setOpen(false)}
          >
            {t(item.key)}
          </NavLink>
        ))}
        <Link
          className={`btn btn-primary ${styles.sheetCta}`}
          to="/pricing"
          onClick={() => setOpen(false)}
        >
          {t('common.goPro')}
        </Link>
      </nav>
    </>
  );
}
