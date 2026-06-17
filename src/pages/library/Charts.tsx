import { useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useFetchJson } from '../../lib/useFetchJson';
import { useUrlState } from '../../lib/useUrlState';
import { usePageMeta } from '../../lib/usePageMeta';
import type { ChartsIndex, ChartDoc } from '../../lib/content';
import { Disclaimer } from '../../components/Disclaimer';
import styles from './Charts.module.css';

/** Public path for a chart image (the index stores the legacy `assets/…` path). */
function chartSrc(doc: ChartDoc): string {
  return `/data/charts/${doc.slug}.jpg`;
}

export function Charts() {
  const { t } = useTranslation();
  usePageMeta(t('meta.charts'));
  const index = useFetchJson<ChartsIndex>('/data/charts-index.json');
  const docs = useMemo(() => index.data?.documents ?? [], [index.data]);
  const [params, setParam] = useUrlState({ chart: '' });

  const active = docs.find((d) => d.slug === params.chart) ?? docs[0];

  // Group by region for the selector.
  const regions = useMemo(() => {
    const map = new Map<string, ChartDoc[]>();
    for (const d of docs) {
      const list = map.get(d.region) ?? [];
      list.push(d);
      map.set(d.region, list);
    }
    return [...map.entries()];
  }, [docs]);

  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const overlayRef = useRef<L.ImageOverlay | null>(null);

  // Create the Leaflet map once the (data-gated) container is in the DOM.
  // Depends on docs.length so it runs after the index loads and the map div
  // renders — not just on the first, container-less mount.
  useEffect(() => {
    if (!mapEl.current || mapRef.current) return;
    const map = L.map(mapEl.current, {
      crs: L.CRS.Simple,
      minZoom: -4,
      maxZoom: 2,
      zoomControl: true,
      attributionControl: false,
    });
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      overlayRef.current = null;
    };
  }, [docs.length]);

  // Swap the image overlay whenever the active chart changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !active) return;
    const bounds: L.LatLngBoundsExpression = [
      [0, 0],
      [active.h, active.w],
    ];
    if (overlayRef.current) overlayRef.current.remove();
    overlayRef.current = L.imageOverlay(chartSrc(active), bounds, {
      alt: active.label,
    }).addTo(map);
    map.fitBounds(bounds);
  }, [active]);

  return (
    <section className={`container ${styles.page}`}>
      <p className={styles.back}>
        <Link to="/library">← {t('library.title')}</Link>
      </p>

      <header className={styles.head}>
        <h1>{t('charts.title')}</h1>
        <p className={styles.lead}>{t('charts.lead')}</p>
      </header>

      {index.loading && <p>{t('common.loading')}</p>}
      {index.error && <p role="alert">{t('common.loadError')}</p>}

      {docs.length > 0 && (
        <div className={styles.layout}>
          <nav className={styles.picker} aria-label={t('charts.title')}>
            {regions.map(([region, list]) => (
              <div key={region} className={styles.region}>
                <h2 className={styles.regionName}>{region}</h2>
                <div className={styles.variants}>
                  {list.map((d) => (
                    <button
                      key={d.slug}
                      type="button"
                      className={`${styles.variant} ${
                        active?.slug === d.slug ? styles.variantActive : ''
                      }`}
                      aria-pressed={active?.slug === d.slug}
                      onClick={() => setParam('chart', d.slug)}
                    >
                      {d.variant || t('charts.sheet')}
                      {d.date && <span className={styles.date}>{d.date}</span>}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </nav>

          <div className={styles.viewer}>
            <div className={styles.mapToolbar}>
              <span className={styles.activeLabel}>{active?.label}</span>
              {active && (
                <a className={styles.open} href={chartSrc(active)} target="_blank" rel="noopener">
                  {t('charts.openImage')}
                </a>
              )}
            </div>
            <div className={styles.map} ref={mapEl} role="img" aria-label={active?.label} />
          </div>
        </div>
      )}

      <Disclaimer />
    </section>
  );
}
