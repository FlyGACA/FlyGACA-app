import type { ReactNode } from 'react';
import { isNative, openExternal } from '../lib/native-bridge';

/**
 * An external link that opens in the native in-app browser inside the Capacitor
 * shell and a normal new tab on the web. Use for off-site/asset URLs so the
 * native app doesn't kick users out to Safari/Chrome.
 */
export function ExternalLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  if (isNative()) {
    return (
      <button
        type="button"
        className={className}
        onClick={() => void openExternal(href)}
        style={{ cursor: 'pointer' }}
      >
        {children}
      </button>
    );
  }
  return (
    <a className={className} href={href} target="_blank" rel="noopener">
      {children}
    </a>
  );
}
