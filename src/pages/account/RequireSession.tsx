import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAccount } from '@/lib/services/account';

/** Gates the account surfaces: shows a sign-in prompt when there is no session. */
export function RequireSession({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { session } = useAccount();
  const location = useLocation();

  if (!session) {
    const redirectUrl = `/account?redirect=${encodeURIComponent(location.pathname + location.search)}`;
    return (
      <section
        className="container-narrow"
        style={{ paddingBlock: 'var(--space-12)', textAlign: 'center' }}
      >
        <p style={{ color: 'var(--text-muted)', marginBlockEnd: 'var(--space-4)' }}>
          {t('account.needSignIn')}
        </p>
        <Link className="btn btn-primary" to={redirectUrl}>
          {t('account.goSignIn')}
        </Link>
      </section>
    );
  }
  return <>{children}</>;
}
