import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Disclaimer } from './Disclaimer';
import { adelLink } from '../lib/adel';
import styles from './CalcShell.module.css';

interface CalcShellProps {
  title: string;
  intro?: string;
  /** Inputs / outputs of the calculator. */
  children: ReactNode;
  /** Applies a worked example to the inputs (the "Try an example" button). */
  onExample?: () => void;
  /** Returns the Ask-Adel prompt, or null/undefined to hide the action. */
  adelPrompt?: () => string | null | undefined;
}

/**
 * The shared frame for every calculator tool: title, intro, the tool body, the
 * action row (copy link · try an example · ask Captain Adel) and the disclaimer.
 * Replaces the legacy FGCalc.mountActions helper.
 */
export function CalcShell({ title, intro, children, onExample, adelPrompt }: CalcShellProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState<'idle' | 'ok' | 'fail'>('idle');

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied('ok');
    } catch {
      setCopied('fail');
    }
    setTimeout(() => setCopied('idle'), 1500);
  }

  const copyLabel =
    copied === 'ok'
      ? t('calc.copied')
      : copied === 'fail'
        ? t('calc.copyFailed')
        : t('calc.copyLink');

  const adelHref = adelPrompt ? adelLink(adelPrompt()) : null;

  return (
    <article className={`container-narrow ${styles.shell}`}>
      <header className={styles.head}>
        <h1>{title}</h1>
        {intro && <p className={styles.intro}>{intro}</p>}
      </header>

      <div className={styles.body}>{children}</div>

      <div className={styles.actions}>
        <button className={styles.action} type="button" onClick={copyLink}>
          {copyLabel}
        </button>
        {onExample && (
          <button className={styles.action} type="button" onClick={onExample}>
            {t('calc.tryExample')}
          </button>
        )}
        {adelHref && (
          <Link className={`${styles.action} ${styles.adel}`} to={adelHref}>
            {t('calc.askAdel')}
          </Link>
        )}
        <span className={styles.note}>{t('calc.shareNote')}</span>
      </div>

      <Disclaimer compact />
    </article>
  );
}
