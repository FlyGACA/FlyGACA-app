import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CalcShell } from '../../components/CalcShell';
import { TextField } from '../../components/calc/TextField';
import { useFetchJson } from '../../lib/useFetchJson';
import { useDebouncedValue } from '../../lib/useDebouncedValue';
import type { Airport, AirportsIndex } from '../../lib/content';
import styles from './Aerodromes.module.css';

type RegionFilter = 'all' | 'saudi' | 'gcc' | 'mena' | 'world';

const REGION_FILTERS: RegionFilter[] = ['all', 'saudi', 'gcc', 'mena', 'world'];

// Region tags as written by scripts/build-airports.mjs: curated Saudi rows carry
// 'KSA', other Gulf states 'GCC', the wider region 'MENA', the rest a continent code.
function inRegion(a: Airport, filter: RegionFilter): boolean {
  const r = a.region ?? '';
  const saudi = r === 'KSA' || a.country_en === 'Saudi Arabia';
  switch (filter) {
    case 'all':
      return true;
    case 'saudi':
      return saudi;
    case 'gcc':
      return r === 'GCC' || saudi;
    case 'mena':
      return r === 'MENA' || r === 'GCC' || saudi;
    case 'world':
      return r !== 'MENA' && r !== 'GCC' && !saudi;
  }
}

/** Short region badge label for a card, derived from the airport's region tag. */
function regionBadge(a: Airport): RegionFilter {
  const r = a.region ?? '';
  if (r === 'KSA' || a.country_en === 'Saudi Arabia') return 'saudi';
  if (r === 'GCC') return 'gcc';
  if (r === 'MENA') return 'mena';
  return 'world';
}

const PAGE = 60;

export function Aerodromes() {
  const { t, i18n } = useTranslation();
  const ar = i18n.language === 'ar';
  const { data, error, loading } = useFetchJson<AirportsIndex>('/data/airports.json');
  const [q, setQ] = useState('');
  const [region, setRegion] = useState<RegionFilter>('all');
  const [visible, setVisible] = useState(PAGE);
  const query = useDebouncedValue(q.trim(), 200);

  const matches = useMemo(() => {
    if (!data) return [];
    const needle = query.toLowerCase();
    return data.airports
      .filter((a) => inRegion(a, region))
      .filter(
        (a) =>
          !needle ||
          a.icao.toLowerCase().includes(needle) ||
          a.iata.toLowerCase().includes(needle) ||
          a.name_en.toLowerCase().includes(needle) ||
          a.name_ar.includes(query) ||
          a.city_en.toLowerCase().includes(needle) ||
          (a.country_en?.toLowerCase().includes(needle) ?? false),
      )
      .sort((a, b) => a.icao.localeCompare(b.icao));
  }, [data, query, region]);

  // Reset pagination whenever the result set changes (search/region).
  const list = useMemo(() => matches.slice(0, visible), [matches, visible]);

  function pickRegion(next: RegionFilter) {
    setRegion(next);
    setVisible(PAGE);
  }
  function onSearch(next: string) {
    setQ(next);
    setVisible(PAGE);
  }

  const adelPrompt = () => {
    const term = q.trim();
    if (!term) return null;
    return ar
      ? `ما هي مدارج وترددات وخدمات مطار "${term}"؟`
      : `What are the runways, frequencies and services for the aerodrome "${term}"?`;
  };

  return (
    <CalcShell
      title={t('tools.items.aerodromes.name')}
      intro={t('tools.items.aerodromes.blurb')}
      category={t('tools.categories.directory')}
      formula={t('aerodromesTool.formula')}
      adelPrompt={adelPrompt}
    >
      <div className={styles.regions} role="group" aria-label={t('aerodromesTool.regionLabel')}>
        {REGION_FILTERS.map((r) => (
          <button
            key={r}
            type="button"
            className={`${styles.region} ${region === r ? styles.regionActive : ''}`}
            aria-pressed={region === r}
            onClick={() => pickRegion(r)}
          >
            {t(`aerodromesTool.regions.${r}`)}
          </button>
        ))}
      </div>

      <TextField
        label={t('aerodromesTool.search')}
        value={q}
        onChange={onSearch}
        placeholder="OERK"
      />

      {loading && <p>{t('common.loading')}</p>}
      {error && <p role="alert">{t('common.loadError')}</p>}
      {data && (
        <>
          <p className={styles.count}>
            {matches.length > list.length
              ? t('aerodromesTool.showing', { n: list.length, total: matches.length })
              : t('aerodromesTool.matched', { n: matches.length })}
          </p>
          {list.length === 0 ? (
            <p className={styles.count}>{t('aerodromesTool.empty')}</p>
          ) : (
            <>
              <ul className={`${styles.list} stagger-grid`}>
                {list.map((a) => {
                  const badge = regionBadge(a);
                  return (
                    <li key={a.icao} className={styles.card}>
                      <div className={styles.head}>
                        <span className={styles.icao}>{a.icao}</span>
                        {a.iata && <span className={styles.iata}>{a.iata}</span>}
                        <span
                          className={`${styles.badge} ${styles[`badge_${badge}`]}`}
                          title={t(`aerodromesTool.regions.${badge}`)}
                        >
                          {t(`aerodromesTool.regions.${badge}`)}
                        </span>
                      </div>
                      <span className={styles.name}>{ar ? a.name_ar : a.name_en}</span>
                      <div className={styles.meta}>
                        {a.country_en && (
                          <span>{ar ? a.country_ar || a.country_en : a.country_en}</span>
                        )}
                        <span>
                          {t('aerodromesTool.elevation')}: {a.elev_ft.toLocaleString()} ft
                        </span>
                        <span className={styles.coords}>
                          {a.lat.toFixed(3)}, {a.lon.toFixed(3)}
                        </span>
                      </div>
                      {a.rwys.length > 0 && (
                        <div className={styles.rowSection}>
                          <span className={styles.rowLabel}>{t('aerodromesTool.runways')}</span>
                          <div className={styles.pills}>
                            {a.rwys.map((r, i) => (
                              <span
                                key={i}
                                className={styles.rwy}
                                title={
                                  r.len
                                    ? `${r.len.toLocaleString()} ft${r.surf ? ` · ${r.surf}` : ''}`
                                    : r.surf || undefined
                                }
                              >
                                {r.id}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {a.freqs.length > 0 && (
                        <div className={styles.rowSection}>
                          <span className={styles.rowLabel}>{t('aerodromesTool.freqs')}</span>
                          <div className={styles.pills}>
                            {a.freqs.map((f, i) => (
                              <span key={i} className={styles.freq}>
                                {f.l} {f.v}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      <a
                        className={styles.map}
                        href={`https://www.google.com/maps?q=${a.lat},${a.lon}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {t('aerodromesTool.viewMap')}
                      </a>
                    </li>
                  );
                })}
              </ul>
              {matches.length > list.length && (
                <button
                  type="button"
                  className={styles.loadMore}
                  onClick={() => setVisible((v) => v + PAGE)}
                >
                  {t('aerodromesTool.loadMore')}
                </button>
              )}
            </>
          )}
        </>
      )}
    </CalcShell>
  );
}
