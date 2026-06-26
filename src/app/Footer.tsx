import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LangToggle } from '../components/LangToggle';
import { ThemeToggle } from '../components/ThemeToggle';
import { Disclaimer } from '../components/Disclaimer';
import styles from './Footer.module.css';

/** Scrolls to the top, honouring the user's reduced-motion preference. */
function scrollToTop() {
  const reduce =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
}

export function Footer() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className="container">
        {/* Brand + two tidy link columns. */}
        <div className={styles.top}>
          <div className={styles.brand}>
            <Link className={styles.lockup} to="/" aria-label={t('nav.home')}>
              <img
                src="/img/flygaca-mark.png"
                alt=""
                width={32}
                height={32}
                loading="lazy"
                decoding="async"
              />
              <span className={styles.wordmark} aria-hidden="true">
                <span className={styles.wmFly}>Fly</span>
                <span className={styles.wmGaca}>GACA</span>
              </span>
            </Link>
            <p className={styles.tagline}>{t('footer.tagline')}</p>
            <a className={styles.contact} href="mailto:i@flygaca.com">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="m22 7-10 5L2 7" />
              </svg>
              i@flygaca.com
            </a>
          </div>

          <nav className={styles.col} aria-label={t('footer.explore')}>
            <h2>{t('footer.explore')}</h2>
            <ul>
              <li>
                <Link to="/library">{t('nav.library')}</Link>
              </li>
              <li>
                <Link to="/chat">{t('nav.captainAdel')}</Link>
              </li>
              <li>
                <Link to="/tools">{t('footer.flightTools')}</Link>
              </li>
              <li>
                <Link to="/learn">{t('nav.learn')}</Link>
              </li>
              <li>
                <Link to="/pricing">{t('nav.pricing')}</Link>
              </li>
            </ul>
          </nav>

          <nav className={styles.col} aria-label={t('footer.legal')}>
            <h2>{t('footer.legal')}</h2>
            <ul>
              <li>
                <Link to="/disclaimer">{t('footer.disclaimerLink')}</Link>
              </li>
              <li>
                <Link to="/terms">{t('footer.terms')}</Link>
              </li>
              <li>
                <Link to="/privacy">{t('footer.privacy')}</Link>
              </li>
              <li>
                <Link to="/safety">{t('footer.safety')}</Link>
              </li>
            </ul>
          </nav>
        </div>

        {/* The not-affiliated notice + a calm reminder to check the official source. */}
        <div className={styles.notice}>
          <Disclaimer />
          <p className={styles.verify}>
            <span className={styles.verifyLabel}>{t('footer.verify')}</span>
            <a href="https://gaca.gov.sa" target="_blank" rel="noopener">
              {t('footer.gacaSite')}
            </a>
            <a
              href="https://gaca.gov.sa/en/Rules-and-Regulations-Category"
              target="_blank"
              rel="noopener"
            >
              {t('footer.gacaRules')}
            </a>
          </p>
        </div>

        <div className={styles.bottom}>
          <span className={styles.copyright}>
            © {year} {t('footer.copyright')}
          </span>
          <button type="button" className={styles.backToTop} onClick={scrollToTop}>
            <span>{t('common.backToTop')}</span>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m18 15-6-6-6 6" />
            </svg>
          </button>
          <ThemeToggle className={styles.langToggle} />
          <LangToggle className={styles.langToggle} />
        </div>
      </div>
    </footer>
  );
}
