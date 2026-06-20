import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CalcShell } from '../../components/CalcShell';
import { TextField } from '../../components/calc/TextField';
import { useFetchJson } from '../../lib/useFetchJson';
import type { AirportsIndex } from '../../lib/content';
import styles from './Aerodromes.module.css';

export function Aerodromes() {
  const { t, i18n } = useTranslation();
  const ar = i18n.language === 'ar';
  const { data, error, loading } = useFetchJson<AirportsIndex>('/data/airports.json');
  const [q, setQ] = useState('');

  // The dataset is now global (thousands of rows), so render is capped; a search
  // narrows it. The full count is still shown from data.count.
  const CAP = 60;
  const matches = useMemo(() => {
    if (!data) return [];
    const query = q.trim().toLowerCase();
    return data.airports
      .filter(
        (a) =>
          !query ||
          a.icao.toLowerCase().includes(query) ||
          a.iata.toLowerCase().includes(query) ||
          a.name_en.toLowerCase().includes(query) ||
          a.name_ar.includes(q.trim()) ||
          a.city_en.toLowerCase().includes(query) ||
          (a.country_en?.toLowerCase().includes(query) ?? false),
      )
      .sort((a, b) => a.icao.localeCompare(b.icao));
  }, [data, q]);
  const list = useMemo(() => matches.slice(0, CAP), [matches]);

  return (
    <CalcShell
      title={t('tools.items.aerodromes.name')}
      intro={t('tools.items.aerodromes.blurb')}
      category={t('tools.categories.directory')}
      formula={t('aerodromesTool.formula')}
    >
      <TextField label={t('aerodromesTool.search')} value={q} onChange={setQ} placeholder="OERK" />
      {loading && <p>{t('common.loading')}</p>}
      {error && <p role="alert">{t('common.loadError')}</p>}
      {data && (
        <>
          <p className={styles.count}>
            {matches.length > list.length
              ? t('aerodromesTool.showing', { n: list.length, total: matches.length })
              : t('aerodromesTool.count', { n: data.count })}
          </p>
          {list.length === 0 ? (
            <p className={styles.count}>{t('aerodromesTool.empty')}</p>
          ) : (
            <ul className={`${styles.list} stagger-grid`}>
              {list.map((a) => (
                <li key={a.icao} className={styles.card}>
                  <div className={styles.head}>
                    <span className={styles.icao}>{a.icao}</span>
                    {a.iata && <span className={styles.iata}>{a.iata}</span>}
                    <span className={styles.name}>{ar ? a.name_ar : a.name_en}</span>
                  </div>
                  <div className={styles.meta}>
                    {a.country_en && (
                      <span>{ar ? a.country_ar || a.country_en : a.country_en}</span>
                    )}
                    <span>
                      {t('aerodromesTool.elevation')}: {a.elev_ft.toLocaleString()} ft
                    </span>
                    {a.rwys.length > 0 && (
                      <span>
                        {t('aerodromesTool.runways')}: {a.rwys.map((r) => r.id).join(', ')}
                      </span>
                    )}
                  </div>
                  {a.freqs.length > 0 && (
                    <div className={styles.freqs}>
                      {a.freqs.map((f, i) => (
                        <span key={i} className={styles.freq}>
                          {f.l} {f.v}
                        </span>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </CalcShell>
  );
}
