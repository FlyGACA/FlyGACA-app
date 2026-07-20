import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { LangToggle } from '../components/LangToggle';
import { ThemeToggle } from '../components/ThemeToggle';
import { InstallButton } from '../components/pwa/InstallButton';
import { openCommandPalette } from '../components/CommandPalette/openCommandPalette';
import { ButtonLink } from '../components/ui/Button';
import { lockBodyScroll, unlockBodyScroll } from '../lib/scroll-lock';
import { useAccount } from '../lib/account';
import { uiIsPro } from '../lib/entitlements';
import { DockIcon, MoreIcon } from './DockIcons';
import styles from './Header.module.css';

interface NavItem {
  to: string;
  key: string;
}

// The signed-in daily-use pages, surfaced in the mobile "More" sheet (and the
// desktop account menu) so a returning pilot doesn't have to dig through /account.
const SIGNED_IN: NavItem[] = [
  { to: '/dashboard', key: 'account.dashboard' },
  { to: '/logbook', key: 'account.logbook' },
  { to: '/records', key: 'account.records' },
  { to: '/currency', key: 'account.currency' },
  { to: '/settings', key: 'account.settings' },
];

// Primary top-level destinations. Every route here is live (the legacy→React
// rebuild is complete — see MIGRATION.md); when signed in, /account renders as a
// dropdown (AccountMenu) surfacing the daily pages.
const NAV: NavItem[] = [
  { to: '/library', key: 'nav.library' },
  { to: '/chat', key: 'nav.captainAdel' },
  { to: '/tools', key: 'nav.tools' },
  { to: '/learn', key: 'nav.learn' },
  { to: '/pricing', key: 'nav.pricing' },
  { to: '/about', key: 'nav.about' },
  { to: '/account', key: 'nav.account' },
];

// The four destinations surfaced as quick-access tabs in the mobile bottom dock;
// everything else falls into the dock's "More" sheet. Adjust this set to retune
// which routes get a dedicated tab.
const PRIMARY_KEYS = new Set(['/library', '/chat', '/tools', '/learn']);
const PRIMARY = NAV.filter((item) => PRIMARY_KEYS.has(item.to));
const MORE = NAV.filter((item) => !PRIMARY_KEYS.has(item.to));

// Per-route label overrides for the compact dock tabs, where the full nav label
// would truncate in the 5-up row ("Captain Adel" → "Adel").
const DOCK_LABEL: Record<string, string> = { '/chat': 'nav.captainShort' };

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

/** Desktop account dropdown — a native <details> (keyboard/AT-friendly, mirrors
 *  ConversationMenu) that reveals the signed-in daily surfaces plus the /account
 *  hub, so they aren't buried a click deep behind a single nav link. Closes on
 *  outside-click, Escape, and route change. */
function AccountMenu() {
  const { t } = useTranslation();
  const ref = useRef<HTMLDetailsElement>(null);
  const { pathname } = useLocation();

  const close = () => {
    if (ref.current) ref.current.open = false;
  };
  // Close on route change so a picked destination doesn't leave the menu open.
  useEffect(close, [pathname]);
  // Dismiss on outside pointerdown or Escape while open.
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (ref.current?.open && !ref.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && ref.current?.open) {
        close();
        ref.current.querySelector<HTMLElement>('summary')?.focus();
      }
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  return (
    <details ref={ref} className={styles.accountMenu}>
      <summary className={styles.accountSummary}>
        <DockIcon route="/account" width={18} height={18} />
        {t('nav.account')}
        <svg
          className={styles.accountCaret}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </summary>
      <div className={styles.accountPanel} role="menu">
        {SIGNED_IN.map((item) => (
          <NavLink
            viewTransition
            key={item.to}
            to={item.to}
            role="menuitem"
            className={({ isActive }) =>
              isActive ? `${styles.accountItem} ${styles.accountItemActive}` : styles.accountItem
            }
            onClick={close}
          >
            <span className={styles.accountItemIcon}>
              <DockIcon route={item.to} />
            </span>
            {t(item.key)}
          </NavLink>
        ))}
        <div className={styles.accountMenuDivider} aria-hidden="true" />
        <NavLink
          viewTransition
          to="/account"
          role="menuitem"
          className={({ isActive }) =>
            isActive ? `${styles.accountItem} ${styles.accountItemActive}` : styles.accountItem
          }
          onClick={close}
        >
          <span className={styles.accountItemIcon}>
            <DockIcon route="/account" />
          </span>
          {t('nav.manageAccount')}
        </NavLink>
      </div>
    </details>
  );
}

export function Header() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const scrolled = useScrolled();
  const location = useLocation();
  const { session, entitlement } = useAccount();
  const signedIn = Boolean(session);
  // A paying pilot shouldn't be shown "Go Pro" — point the header CTA at their
  // dashboard home instead, aligning the primary CTA to a single target by plan.
  const isPro = signedIn && uiIsPro(entitlement);
  const ctaTo = isPro ? '/dashboard' : '/pricing';
  const ctaLabel = isPro ? t('account.dashboard') : t('common.goPro');
  const ctaIcon = isPro ? (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  ) : (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3l1.9 4.8L18.7 9l-4.8 1.9L12 15.7l-1.9-4.8L5.3 9l4.8-1.9z" />
    </svg>
  );
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
    lockBodyScroll();
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
      unlockBodyScroll();
      window.removeEventListener('keydown', onKey);
      window.clearTimeout(focusTimer);
      moreEl?.focus();
    };
  }, [open]);

  return (
    <>
      <header className={`${styles.nav} ${scrolled ? styles.scrolled : ''}`}>
        <div className={`container ${styles.inner}`}>
          <Link className={styles.lockup} to="/" aria-label={t('nav.home')} viewTransition>
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

          {/* Desktop inline nav (hidden ≤860px, where the bottom dock takes over).
              When signed in, /account becomes a dropdown surfacing the daily pages. */}
          <nav className={styles.links} aria-label={t('nav.primary')}>
            {NAV.map((item) =>
              item.to === '/account' && signedIn ? (
                <AccountMenu key={item.to} />
              ) : (
                <NavLink
                  viewTransition
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => (isActive ? styles.active : undefined)}
                >
                  {t(item.key)}
                </NavLink>
              ),
            )}
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
            <ThemeToggle className={styles.langToggle} />
            <LangToggle className={styles.langToggle} />
            <InstallButton />
            <ButtonLink className={styles.cta} to={ctaTo} viewTransition icon={ctaIcon}>
              {ctaLabel}
            </ButtonLink>
          </div>
        </div>
      </header>

      {/* Mobile floating bottom dock — quick-access primary tabs + "More". Sits
          outside <header> so it anchors to the viewport (the header's
          backdrop-filter would otherwise become the containing block). */}
      <nav
        className={`${styles.dock} ${open ? styles.dockRaised : ''}`}
        aria-label={t('nav.primary')}
      >
        {PRIMARY.map((item) => (
          <NavLink
            viewTransition
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              isActive ? `${styles.dockItem} ${styles.dockActive}` : styles.dockItem
            }
          >
            <DockIcon route={item.to} />
            <span>{t(DOCK_LABEL[item.to] ?? item.key)}</span>
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
        <p className={styles.sheetLabel} aria-hidden="true">
          {t('nav.menu')}
        </p>
        <ul className={styles.sheetList}>
          {MORE.map((item) => (
            <li key={item.to}>
              <NavLink
                viewTransition
                to={item.to}
                className={({ isActive }) =>
                  isActive ? `${styles.sheetLink} ${styles.sheetActive}` : styles.sheetLink
                }
                onClick={() => setOpen(false)}
              >
                <span className={styles.sheetIcon}>
                  <DockIcon route={item.to} />
                </span>
                {t(item.key)}
              </NavLink>
            </li>
          ))}
        </ul>

        {/* When signed in, surface the daily-use pages that otherwise hide
            behind /account, so a returning pilot reaches them in one tap. */}
        {signedIn && (
          <>
            <div className={styles.sheetDivider} aria-hidden="true" />
            <p className={styles.sheetLabel} aria-hidden="true">
              {t('nav.account')}
            </p>
            <ul className={styles.sheetList}>
              {SIGNED_IN.map((item) => (
                <li key={item.to}>
                  <NavLink
                    viewTransition
                    to={item.to}
                    className={({ isActive }) =>
                      isActive ? `${styles.sheetLink} ${styles.sheetActive}` : styles.sheetLink
                    }
                    onClick={() => setOpen(false)}
                  >
                    <span className={styles.sheetIcon}>
                      <DockIcon route={item.to} />
                    </span>
                    {t(item.key)}
                  </NavLink>
                </li>
              ))}
            </ul>
          </>
        )}

        <div className={styles.sheetDivider} aria-hidden="true" />
        <Link className={styles.sheetCta} to={ctaTo} onClick={() => setOpen(false)} viewTransition>
          {ctaIcon}
          {ctaLabel}
        </Link>
      </nav>
    </>
  );
}
