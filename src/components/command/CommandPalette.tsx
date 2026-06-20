import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { rankItems } from '../../calc/fuzzy';
import { useCommandItems, type CommandGroup, type CommandItem } from '../../lib/commands';
import styles from './CommandPalette.module.css';

const RECENT_KEY = 'flygaca:cmdk-recent';
const MAX_RESULTS = 14;

function loadRecent(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]');
    return Array.isArray(raw) ? (raw as string[]).slice(0, 6) : [];
  } catch {
    return [];
  }
}

/**
 * The ⌘K command palette: fuzzy jump-navigation across pages, tools, guides and
 * Library Parts. Fully keyboard-driven (↑/↓/Enter/Esc), bilingual via the item
 * labels, and rendered as an accessible modal dialog. Mounted app-level (outside
 * the header's backdrop-filter containing block) so the overlay covers the page.
 */
export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const items = useCommandItems();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const results = useMemo(() => {
    if (!query.trim()) {
      const recent = loadRecent();
      const byId = new Map(items.map((i) => [i.id, i]));
      const pinned = recent.map((id) => byId.get(id)).filter((x): x is CommandItem => Boolean(x));
      const pages = items.filter((i) => i.group === 'page' && !recent.includes(i.id));
      return [...pinned, ...pages].slice(0, MAX_RESULTS);
    }
    return rankItems(query, items).slice(0, MAX_RESULTS);
  }, [query, items]);

  // Reset transient state each time the palette opens; focus the input.
  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      const id = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
  }, [open]);

  useEffect(() => setActive(0), [query]);

  // Lock body scroll while the dialog is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Keep the active option scrolled into view.
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({
      block: 'nearest',
    });
  }, [active, results]);

  if (!open) return null;

  function choose(item: CommandItem | undefined) {
    if (!item) return;
    try {
      const recent = [item.id, ...loadRecent().filter((id) => id !== item.id)].slice(0, 6);
      localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
    } catch {
      /* ignore */
    }
    onClose();
    navigate(item.to);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(results[active]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  }

  const groupLabel: Record<CommandGroup, string> = {
    page: t('command.groups.page'),
    tool: t('command.groups.tool'),
    guide: t('command.groups.guide'),
    library: t('command.groups.library'),
  };

  return (
    <div className={styles.overlay} role="presentation" onMouseDown={onClose}>
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label={t('command.title')}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className={styles.searchRow}>
          <span className={styles.searchIcon} aria-hidden="true">
            ⌕
          </span>
          <input
            ref={inputRef}
            className={styles.input}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={t('command.placeholder')}
            aria-label={t('command.placeholder')}
            role="combobox"
            aria-expanded="true"
            aria-controls="cmdk-list"
            aria-activedescendant={results[active] ? `cmdk-${results[active].id}` : undefined}
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className={styles.esc}>esc</kbd>
        </div>

        {results.length === 0 ? (
          <p className={styles.empty}>{t('command.noResults')}</p>
        ) : (
          <ul className={styles.list} id="cmdk-list" ref={listRef} role="listbox">
            {results.map((item, i) => (
              <li
                key={item.id}
                id={`cmdk-${item.id}`}
                role="option"
                aria-selected={i === active}
                data-active={i === active}
                className={`${styles.item} ${i === active ? styles.itemActive : ''}`}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(item);
                }}
              >
                <span className={styles.itemLabel}>{item.label}</span>
                <span className={styles.itemGroup}>{groupLabel[item.group]}</span>
              </li>
            ))}
          </ul>
        )}

        <div className={styles.footer}>
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> {t('command.hintNavigate')}
          </span>
          <span>
            <kbd>↵</kbd> {t('command.hintOpen')}
          </span>
        </div>
      </div>
    </div>
  );
}
