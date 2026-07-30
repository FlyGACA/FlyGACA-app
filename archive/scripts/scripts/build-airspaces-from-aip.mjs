/**
 * build-airspaces-from-aip — parse the Saudi AIP ENR 2.1 (FIR/CTA/TMA/CTR) eAIP
 * page into the app's airspaces-index.json schema.
 *
 * The SANS eAIP portal (aimss.sans.com.sa) serves plain server-rendered HTML and
 * is directly fetchable (unlike gaca.gov.sa, which is bot-blocked), so this whole
 * step is automatable with no scraping service. Source HTML is fetched into
 * sync-input/assets/ENR-2.1.html, parsed with jsdom, and emitted as records.
 *
 * The app's airspace map is an APPROXIMATE "circles for study" depiction
 * (center [lat,lon] + radius_nm, optional polygon override) — see the `note`/
 * `schema` fields in public/data/airspaces-index.json. We keep the geometry the
 * AIP states verbatim where it is clean:
 *   - "Circle with radius of N NM centered on <DMS>"  -> center + radius_nm (exact)
 *   - a pure DMS vertex list (no arcs)                 -> polygon (exact ring)
 *   - boundaries containing arcs (FIR, ACC sectors,
 *     most CTAs)                                        -> `complex`, not written.
 *
 * Safety: existing airspaces are NEVER overwritten (only genuinely new ids are
 * added), parent headers are de-duplicated against their Part 1/2 children, and
 * every record passes a geometry sanity gate (its coordinates must sit near the
 * city named in its title) so a mis-sliced block can't smuggle wrong geometry in.
 *
 * Usage:
 *   node scripts/build-airspaces-from-aip.mjs            # report only (no writes)
 *   node scripts/build-airspaces-from-aip.mjs --write    # add NEW airspaces
 *   node scripts/build-airspaces-from-aip.mjs --fetch    # refetch eAIP HTML first
 *   node scripts/build-airspaces-from-aip.mjs --amdt "AIRAC AIP AMDT ..."
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { JSDOM } from 'jsdom';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const opt = (n, d) => {
  const i = argv.indexOf(n);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};

const AMDT = opt('--amdt', 'AIRAC AIP AMDT 05_26_2026_05_14');
const ENR21_URL = `https://aimss.sans.com.sa/assets/FileManagerFiles/${encodeURIComponent(AMDT)}/eAIP/ENR%202.1-en-GB.html`;
const HTML_PATH = 'sync-input/assets/ENR-2.1.html';
const INDEX_PATH = 'public/data/airspaces-index.json';
const TODAY = new Date().toISOString().slice(0, 10);

// Cities referenced by ENR 2.1, with Arabic name + a reference coordinate used
// by the sanity gate (record geometry must sit within ~2.2° of its city).
const CITY = {
  RIYADH: { ar: 'الرياض', lat: 24.9576, lon: 46.6988 },
  JEDDAH: { ar: 'جدة', lat: 21.6796, lon: 39.1565 },
  DAMMAM: { ar: 'الدمام', lat: 26.4711, lon: 49.7978 },
  MADINAH: { ar: 'المدينة المنورة', lat: 24.5534, lon: 39.7051 },
  ABHA: { ar: 'أبها', lat: 18.2403, lon: 42.6564 },
  TABUK: { ar: 'تبوك', lat: 28.3654, lon: 36.6189 },
  JAZAN: { ar: 'جازان', lat: 16.9011, lon: 42.5858 },
  TAIF: { ar: 'الطائف', lat: 21.4834, lon: 40.5444 },
  GASSIM: { ar: 'القصيم', lat: 26.3028, lon: 43.7744 },
  YANBU: { ar: 'ينبع', lat: 24.1442, lon: 38.0636 },
  HAIL: { ar: 'حائل', lat: 27.4379, lon: 41.6863 },
  'PRINCE SULTAN': { ar: 'الأمير سلطان', lat: 24.0628, lon: 47.5806 },
};
const TYPE_AR = { TMA: 'المنطقة الطرفية', CTA: 'منطقة المراقبة', CTR: 'منطقة المراقبة', FINAL: 'الموجّه النهائي' };

// --- helpers ---------------------------------------------------------------
const round = (n, p = 4) => Math.round(n * 10 ** p) / 10 ** p;

/** "272530N 0414059E" / "235620.80N 0425505.60E" -> [lat, lon] decimal. */
function dms(s) {
  const m = /(\d{2})(\d{2})(\d{2}(?:\.\d+)?)([NS])\s+0?(\d{2,3})(\d{2})(\d{2}(?:\.\d+)?)([EW])/.exec(s);
  if (!m) return null;
  let lat = +m[1] + +m[2] / 60 + +m[3] / 3600;
  if (m[4] === 'S') lat = -lat;
  let lon = +m[5] + +m[6] / 60 + +m[7] / 3600;
  if (m[8] === 'W') lon = -lon;
  return [round(lat), round(lon)];
}
const COORD = /\d{6}(?:\.\d+)?[NS]\s+0?\d{6}(?:\.\d+)?[EW]/g;
const centroid = (ring) => [
  round(ring.reduce((s, p) => s + p[0], 0) / ring.length),
  round(ring.reduce((s, p) => s + p[1], 0) / ring.length),
];
const slug = (s) =>
  s
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

function classify(name, block) {
  const type = /\bCTR\b|Control zone/i.test(name)
    ? 'CTR'
    : /FINAL\s*DIRECTOR/i.test(name)
      ? 'FINAL'
      : /\bTMA\b|Terminal/i.test(name)
        ? 'TMA'
        : /\bCTA\b|Control Area/i.test(name)
          ? 'CTA'
          : /\bFIR\b|UIR/i.test(name)
            ? 'FIR'
            : /SECTOR/i.test(name)
              ? 'SECTOR'
              : 'OTHER';
  const classLetter = (/Class of airspace:\s*([A-G])/i.exec(block) || [])[1] || null;
  const hasArc = /\barc\b/i.test(block);

  const circle = /Circle with radius of\s*(\d+(?:\.\d+)?)\s*NM\s*cent\w*\s*on\s*(\d{6}(?:\.\d+)?[NS]\s+0?\d{6}(?:\.\d+)?[EW])/i.exec(
    block,
  );
  let geometry = { kind: 'complex' };
  if (circle) {
    const c = dms(circle[2]);
    if (c) geometry = { kind: 'circle', center: c, radius_nm: Math.round(+circle[1]) };
  } else if (!hasArc) {
    const cut = block.search(/Class of airspace|UNL|FL\d|FT (?:AMSL|AGL)/i);
    const latText = cut > 0 ? block.slice(0, cut) : block;
    const ring = (latText.match(COORD) || []).map(dms).filter(Boolean);
    if (ring.length >= 3) geometry = { kind: 'polygon', polygon: ring };
  }
  return { name: name.trim(), type, classLetter, hasArc, geometry };
}

// --- fetch (optional) ------------------------------------------------------
if (has('--fetch') || !existsSync(join(root, HTML_PATH))) {
  console.log(`fetching ${ENR21_URL}`);
  const res = await fetch(ENR21_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
  });
  if (!res.ok) {
    console.error(`fetch failed: ${res.status} ${res.statusText}`);
    process.exit(1);
  }
  mkdirSync(join(root, 'sync-input/assets'), { recursive: true });
  writeFileSync(join(root, HTML_PATH), await res.text());
  console.log(`saved ${HTML_PATH}`);
}

// --- parse -----------------------------------------------------------------
const html = readFileSync(join(root, HTML_PATH), 'utf8');
const doc = new JSDOM(html).window.document;
const fullText = doc.body.textContent;

const HEADER = /^(Name|Lateral|Vertical|Class|Unit|providing|service|Call sign|languages|conditions|Frequency|Remarks|\d+)/i;
const names = [...doc.querySelectorAll('span.bold strong span')]
  .map((s) => s.textContent.replace(/\s+/g, ' ').trim())
  .filter((t) => t && !HEADER.test(t));

// Locate each name's offset independently and monotonically, KEEPING only those
// actually found. Blocks are sliced between consecutive *found* offsets — so a
// name that fails to match can never blow the next block to end-of-document
// (the bug that mis-assigned Abha's circle to a Riyadh final-director area).
const located = [];
let cursor = 0;
for (const n of names) {
  const pos = fullText.indexOf(n, cursor);
  if (pos < 0) continue;
  located.push({ name: n, pos });
  cursor = pos + n.length;
}
const records = located.map((cur, i) => {
  const end = i + 1 < located.length ? located[i + 1].pos : fullText.length;
  return classify(cur.name, fullText.slice(cur.pos, end));
});

// De-duplicate parent headers when their "Part 1/2" children exist (the parent
// block spans both parts and reads as `complex`; the parts carry clean geometry).
const partParents = new Set(
  records.filter((r) => /\bPart\s*\d/i.test(r.name)).map((r) => r.name.replace(/\s*Part\s*\d.*$/i, '').trim()),
);
const deduped = records.filter((r) => !partParents.has(r.name.trim()));

// --- map to app schema + sanity gate --------------------------------------
const DIR_AR = { EAST: 'شرق', WEST: 'غرب', NORTH: 'شمال', SOUTH: 'جنوب' };
const cityOf = (name) => {
  const up = name.toUpperCase();
  return Object.keys(CITY).find((c) => up.includes(c)) || null;
};
const titleCity = (k) => k.split(' ').map((w) => w[0] + w.slice(1).toLowerCase()).join(' ');

function mapRecord(r) {
  // CTAs are high-level (class A, FL150+) and mostly arc-bounded; skip them and
  // the FIR/sectors so only terminal/approach areas a VFR student needs land.
  if (r.geometry.kind === 'complex' || ['FIR', 'SECTOR', 'CTA'].includes(r.type)) return null;
  const cityKey = cityOf(r.name);
  const at = r.geometry.kind === 'circle' ? r.geometry.center : centroid(r.geometry.polygon);
  if (cityKey) {
    const c = CITY[cityKey];
    if (Math.abs(at[0] - c.lat) > 2.2 || Math.abs(at[1] - c.lon) > 2.2)
      return { reject: `${r.name}: geometry ${at} far from ${cityKey} (${c.lat},${c.lon})` };
  }
  const cityName = cityKey ? titleCity(cityKey) : 'KSA';
  const arCity = cityKey ? CITY[cityKey].ar : '';

  let id, name, name_ar;
  if (r.type === 'FINAL') {
    const dir = ((/\b(EAST|WEST|NORTH|SOUTH)\b/i.exec(r.name) || [])[1] || '').toUpperCase();
    const rwy = (/RWY\s*([0-9]{1,2}[LRC]?)/i.exec(r.name) || [])[1] || '';
    id = `${slug(cityName)}-FINAL-${dir.slice(0, 1)}-RWY${rwy}`.toUpperCase();
    name = `${cityName} Final Director — ${titleCity(dir)} RWY ${rwy}`.replace(/\s+/g, ' ').trim();
    name_ar = `الموجّه النهائي ${arCity} — ${DIR_AR[dir] || ''} المدرج ${rwy}`.replace(/\s+/g, ' ').trim();
  } else {
    // TMA (circle or polygon). One TMA per city; "Part N" collapsed downstream.
    id = `${slug(cityName)}-TMA`.toUpperCase();
    name = `${cityName} TMA`;
    name_ar = `${TYPE_AR.TMA} ${arCity}`.trim();
  }

  const rec = {
    id,
    name,
    name_ar,
    type: 'TMA',
    class: r.classLetter || 'C',
    center: at,
    radius_nm: r.geometry.kind === 'circle' ? r.geometry.radius_nm : 0,
    unit: cityName ? `${cityName} Approach` : '',
    sourceUrl: ENR21_URL,
    effectiveDate: TODAY,
  };
  if (r.geometry.kind === 'polygon') rec.polygon = r.geometry.polygon;
  return rec;
}

const rejects = [];
const byId = new Map();
for (const r of deduped) {
  const m = mapRecord(r);
  if (!m) continue;
  if (m.reject) {
    rejects.push(m.reject);
    continue;
  }
  // Collapse multi-part TMAs to one entry per city, keeping the largest radius
  // (the outer lateral extent) — matching the app's single-circle convention.
  const prev = byId.get(m.id);
  if (!prev || (m.radius_nm || 0) > (prev.radius_nm || 0)) byId.set(m.id, m);
}
const mapped = [...byId.values()];

// --- diff vs existing ------------------------------------------------------
const index = JSON.parse(readFileSync(join(root, INDEX_PATH), 'utf8'));
const existingIds = new Set(index.airspaces.map((a) => a.id));
// Also treat city+type collisions with the curated set as "already covered"
// (e.g. the AIP "RIYADH TMA Part 1" overlaps the curated OERK-TMA) so we only
// surface airspaces the app genuinely lacks.
const existingCityType = new Set(
  index.airspaces.map((a) => `${(a.name.split(' ')[0] || '').toUpperCase()}|${a.type}`),
);
const fresh = mapped.filter((m) => {
  if (existingIds.has(m.id)) return false;
  const key = `${(m.name.split(' ')[0] || '').toUpperCase()}|${m.type}`;
  // Final-director corridors and Prince Sultan have no curated equivalent.
  if (m.polygon || /FINAL|PRINCE/i.test(m.name)) return true;
  return !existingCityType.has(key);
});

// --- report / write --------------------------------------------------------
console.log(`\nParsed ${records.length} airspaces · ${deduped.length} after de-dup · AMDT ${AMDT}`);
console.log(`Mapped (clean, sanity-passed): ${mapped.length} · rejected by sanity gate: ${rejects.length}`);
for (const r of rejects) console.log(`  ✗ ${r}`);
console.log(`\nNEW airspaces the app lacks: ${fresh.length}`);
for (const m of fresh) {
  const g = m.polygon ? `polygon ${m.polygon.length}pts @ ${m.center}` : `circle r=${m.radius_nm} @ ${m.center}`;
  console.log(`  + [${m.type}/${m.class}] ${m.id}  "${m.name}" / "${m.name_ar}"  — ${g}`);
}

if (has('--write')) {
  index.airspaces.push(...fresh);
  index.count = index.airspaces.length;
  index.generated = TODAY;
  index.note +=
    index.note.includes('AIP ENR 2.1 import')
      ? ''
      : ' Additional terminal/approach areas imported verbatim from AIP ENR 2.1 (circle/polygon as published).';
  writeFileSync(join(root, INDEX_PATH), JSON.stringify(index, null, 1) + '\n');
  console.log(`\n✓ wrote ${fresh.length} new airspaces → ${INDEX_PATH} (count ${index.count}).`);
} else {
  console.log('\nReport only — re-run with --write to add these. Existing airspaces untouched.');
}
