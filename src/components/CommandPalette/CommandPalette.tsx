import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { fetchJson } from '../../lib/content';
import { OPEN_CMDK_EVENT } from './openCommandPalette';
import styles from './CommandPalette.module.css';

/** Every tool route in the app (mirrors router.tsx). Each maps to /tools/{id}
 *  with its name pulled from i18n `tools.items.{id}.name`. */
const TOOL_IDS = [
  'crosswind', 'density-altitude', 'tas', 'pressure-altitude', 'isa', 'altimeter',
  'cloud-base', 'mach', 'climb-gradient', 'standard-rate-turn', 'wind-table',
  'hydroplaning', 'takeoff-landing', 'wind-triangle', 'great-circle', 'one-in-sixty',
  'tsd', 'top-of-descent', 'descent-vdp', 'fuel', 'specific-range', 'weight-balance',
  'zulu-clock', 'airac', 'sun-times', 'medical-validity', 'flight-review', 'holding',
  'procedural-separation', 'vfr-brief', 'loa', 'units', 'transponder', 'phonetic',
  'metar', 'taf', 'notam', 'met-brief', 'chart-symbols', 'vfr-minima', 'aerodromes',
];

type Filter = 'all' | 'reg' | 'aero' | 'tool';

interface Item {
  group: Filter;
  code: string;
  name: string;
  tip: string;
  to: string;
}

interface GacarDoc {
  part: string;
  title: string;
  category: string;
  slug: string;
}
interface GacarIndex {
  categories: { id: string; label: string }[];
  documents: GacarDoc[];
}
interface Airport {
  icao: string;
  name_en: string;
  name_ar: string;
  city_en: string;
  city_ar: string;
  elev_ft: number;
}
interface AirportsIndex {
  airports: Airport[];
}

/** A 3-letter mono tag for a tool, derived from its id (density-altitude → DEN). */
function toolCode(id: string): string {
  return id.replace(/-/g, '').slice(0, 3).toUpperCase();
}

/**
 * A global ⌘K command palette: fuzzy-launch into any GACAR Part, aerodrome, or
 * flight tool. Opens on ⌘K / Ctrl-K (or the Header pill via the OPEN_CMDK
 * event), filters by category chip, navigates with the keyboard, and lazily
 * fetches the (small) Part and aerodrome indexes the first time it opens so it
 * adds nothing to first paint. RTL- and reduced-motion-aware.
 */
export function CommandPalette() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const ar = i18n.language === 'ar';

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [active, setActive] = useState(0);
  const [parts, setParts] = useState<Item[]>([]);
  const [aerodromes, setAerodromes] = useState<Item[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const loaded = useRef(false);

  // Tools are static (names from i18n) so they need no fetch.
  const tools = useMemo<Item[]>(
    () =>
      TOOL_IDS.map((id) => ({
        group: 'tool' as const,
        code: toolCode(id),
        name: t(`tools.items.${id}.name`),
        tip: t(`tools.items.${id}.blurb`),
        to: `/tools/${id}`,
      })),
    [t],
  );

  const loadData = useCallback(async () => {
    if (loaded.current) return;
    loaded.current = true;
    try {
      const [gacar, ap] = await Promise.all([
        fetchJson<GacarIndex>('/data/gacar-index.json'),
        fetchJson<AirportsIndex>('/data/airports.json'),
      ]);
      const catLabel = new Map(gacar.categories.map((c) => [c.id, c.label]));
      setParts(
        gacar.documents.map((d) => ({
          group: 'reg',
          code: `§${d.part}`,
          name: d.title,
          tip: catLabel.get(d.category) ?? '',
          to: `/library/${d.slug}`,
        })),
      );
      setAerodromes(
        ap.airports.map((a) => ({
          group: 'aero',
          code: a.icao,
          name: ar ? `${a.name_ar} · ${a.city_ar}` : `${a.name_en} · ${a.city_en}`,
          tip: `${a.icao} · ${a.elev_ft} ft`,
          to: '/tools/aerodromes',
        })),
      );
    } catch {
      loaded.current = false; // allow a retry on the next open
    }
  }, [ar]);

  const close = useCallback(() => setOpen(false), []);
  const show = useCallback(() => {
    setOpen(true);
    setQuery('');
    setActive(0);
    void loadData();
  }, [loadData]);

  // ⌘K / Ctrl-K global shortcut + the Header pill event.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setOpen((v) => !v);
        if (!open) {
          setQuery('');
          setActive(0);
          void loadData();
        }
      }
    };
    const onOpenEvent = () => show();
    window.addEventListener('keydown', onKey);
    window.addEventListener(OPEN_CMDK_EVENT, onOpenEvent);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener(OPEN_CMDK_EVENT, onOpenEvent);
    };
  }, [open, show, loadData]);

  // Focus the input and lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const id = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => {
      document.body.style.overflow = prev;
      window.clearTimeout(id);
    };
  }, [open]);

  const results = useMemo<Item[]>(() => {
    const all = [...parts, ...aerodromes, ...tools];
    const q = query.trim().toLowerCase();
    return all.filter((it) => {
      if (filter !== 'all' && it.group !== filter) return false;
      if (!q) return true;
      return `${it.code} ${it.name} ${it.tip}`.toLowerCase().includes(q);
    });
  }, [parts, aerodromes, tools, query, filter]);

  const choose = useCallback(
    (item: Item | undefined) => {
      if (!item) return;
      close();
      navigate(item.to);
    },
    [close, navigate],
  );

  // In-palette keyboard nav.
  const onListKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => (results.length ? (a + 1) % results.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => (results.length ? (a - 1 + results.length) % results.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(results[active]);
    }
  };

  // Keep the active row scrolled into view.
  useEffect(() => {
    const node = resultsRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`);
    node?.scrollIntoView({ block: 'nearest' });
  }, [active, results]);

  if (!open) return null;

  const chips: { id: Filter; label: string }[] = [
    { id: 'all', label: t('cmdk.all') },
    { id: 'reg', label: t('cmdk.regulations') },
    { id: 'aero', label: t('cmdk.aerodromes') },
    { id: 'tool', label: t('cmdk.tools') },
  ];

  return (
    <div
      className={styles.scrim}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className={styles.box} role="dialog" aria-modal="true" aria-label={t('cmdk.label')}>
        <div className={styles.inputRow}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            className={styles.input}
            type="text"
            value={query}
            placeholder={t('cmdk.placeholder')}
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onListKey}
          />
          <span className={styles.esc}>ESC</span>
        </div>

        <div className={styles.chips}>
          {chips.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`${styles.chip} ${filter === c.id ? styles.chipActive : ''}`}
              onClick={() => {
                setFilter(c.id);
                setActive(0);
              }}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className={styles.results} ref={resultsRef}>
          {results.length === 0 ? (
            <p className={styles.empty}>{t('cmdk.empty')}</p>
          ) : (
            results.slice(0, 50).map((it, idx) => (
              <button
                key={`${it.group}-${it.code}-${idx}`}
                type="button"
                data-idx={idx}
                className={`${styles.item} ${idx === active ? styles.itemActive : ''}`}
                onMouseEnter={() => setActive(idx)}
                onClick={() => choose(it)}
              >
                <span className={`${styles.code} ${styles[it.group]}`}>{it.code}</span>
                <span className={styles.meta}>
                  <span className={styles.name}>{it.name}</span>
                  <span className={styles.tip}>{it.tip}</span>
                </span>
                <span className={styles.enter}>↵</span>
              </button>
            ))
          )}
        </div>

        <div className={styles.foot}>
          <span>↑↓ {t('cmdk.navigate')}</span>
          <span>↵ {t('cmdk.openHint')}</span>
          <span>esc {t('cmdk.closeHint')}</span>
        </div>
      </div>
    </div>
  );
}
