import { useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Disclaimer } from './Disclaimer';
import { adelLink } from '../lib/adel';
import { usePageMeta } from '../lib/usePageMeta';
import { breadcrumbLd, softwareAppLd } from '../lib/jsonld';
import styles from './CalcShell.module.css';

export interface RelatedTool {
  to: string;
  label: string;
}

interface CalcShellProps {
  title: string;
  intro?: string;
  /** Small category eyebrow above the title. */
  category?: string;
  /** Inputs / outputs of the calculator. */
  children: ReactNode;
  /** Applies a worked example to the inputs (the "Try an example" button). */
  onExample?: () => void;
  /** Returns the Ask-Adel prompt, or null/undefined to hide the action. */
  adelPrompt?: () => string | null | undefined;
  /** Optional "How it works" explainer, shown in a collapsible. */
  formula?: ReactNode;
  /** Related tools shown as chips at the foot of the page. */
  related?: RelatedTool[];
}

/**
 * The shared frame for every calculator tool: category eyebrow, title, intro,
 * the tool body, the action row (copy link · try an example · ask Captain Adel),
 * an optional "How it works" explainer, related-tool chips and the disclaimer.
 */
export function CalcShell({
  title,
  intro,
  category,
  children,
  onExample,
  adelPrompt,
  formula,
  related,
}: CalcShellProps) {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const [copied, setCopied] = useState<'idle' | 'ok' | 'fail'>('idle');
  usePageMeta(title, intro, [
    softwareAppLd({ title, description: intro, path: pathname }),
    breadcrumbLd([
      { name: t('nav.home'), path: '/' },
      { name: t('nav.tools'), path: '/tools' },
      { name: title, path: pathname },
    ]),
  ]);

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

  // The button's visible label changes on copy, but screen readers also need the
  // outcome announced — a polite live region carries the transient confirmation
  // (WCAG 4.1.3 Status Messages). Empty while idle so it only speaks on change.
  const copyStatus =
    copied === 'ok' ? t('calc.copied') : copied === 'fail' ? t('calc.copyFailed') : '';

  const adelHref = adelPrompt ? adelLink(adelPrompt()) : null;

  return (
    <article className={`container-narrow ${styles.shell} page-enter`}>
      <header className={styles.head}>
        {category && <p className={styles.eyebrow}>{category}</p>}
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

      <span className="sr-only" role="status" aria-live="polite">
        {copyStatus}
      </span>

      {formula && (
        <details className={styles.formula}>
          <summary>{t('calc.howItWorks')}</summary>
          <div className={styles.formulaBody}>{formula}</div>
        </details>
      )}

      {related && related.length > 0 && (
        <nav className={styles.related} aria-label={t('calc.related')}>
          <span className={styles.relatedLabel}>{t('calc.related')}</span>
          {related.map((r) => (
            <Link key={r.to} to={r.to} className={styles.relatedChip}>
              {r.label}
            </Link>
          ))}
        </nav>
      )}

      <Disclaimer compact />
    </article>
  );
}
