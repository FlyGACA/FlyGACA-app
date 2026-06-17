import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LangToggle } from '../components/LangToggle';
import { Disclaimer } from '../components/Disclaimer';
import styles from './Footer.module.css';

export function Footer() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className="container">
        <div className={styles.top}>
          <div className={styles.brand}>
            <Link className={styles.lockup} to="/" aria-label={t('nav.home')}>
              <img src="/img/flygaca-mark.png" alt="" width={30} height={30} loading="lazy" />
              <span className={styles.wordmark}>
                <span className={styles.wmFly}>Fly</span>
                <span className={styles.wmGaca}>GACA</span>
              </span>
            </Link>
            <p className={styles.tagline}>{t('footer.tagline')}</p>
          </div>

          <nav className={styles.col} aria-label={t('footer.explore')}>
            <h4>{t('footer.explore')}</h4>
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
                <Link to="/guides">{t('nav.guides')}</Link>
              </li>
              <li>
                <Link to="/study">{t('nav.study')}</Link>
              </li>
              <li>
                <Link to="/pricing">{t('nav.pricing')}</Link>
              </li>
            </ul>
          </nav>

          <nav className={styles.col} aria-label={t('footer.legal')}>
            <h4>{t('footer.legal')}</h4>
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
            </ul>
          </nav>

          <nav className={styles.col} aria-label={t('footer.verify')}>
            <h4>{t('footer.verify')}</h4>
            <ul>
              <li>
                <a href="https://gaca.gov.sa" target="_blank" rel="noopener">
                  {t('footer.gacaSite')}
                </a>
              </li>
              <li>
                <a
                  href="https://gaca.gov.sa/en/Rules-and-Regulations-Category"
                  target="_blank"
                  rel="noopener"
                >
                  {t('footer.gacaRules')}
                </a>
              </li>
            </ul>
          </nav>
        </div>

        <Disclaimer />

        <div className={styles.bottom}>
          <span className={styles.copyright}>
            © {year} {t('footer.copyright')}
          </span>
          <a className={styles.contact} href="mailto:i@flygaca.com">
            i@flygaca.com
          </a>
          <LangToggle className={styles.langToggle} />
        </div>
      </div>
    </footer>
  );
}
