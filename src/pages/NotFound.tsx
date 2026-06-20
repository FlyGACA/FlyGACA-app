import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usePageMeta } from '../lib/usePageMeta';
import { CaptainAvatar } from '../components/CaptainAvatar';
import { useCommandPalette } from '../components/command/context';
import styles from './NotFound.module.css';

const LINKS = [
  { to: '/', key: 'home' },
  { to: '/library', key: 'library' },
  { to: '/chat', key: 'chat' },
  { to: '/tools', key: 'tools' },
] as const;

export function NotFound() {
  const { t } = useTranslation();
  usePageMeta(t('meta.notFound'));
  const palette = useCommandPalette();

  return (
    <section className={`container-narrow ${styles.page}`}>
      <CaptainAvatar size="xl" glow pose="hold" className={styles.avatar} decorative />
      <p className={styles.eyebrow}>{t('notFound.eyebrow')}</p>
      <h1 className={styles.title}>{t('notFound.title')}</h1>
      <p className={styles.lead}>{t('notFound.lead')}</p>

      <button type="button" className={styles.search} onClick={palette.open}>
        <span aria-hidden="true">⌕</span>
        {t('notFound.search')}
        <kbd className={styles.kbd} aria-hidden="true">
          ⌘K
        </kbd>
      </button>

      <ul className={styles.tiles}>
        {LINKS.map((l) => (
          <li key={l.to}>
            <Link to={l.to} className={styles.tile}>
              {t(`notFound.links.${l.key}`)}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
