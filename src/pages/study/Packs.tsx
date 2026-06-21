import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usePageMeta } from '../../lib/usePageMeta';
import { Disclaimer } from '../../components/Disclaimer';
import styles from './Study.module.css';

interface Pack {
  name: string;
  desc: string;
}

export function Packs() {
  const { t } = useTranslation();
  usePageMeta(t('meta.packs'));
  const packs = t('study.packItems', { returnObjects: true }) as unknown as Pack[];

  return (
    <section className={`container ${styles.page}`}>
      <header className={styles.head}>
        <h1>{t('study.packs')}</h1>
        <p className={styles.subtitle}>{t('study.packsDesc')}</p>
      </header>
      <ul className={styles.banks}>
        {packs.map((p) => (
          <li key={p.name} className={styles.bank} style={{ cursor: 'default' }}>
            <span className={styles.bankTitle}>{p.name}</span>
            <span className={styles.bankDesc}>{p.desc}</span>
            <span className={styles.bankMeta}>{t('study.packPro')}</span>
          </li>
        ))}
      </ul>
      <Link to="/pricing" className={styles.primary} style={{ textDecoration: 'none' }}>
        {t('study.packGo')}
      </Link>
      <Disclaimer compact />
    </section>
  );
}
