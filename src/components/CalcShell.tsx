import { useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Disclaimer } from './Disclaimer';
import { adelLink } from '../lib/adel';
import { usePageMeta } from '../lib/usePageMeta';
import { breadcrumbLd, softwareAppLd } from '../lib/jsonld';
import { useFeature } from '../lib/features';
import {
  addPreset,
  removePreset,
  presetsFor,
  normalizePresets,
  type Preset,
} from '../calc/toolPresets';
import styles from './CalcShell.module.css';

const PRESETS_KEY = 'flygaca:tool-presets';

function loadPresets(): Preset[] {
  try {
    return normalizePresets(JSON.parse(localStorage.getItem(PRESETS_KEY) ?? 'null'));
  } catch {
    return [];
  }
}

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
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const isPro = useFeature('tool-presets');
  const [copied, setCopied] = useState<'idle' | 'ok' | 'fail'>('idle');
  const [presets, setPresets] = useState<Preset[]>(loadPresets);
  const [naming, setNaming] = useState(false);
  const [presetName, setPresetName] = useState('');
  const mine = presetsFor(presets, pathname);

  function persistPresets(next: Preset[]) {
    setPresets(next);
    try {
      localStorage.setItem(PRESETS_KEY, JSON.stringify(next));
    } catch {
      /* ignore quota / private-mode errors */
    }
  }
  function saveCurrentPreset() {
    const name = presetName.trim();
    if (!name) return;
    persistPresets(addPreset(presets, { path: pathname, name, query: search.replace(/^\?/, '') }));
    setPresetName('');
    setNaming(false);
  }
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
        {!isPro ? (
          <Link className={styles.action} to="/pricing">
            {t('calc.savePreset')}
            <span className={styles.proTag}>{t('upsell.proOnly')}</span>
          </Link>
        ) : naming ? (
          <span className={styles.presetForm}>
            <input
              className={styles.presetInput}
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder={t('calc.presetName')}
              aria-label={t('calc.presetName')}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  saveCurrentPreset();
                } else if (e.key === 'Escape') {
                  setNaming(false);
                }
              }}
            />
            <button
              type="button"
              className={styles.action}
              onClick={saveCurrentPreset}
              disabled={!presetName.trim()}
            >
              {t('calc.presetSave')}
            </button>
          </span>
        ) : (
          <button type="button" className={styles.action} onClick={() => setNaming(true)}>
            {t('calc.savePreset')}
          </button>
        )}
        <span className={styles.note}>{t('calc.shareNote')}</span>
      </div>

      {mine.length > 0 && (
        <details className={styles.presets}>
          <summary>{t('calc.presets')}</summary>
          <ul className={styles.presetList}>
            {mine.map((p) => (
              <li key={p.name} className={styles.presetRow}>
                <button
                  type="button"
                  className={styles.presetLoad}
                  onClick={() => navigate(`${pathname}${p.query ? `?${p.query}` : ''}`)}
                >
                  {p.name}
                </button>
                <button
                  type="button"
                  className={styles.presetRemove}
                  aria-label={t('calc.removePreset')}
                  onClick={() => persistPresets(removePreset(presets, pathname, p.name))}
                >
                  <span aria-hidden="true">×</span>
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}

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
