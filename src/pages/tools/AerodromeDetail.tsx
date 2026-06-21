import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CalcShell } from '../../components/CalcShell';
import { useFetchJson } from '../../lib/useFetchJson';
import { regionBadge } from '../../lib/aerodromes';
import type { AirportsIndex } from '../../lib/content';
import styles from './Aerodromes.module.css';

export function AerodromeDetail() {
  const { t, i18n } = useTranslation();
  const ar = i18n.language === 'ar';
  const { icao = '' } = useParams();
  const code = icao.toUpperCase();
  const { data, error, loading } = useFetchJson<AirportsIndex>('/data/airports.json');

  const airport = useMemo(() => data?.airports.find((a) => a.icao === code), [data, code]);

  if (loading) {
    return (
      <CalcShell title={code} category={t('tools.categories.directory')}>
        <p>{t('common.loading')}</p>
      </CalcShell>
    );
  }
  if (error || (data && !airport)) {
    return (
      <CalcShell title={code} category={t('tools.categories.directory')}>
        <p role="alert">{error ? t('common.loadError') : t('aerodromesTool.notFound')}</p>
        <Link className={styles.back} to="/tools/aerodromes">
          ← {t('aerodromesTool.backToList')}
        </Link>
      </CalcShell>
    );
  }
  if (!airport) return null;

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
      category={t('tools.categories.directory')}
      formula={t('aerodromesTool.formula')}
      adelPrompt={adelPrompt}
      related={[{ to: '/tools/aerodromes', label: t('aerodromesTool.backToList') }]}
    >
      <div className={styles.detailHead}>
        <span className={styles.detailIcao}>{a.icao}</span>
        {a.iata && <span className={styles.iata}>{a.iata}</span>}
        <span className={`${styles.badge} ${styles[`badge_${badge}`]}`}>
          {t(`aerodromesTool.regions.${badge}`)}
        </span>
      </div>

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

      {a.rwys.length > 0 && (
        <section className={styles.detailSection}>
          <h2 className={styles.detailH2}>{t('aerodromesTool.runways')}</h2>
          <ul className={styles.rwyList}>
            {a.rwys.map((r, i) => (
              <li key={i} className={styles.rwyRow}>
                <span className={styles.rwyId}>{r.id}</span>
                {r.len && <span className={styles.rwyMeta}>{r.len.toLocaleString()} ft</span>}
                {r.surf && <span className={styles.rwyMeta}>{r.surf}</span>}
              </li>
            ))}
          </ul>
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
