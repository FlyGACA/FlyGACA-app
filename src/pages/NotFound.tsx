import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function NotFound() {
  const { t } = useTranslation();
  return (
    <section
      className="container-narrow"
      style={{ paddingBlock: 'var(--space-12)', textAlign: 'center' }}
    >
      <h1>404</h1>
      <p style={{ color: 'var(--text-muted)', marginBlock: 'var(--space-4)' }}>
        {t('common.loadError')}
      </p>
      <Link className="btn btn-primary" to="/">
        {t('nav.home')}
      </Link>
    </section>
  );
}
