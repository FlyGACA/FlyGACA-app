import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './MessageActions.module.css';

/**
 * The row of icon actions under a finalized Captain Adel reply: copy the text
 * and regenerate (re-ask the preceding question). For an errored turn the same
 * regenerate slot reads as "Retry". Pure presentational — the page owns the
 * regenerate logic and clipboard text.
 */
export function MessageActions({
  text,
  onRegenerate,
  isError,
}: {
  text: string;
  onRegenerate: () => void;
  isError?: boolean;
}) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked (insecure context / permissions) — ignore */
    }
  }

  return (
    <div className={styles.actions}>
      {!isError && (
        <button
          type="button"
          className={styles.action}
          onClick={() => void copy()}
          aria-label={t('chat.copy')}
        >
          <span aria-hidden="true">{copied ? '✓' : '⧉'}</span>
          <span className={styles.label}>{copied ? t('chat.copied') : t('chat.copy')}</span>
        </button>
      )}
      <button
        type="button"
        className={styles.action}
        onClick={onRegenerate}
        aria-label={isError ? t('chat.retry') : t('chat.regenerate')}
      >
        <span aria-hidden="true">↻</span>
        <span className={styles.label}>{isError ? t('chat.retry') : t('chat.regenerate')}</span>
      </button>
    </div>
  );
}
