/**
 * Generate public/data/airports.json from the open OurAirports dataset, merged
 * on top of the hand-curated Saudi records (scripts/airports-ksa.json).
 *
 * Coverage: ALL non-closed airports in the MENA region (large/medium/small) +
 * every large/medium airport worldwide. Runways and frequencies are joined from
 * the OurAirports runways.csv / airport-frequencies.csv for GCC + MENA airports
 * and for large worldwide hubs (kept narrow so the artifact stays well under the
 * size budget). The curated Saudi set always wins on merge — it additionally
 * carries Arabic names, magnetic variation, timezone and services.
 *
 * Region tags: GCC countries → 'GCC', other MENA countries → 'MENA', otherwise
 * the OurAirports continent code. The curated Saudi rows keep their own 'KSA'.
 *
 * NETWORK: this environment only reaches OurAirports via the raw.githubusercontent
 * mirror (the ourairports.com host is blocked). The artifact (public/data/airports.json)
 * is committed; this script just reproduces it.
 *
 *   node scripts/build-airports.mjs   (or: npm run build:airports)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const RAW = 'https://raw.githubusercontent.com/davidmegginson/ourairports-data/main';
const CSV_URL = `${RAW}/airports.csv`;
const RWY_URL = `${RAW}/runways.csv`;
const FREQ_URL = `${RAW}/airport-frequencies.csv`;
const OUT = join(root, 'public/data/airports.json');
const KSA = join(root, 'scripts/airports-ksa.json');

// Gulf Cooperation Council (ISO-3166 alpha-2) — tagged 'GCC' for the region filter.
const GCC = new Set(['SA', 'AE', 'QA', 'BH', 'KW', 'OM']);
// Wider MENA region (ISO-3166 alpha-2). GCC ⊂ MENA. Adjust here to widen/narrow.
const MENA = new Set([
  ...GCC,
  'YE', 'IQ', 'JO', 'LB', 'SY', 'IL', 'PS', 'EG', 'LY', 'TN', 'DZ', 'MA', 'SD',
]);

const enRegion = new Intl.DisplayNames(['en'], { type: 'region' });
const arRegion = new Intl.DisplayNames(['ar'], { type: 'region' });
const countryName = (iso, dn) => {
  try {
    return dn.of(iso) ?? iso;
  } catch {
    return iso;
  }
};

/** Minimal RFC-4180-ish CSV parser (handles quoted fields, commas, escaped quotes). */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

async function fetchCsv(url) {
  process.stdout.write(`Fetching ${url} …\n`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch failed: ${url} → ${res.status} ${res.statusText}`);
  const rows = parseCsv(await res.text());
  const col = Object.fromEntries(rows[0].map((h, i) => [h, i]));
  return { rows, col };
}

const ICAO = /^[A-Z0-9]{4}$/;

/** Tidy the OurAirports surface code into something human (e.g. "ASPH-G" → "Asphalt"). */
function cleanSurface(raw) {
  const s = (raw ?? '').trim().toUpperCase();
  if (!s) return '';
  if (s.includes('ASP') || s.includes('BIT') || s.includes('TAR') || s.includes('PEM'))
    return 'Asphalt';
  if (s.includes('CON') || s.includes('PEM ') || s.includes('CEM')) return 'Concrete';
  if (s.includes('GRS') || s.includes('GRASS') || s.includes('TURF')) return 'Grass';
  if (s.includes('GVL') || s.includes('GRAVEL')) return 'Gravel';
  if (s.includes('DIRT') || s.includes('GROUND') || s.includes('EARTH')) return 'Dirt';
  if (s.includes('WATER')) return 'Water';
  if (s.includes('SAND')) return 'Sand';
  if (s.includes('SNOW') || s.includes('ICE')) return 'Snow/Ice';
  return raw.trim();
}

/** Build ident → runways[] from runways.csv (skips closed runways). */
function indexRunways({ rows, col }) {
  const map = new Map();
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (row[col.closed] === '1') continue;
    const ident = (row[col.airport_ident] ?? '').toUpperCase();
    if (!ident) continue;
    const le = (row[col.le_ident] ?? '').trim();
    const he = (row[col.he_ident] ?? '').trim();
    const id = [le, he].filter(Boolean).join('/');
    if (!id) continue;
    const len = parseInt(row[col.length_ft], 10);
    const surf = cleanSurface(row[col.surface]);
    const rwy = { id };
    if (Number.isFinite(len) && len > 0) rwy.len = len;
    if (surf) rwy.surf = surf;
    if (!map.has(ident)) map.set(ident, []);
    map.get(ident).push(rwy);
  }
  return map;
}

/** Build ident → freqs[] from airport-frequencies.csv. */
function indexFreqs({ rows, col }) {
  const map = new Map();
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const ident = (row[col.airport_ident] ?? '').toUpperCase();
    if (!ident) continue;
    const l = (row[col.type] ?? '').trim();
    const v = (row[col.frequency_mhz] ?? '').trim();
    if (!l || !v) continue;
    if (!map.has(ident)) map.set(ident, []);
    map.get(ident).push({ l, v });
  }
  return map;
}

async function main() {
  const [airportsCsv, runwaysCsv, freqsCsv] = await Promise.all([
    fetchCsv(CSV_URL),
    fetchCsv(RWY_URL),
    fetchCsv(FREQ_URL),
  ]);
  const { rows, col } = airportsCsv;
  const runwaysByIdent = indexRunways(runwaysCsv);
  const freqsByIdent = indexFreqs(freqsCsv);

  const byIcao = new Map();
  let scanned = 0;
  let enriched = 0;
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const type = row[col.type];
    const iso = row[col.iso_country];
    const ident = (row[col.ident] ?? '').toUpperCase();
    if (type === 'closed') continue;
    if (!ICAO.test(ident)) continue;
    const inMena = MENA.has(iso);
    const isLarge = type === 'large_airport';
    const scheduled = row[col.scheduled_service] === 'yes';
    // MENA (incl. GCC) keeps everything down to small airfields. Worldwide keeps
    // large + medium hubs, plus small airports that carry scheduled passenger
    // service (real commercial fields, minus the noise of ~40k private airstrips).
    const isWorldKeep =
      isLarge ||
      type === 'medium_airport' ||
      (type === 'small_airport' && scheduled);
    if (!inMena && !isWorldKeep) continue;
    scanned++;

    const lat = parseFloat(row[col.latitude_deg]);
    const lon = parseFloat(row[col.longitude_deg]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const elev = parseInt(row[col.elevation_ft], 10);
    const name = row[col.name] ?? ident;
    const muni = row[col.municipality] ?? '';

    // Enrich runways/frequencies for GCC + MENA airports, large worldwide hubs,
    // and worldwide small airports that carry scheduled service.
    const wantDetail = inMena || isLarge || scheduled;
    const rwys = wantDetail ? runwaysByIdent.get(ident) ?? [] : [];
    const freqs = wantDetail ? freqsByIdent.get(ident) ?? [] : [];
    if (rwys.length || freqs.length) enriched++;

    byIcao.set(ident, {
      icao: ident,
      iata: row[col.iata_code] ?? '',
      name_en: name,
      name_ar: name,
      city_en: muni,
      city_ar: muni,
      country_en: countryName(iso, enRegion),
      country_ar: countryName(iso, arRegion),
      region: GCC.has(iso) ? 'GCC' : inMena ? 'MENA' : row[col.continent] ?? '',
      lat: Math.round(lat * 1e5) / 1e5,
      lon: Math.round(lon * 1e5) / 1e5,
      elev_ft: Number.isFinite(elev) ? elev : 0,
      rwys,
      freqs,
    });
  }

  // Curated Saudi records win: they carry runways, frequencies and Arabic names.
  const curated = JSON.parse(readFileSync(KSA, 'utf8')).airports;
  for (const a of curated) byIcao.set(a.icao, a);

  const airports = [...byIcao.values()].sort((a, b) => a.icao.localeCompare(b.icao));
  const out = {
    generated: new Date().toISOString().slice(0, 10),
    source: 'OurAirports (raw mirror) + curated Saudi records',
    sourceUrl: 'https://ourairports.com/data/',
    count: airports.length,
    airports,
  };
  const json = JSON.stringify(out);
  writeFileSync(OUT, json + '\n');

  const mb = (Buffer.byteLength(json) / 1e6).toFixed(2);
  process.stdout.write(
    `Wrote ${airports.length} airports (${mb} MB) → public/data/airports.json\n` +
      `  scanned-kept ${scanned}, enriched ${enriched}, curated ${curated.length}\n`,
  );
  if (Buffer.byteLength(json) > 4e6) {
    process.stdout.write('  ⚠ output > 4 MB — consider tightening the worldwide filter.\n');
  }
}

main().catch((e) => {
  process.stderr.write(String(e?.stack ?? e) + '\n');
  process.exit(1);
});
