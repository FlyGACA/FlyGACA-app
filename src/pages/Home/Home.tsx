import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Disclaimer } from '../../components/Disclaimer';
import styles from './Home.module.css';

export function Home() {
  const { t } = useTranslation();
  return (
    <>
      <section className={styles.hero}>
        <div className="container-narrow">
          <p className={styles.eyebrow}>{t('home.eyebrow')}</p>
          <h1 className={styles.title}>{t('home.title')}</h1>
          <p className={styles.subtitle}>{t('home.subtitle')}</p>
          <div className={styles.ctas}>
            <Link className="btn btn-primary" to="/library">
              {t('home.ctaLibrary')}
            </Link>
            <Link className="btn btn-ghost" to="/tools">
              {t('home.ctaTools')}
            </Link>
            <Link className="btn btn-ghost" to="/chat">
              {t('home.ctaChat')}
            </Link>
          </div>
          <p className={styles.notice}>{t('home.notAffiliated')}</p>
        </div>
      </section>

      <section className="container-narrow">
        <Disclaimer />
      </section>
    </>
  );
}
