import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { CalcShell } from '@/components/CalcShell';
import { useFetchJson } from '@/hooks/useFetchJson';
import { airportLd } from '@/lib/seo/jsonld';
import { regionBadge } from '@/lib/aerodromes';
import { type Airport, type AirportsIndex, type AirspacesIndex } from '@/lib/content';
import { findLongTailAirport } from '@/lib/airportShards';
import { AerodromeScope } from '@/components/aerodrome/AerodromeScope';
import { AirportTypeIcon } from '@/components/aerodrome/AirportTypeIcon';
import { RunwayDiagram } from '@/components/aerodrome/RunwayDiagram';
import { PositionMarker } from '@/components/aerodrome/PositionMarker';
import { DaylightStrip } from '@/components/aerodrome/DaylightStrip';
import styles from './Aerodromes.module.css';

export function AerodromeDetail() {
  const { t, i18n } = useTranslation();
  const ar = i18n.language === 'ar';
  const { icao = '' } = useParams();
  const code = icao.toUpperCase();
  const { data, error, loading } = useFetchJson<AirportsIndex>('/data/airports.json');
  const { data: airspaces } = useFetchJson<AirspacesIndex>('/data/airspaces-index.json');

  const inCore = useMemo(() => data?.airports.find((a) => a.icao === code), [data, code]);
  // Long-tail airfields aren't in the eager core file. The tail is region-sharded,
  // so this resolves the one shard the ident's prefix points at instead of pulling
  // all 66k rows — a Gulf lookup costs 17 KB rather than 2.8 MB.
  //
  // The result is stamped with the ident it belongs to, so navigating to another
  // :icao re-runs the lookup instead of reusing the last answer (and needs no
  // reset effect). `hit: null` means the sweep finished and the ident is not in
  // the tail; `tailHit === undefined` means "not resolved yet".
  const [found, setFound] = useState<{ code: string; hit: Airport | null } | null>(null);
  const [extraLoading, setExtraLoading] = useState(false);
  const tailHit = found?.code === code ? found.hit : undefined;
  useEffect(() => {
    if (!data || inCore || tailHit !== undefined || extraLoading) return;
    let cancelled = false;
    const forCode = code;
    setExtraLoading(true);
    findLongTailAirport(forCode)
      .then((hit) => {
        if (!cancelled) setFound({ code: forCode, hit });
      })
      .catch(() => {
        if (!cancelled) setFound({ code: forCode, hit: null });
      })
      .finally(() => {
        if (!cancelled) setExtraLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [data, inCore, tailHit, extraLoading, code]);

  const airport = inCore ?? tailHit ?? undefined;

  if (loading || (!inCore && (extraLoading || (data && tailHit === undefined)))) {
    return (
      <CalcShell title={code} category={t('tools.categories.procedures')}>
        <p>{t('common.loading')}</p>
      </CalcShell>
    );
  }
  if (error || !airport) {
    return (
      // Unknown ICAO (or a failed load) has no content to index — noindex the soft-404.
      <CalcShell title={code} category={t('tools.categories.procedures')} noindex>
        <p role="alert">{error ? t('common.loadError') : t('aerodromesTool.notFound')}</p>
        <Link className={styles.back} to="/tools/aerodromes">
          ← {t('aerodromesTool.backToList')}
        </Link>
      </CalcShell>
    );
  }

  const a = airport;
  const name = ar ? a.name_ar : a.name_en;
  const country = ar ? a.country_ar || a.country_en : a.country_en;
  const city = ar ? a.city_ar || a.city_en : a.city_en;
  const badge = regionBadge(a);

  const adelPrompt = () =>
    ar
      ? `أخبرني عن مطار ${name} (${a.icao}): المدارج والترددات والخدمات.`
      : `Tell me about ${name} (${a.icao}): runways, frequencies and services.`;

  return (
    <CalcShell
      title={`${a.icao} — ${name}`}
      intro={[city, country].filter(Boolean).join(', ')}
      category={t('tools.categories.procedures')}
      formula={t('aerodromesTool.formula')}
      adelPrompt={adelPrompt}
      related={[{ to: '/tools/aerodromes', label: t('aerodromesTool.backToList') }]}
      primaryLd={airportLd({
        name,
        icao: a.icao,
        iata: a.iata,
        path: `/tools/aerodromes/${a.icao}`,
        lat: a.lat,
        lon: a.lon,
        elevationFt: a.elev_ft,
        country,
      })}
    >
      <div className={styles.detailHead}>
        <AirportTypeIcon type={a.type} className={styles.detailTypeIcon} />
        <span className={styles.detailIcao}>{a.icao}</span>
        {a.iata && <span className={styles.iata}>{a.iata}</span>}
        <span className={`${styles.badge} ${styles[`badge_${badge}`]}`}>
          {t(`aerodromesTool.regions.${badge}`)}
        </span>
      </div>

      <div className={styles.overview}>
        <dl className={styles.facts}>
          {country && (
            <div className={styles.fact}>
              <dt>{t('aerodromesTool.country')}</dt>
              <dd>{country}</dd>
            </div>
          )}
          <div className={styles.fact}>
            <dt>{t('aerodromesTool.elevation')}</dt>
            <dd>{a.elev_ft.toLocaleString()} ft</dd>
          </div>
          <div className={styles.fact}>
            <dt>{t('aerodromesTool.coordinates')}</dt>
            <dd className={styles.coords}>
              {a.lat.toFixed(4)}, {a.lon.toFixed(4)}
            </dd>
          </div>
          {a.mag && (
            <div className={styles.fact}>
              <dt>{t('aerodromesTool.magVar')}</dt>
              <dd>{a.mag}</dd>
            </div>
          )}
        </dl>
        <PositionMarker lat={a.lat} lon={a.lon} />
      </div>

      <section className={styles.detailSection}>
        <h2 className={styles.detailH2}>{t('aerodromesTool.daylight')}</h2>
        <DaylightStrip lat={a.lat} lon={a.lon} />
      </section>

      {a.rwys.length > 0 && (
        <section className={styles.detailSection}>
          <h2 className={styles.detailH2}>{t('aerodromesTool.runways')}</h2>
          <div className={styles.rwyLayout}>
            <RunwayDiagram rwys={a.rwys} />
            <ul className={styles.rwyList}>
              {a.rwys.map((r, i) => (
                <li key={i} className={styles.rwyRow}>
                  <span className={styles.rwyId}>{r.id}</span>
                  {r.len && <span className={styles.rwyMeta}>{r.len.toLocaleString()} ft</span>}
                  {r.surf && <span className={styles.rwyMeta}>{r.surf}</span>}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {a.freqs.length > 0 && (
        <section className={styles.detailSection}>
          <h2 className={styles.detailH2}>{t('aerodromesTool.freqs')}</h2>
          <div className={styles.pills}>
            {a.freqs.map((f, i) => (
              <span key={i} className={styles.freq}>
                {f.l} {f.v}
              </span>
            ))}
          </div>
        </section>
      )}

      {a.services && a.services.length > 0 && (
        <section className={styles.detailSection}>
          <h2 className={styles.detailH2}>{t('aerodromesTool.services')}</h2>
          <dl className={styles.facts}>
            {a.services.map((s, i) => (
              <div key={i} className={styles.fact}>
                <dt>{s.l}</dt>
                <dd>{s.v}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <AerodromeScope
        center={{ lat: a.lat, lon: a.lon }}
        icao={a.icao}
        zones={airspaces?.airspaces ?? []}
      />

      <a
        className={styles.map}
        href={`https://www.google.com/maps?q=${a.lat},${a.lon}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        {t('aerodromesTool.viewMap')}
      </a>
    </CalcShell>
  );
}
