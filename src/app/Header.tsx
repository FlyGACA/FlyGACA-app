import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LangToggle } from '../components/LangToggle';
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

export function Header() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <header className={styles.nav}>
      <div className={`container ${styles.inner}`}>
        <Link className={styles.lockup} to="/" aria-label={t('nav.home')}>
          <img className={styles.mark} src="/img/flygaca-mark.png" alt="" width={34} height={34} />
        </Link>

        <nav className={`${styles.links} ${open ? styles.open : ''}`} aria-label={t('nav.primary')}>
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
        </nav>

        <div className={styles.actions}>
          <LangToggle className={styles.langToggle} />
          <Link className="btn btn-primary" to="/pricing">
            {t('common.goPro')}
          </Link>
          <button
            className={styles.toggle}
            type="button"
            aria-label={t('nav.menu')}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
