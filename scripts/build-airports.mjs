/**
 * Generate the aerodrome directory data from the open OurAirports dataset,
 * merged on top of the hand-curated overlays (scripts/airports-ksa.json and
 * scripts/airports-hubs.json).
 *
 * Two tiers are emitted so the worldwide directory stays fast:
 *   • public/data/airports.json       — CORE, fetched eagerly by the page.
 *       MENA (incl. GCC) airports that carry a 4-char ICAO ident, every
 *       worldwide large/medium airport, and worldwide small airports with
 *       scheduled passenger service. Runways (len/surface) and frequencies are
 *       joined from runways.csv / airport-frequencies.csv. The curated overlays
 *       win on merge — they add Arabic names, magnetic variation and services.
 *   • public/data/airports-extra/<REGION>.json — LONG TAIL, sharded by region and
 *       fetched lazily, one shard at a time. Every other non-closed airfield
 *       worldwide (small strips, heliports, seaplane bases …), keyed by the
 *       OurAirports `ident` (which may be a local/GPS code rather than an ICAO
 *       code). Same shape + enrichment where the join has it.
 *       `airports-extra/_manifest.json` lists the shards and carries the
 *       ident-prefix hint the detail page uses to fetch exactly one of them.
 *       See scripts/lib/airport-shards.mjs for why region is the shard axis.
 *
 * Region tags: GCC countries → 'GCC', other MENA countries → 'MENA', otherwise
 * the OurAirports continent code. The curated rows keep their own 'KSA'.
 *
 * NETWORK: this environment only reaches OurAirports via the raw.githubusercontent
 * mirror (the ourairports.com host is blocked). The artifacts are committed; this
 * script just reproduces them.
 *
 *   node scripts/build-airports.mjs   (or: npm run build:airports)
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { shardByRegion, buildManifest, shardPayload } from './lib/airport-shards.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const RAW = 'https://raw.githubusercontent.com/davidmegginson/ourairports-data/main';
const CSV_URL = `${RAW}/airports.csv`;
const RWY_URL = `${RAW}/runways.csv`;
const FREQ_URL = `${RAW}/airport-frequencies.csv`;
const OUT_CORE = join(root, 'public/data/airports.json');
const OUT_EXTRA_DIR = join(root, 'public/data/airports-extra');
const OVERLAYS = [join(root, 'scripts/airports-ksa.json'), join(root, 'scripts/airports-hubs.json')];

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

/** Short type tag for the UI (large/medium/small/heliport/seaplane/balloonport). */
function shortType(type) {
  return (type || '').replace(/_airport$/, '').replace(/_base$/, '');
}

const SOURCE_URL = 'https://ourairports.com/data/';
const today = () => new Date().toISOString().slice(0, 10);

function writeArtifact(path, airports, source) {
  airports.sort((a, b) => a.icao.localeCompare(b.icao));
  const out = {
    generated: today(),
    source,
    sourceUrl: SOURCE_URL,
    count: airports.length,
    airports,
  };
  const json = JSON.stringify(out);
  writeFileSync(path, json + '\n');
  return Buffer.byteLength(json);
}

/**
 * Write the long-tail tier as per-region shards plus the manifest the client
 * reads first. Stale shards from an earlier run are removed, so a region that
 * empties out does not leave a file behind for the manifest to disagree with.
 * Exported shape and rationale live in scripts/lib/airport-shards.mjs.
 */
function writeExtraShards(airports, source, generated = today()) {
  const { shards, prefixes } = shardByRegion(airports);
  mkdirSync(OUT_EXTRA_DIR, { recursive: true });
  const keep = new Set(['_manifest.json', ...[...shards.keys()].map((r) => `${r}.json`)]);
  for (const f of readdirSync(OUT_EXTRA_DIR)) {
    if (f.endsWith('.json') && !keep.has(f)) rmSync(join(OUT_EXTRA_DIR, f));
  }
  let bytes = 0;
  for (const [region, rows] of shards) {
    const json = JSON.stringify(
      shardPayload({ region, airports: rows, generated, source, sourceUrl: SOURCE_URL }),
    );
    writeFileSync(join(OUT_EXTRA_DIR, `${region}.json`), json + '\n');
    bytes += Buffer.byteLength(json);
  }
  const manifest = buildManifest({ shards, prefixes, generated, source, sourceUrl: SOURCE_URL });
  const mJson = JSON.stringify(manifest);
  writeFileSync(join(OUT_EXTRA_DIR, '_manifest.json'), mJson + '\n');
  return { bytes: bytes + Buffer.byteLength(mJson), shards: shards.size, manifest };
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

  const core = new Map();
  const extra = new Map();
  let enriched = 0;
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const type = row[col.type];
    if (type === 'closed') continue;
    const iso = row[col.iso_country];
    const ident = (row[col.ident] ?? '').toUpperCase();
    if (!ident) continue;
    const lat = parseFloat(row[col.latitude_deg]);
    const lon = parseFloat(row[col.longitude_deg]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;

    const hasIcao = ICAO.test(ident);
    const inMena = MENA.has(iso);
    const isLarge = type === 'large_airport';
    const scheduled = row[col.scheduled_service] === 'yes';
    // CORE: MENA airports with a real ICAO ident, plus worldwide large/medium
    // hubs and scheduled small airports. Everything else non-closed is LONG TAIL.
    const coreKeep =
      hasIcao &&
      (inMena || isLarge || type === 'medium_airport' || (type === 'small_airport' && scheduled));

    const elev = parseInt(row[col.elevation_ft], 10);
    const name = row[col.name] ?? ident;
    const muni = row[col.municipality] ?? '';
    const rwys = runwaysByIdent.get(ident) ?? [];
    const freqs = freqsByIdent.get(ident) ?? [];
    if (rwys.length || freqs.length) enriched++;

    const record = {
      icao: ident,
      iata: row[col.iata_code] ?? '',
      name_en: name,
      name_ar: name,
      city_en: muni,
      city_ar: muni,
      country_en: countryName(iso, enRegion),
      country_ar: countryName(iso, arRegion),
      region: GCC.has(iso) ? 'GCC' : inMena ? 'MENA' : row[col.continent] ?? '',
      type: shortType(type),
      lat: Math.round(lat * 1e5) / 1e5,
      lon: Math.round(lon * 1e5) / 1e5,
      elev_ft: Number.isFinite(elev) ? elev : 0,
      rwys,
      freqs,
    };
    (coreKeep ? core : extra).set(ident, record);
  }

  // Curated overlays win, and land in CORE. Merge field-wise so the generated
  // `type` survives while curated Arabic names / services / region override.
  let curatedCount = 0;
  for (const file of OVERLAYS) {
    if (!existsSync(file)) continue;
    const records = JSON.parse(readFileSync(file, 'utf8')).airports ?? [];
    for (const a of records) {
      core.set(a.icao, { ...(core.get(a.icao) ?? {}), ...a });
      extra.delete(a.icao);
      curatedCount++;
    }
  }

  const coreBytes = writeArtifact(
    OUT_CORE,
    [...core.values()],
    'OurAirports (raw mirror) + curated Saudi/hub records — core tier',
  );
  const extraOut = writeExtraShards(
    [...extra.values()],
    'OurAirports (raw mirror) — long-tail tier (lazy, region-sharded)',
  );

  const mb = (n) => (n / 1e6).toFixed(2);
  process.stdout.write(
    `Wrote core ${core.size} airports (${mb(coreBytes)} MB) → public/data/airports.json\n` +
      `Wrote extra ${extra.size} airports (${mb(extraOut.bytes)} MB) across ` +
      `${extraOut.shards} region shards → public/data/airports-extra/\n` +
      `  total ${core.size + extra.size}, enriched ${enriched}, curated overlays ${curatedCount}\n`,
  );
  if (coreBytes > 4e6) {
    process.stdout.write('  ⚠ core output > 4 MB — consider tightening the core filter.\n');
  }
}

main().catch((e) => {
  process.stderr.write(String(e?.stack ?? e) + '\n');
  process.exit(1);
});
