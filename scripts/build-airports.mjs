/**
 * Generate public/data/airports.json from the open OurAirports dataset, merged
 * on top of the hand-curated Saudi records (scripts/airports-ksa.json).
 *
 * Coverage: ALL non-closed airports in the MENA region + every large/medium
 * airport worldwide. Non-Saudi rows carry core English fields only (ICAO, IATA,
 * name, city, country, lat/lon, elevation); runways/frequencies/Arabic names stay
 * exclusive to the curated Saudi set, which always wins on merge.
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
const CSV_URL =
  'https://raw.githubusercontent.com/davidmegginson/ourairports-data/main/airports.csv';
const OUT = join(root, 'public/data/airports.json');
const KSA = join(root, 'scripts/airports-ksa.json');

// MENA region (ISO-3166 alpha-2). Adjust here to widen/narrow regional coverage.
const MENA = new Set([
  'SA', 'AE', 'QA', 'BH', 'KW', 'OM', 'YE', 'IQ', 'JO', 'LB',
  'SY', 'IL', 'PS', 'EG', 'LY', 'TN', 'DZ', 'MA', 'SD',
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

const ICAO = /^[A-Z0-9]{4}$/;

async function main() {
  process.stdout.write(`Fetching ${CSV_URL} …\n`);
  const res = await fetch(CSV_URL);
  if (!res.ok) throw new Error(`OurAirports fetch failed: ${res.status} ${res.statusText}`);
  const rows = parseCsv(await res.text());
  const header = rows[0];
  const col = Object.fromEntries(header.map((h, i) => [h, i]));

  const byIcao = new Map();
  let scanned = 0;
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const type = row[col.type];
    const iso = row[col.iso_country];
    const ident = (row[col.ident] ?? '').toUpperCase();
    if (type === 'closed') continue;
    if (!ICAO.test(ident)) continue;
    const inMena = MENA.has(iso);
    const isWorldKeep = type === 'large_airport' || type === 'medium_airport';
    if (!inMena && !isWorldKeep) continue;
    scanned++;

    const lat = parseFloat(row[col.latitude_deg]);
    const lon = parseFloat(row[col.longitude_deg]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const elev = parseInt(row[col.elevation_ft], 10);
    const name = row[col.name] ?? ident;
    const muni = row[col.municipality] ?? '';

    byIcao.set(ident, {
      icao: ident,
      iata: row[col.iata_code] ?? '',
      name_en: name,
      name_ar: name,
      city_en: muni,
      city_ar: muni,
      country_en: countryName(iso, enRegion),
      country_ar: countryName(iso, arRegion),
      region: inMena ? 'MENA' : (row[col.continent] ?? ''),
      lat: Math.round(lat * 1e5) / 1e5,
      lon: Math.round(lon * 1e5) / 1e5,
      elev_ft: Number.isFinite(elev) ? elev : 0,
      rwys: [],
      freqs: [],
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
      `  scanned-kept ${scanned}, curated ${curated.length}\n`,
  );
  if (Buffer.byteLength(json) > 4e6) {
    process.stdout.write('  ⚠ output > 4 MB — consider tightening the worldwide filter.\n');
  }
}

main().catch((e) => {
  process.stderr.write(String(e?.stack ?? e) + '\n');
  process.exit(1);
});
