/**
 * airport-shards — split the long-tail aerodrome tier into per-region shards.
 *
 * Pure helpers (no fs, no network) so they are unit-testable and shared between
 * `scripts/build-airports.mjs` (which writes them from a fresh OurAirports pull)
 * and the one-off migration that produced the first committed set.
 *
 * WHY REGION. The long tail is ~66k airfields — 20.8 MB raw, 2.8 MB gzipped —
 * and both consumers used to fetch all of it:
 *   • /tools/aerodromes needs the tail only when a region filter or a search is
 *     active. The region filter maps 1:1 onto a shard, so filtering to GCC now
 *     costs 17 KB gz instead of 2.8 MB — the case that matters most for a Saudi
 *     product.
 *   • /tools/aerodromes/:icao needs exactly one record. It resolves the shard
 *     from the ident prefix via the manifest hint, so a Gulf lookup costs one
 *     17 KB shard instead of the whole tier.
 *
 * Region is the only shard axis: sharding by ident prefix as well would serve
 * the detail page more evenly but would duplicate all 20 MB, so the prefix hint
 * (3 KB gz for every 2-char prefix in the data) buys the same lookup for ~0.1%
 * of the bytes. Free-text search across every region still needs the whole tier
 * and fetches all shards in parallel — same bytes as before, but progressive.
 */

/** Region code used when a row somehow carries none — keeps every row routable. */
export const UNKNOWN_REGION = 'XX';

/** File-safe shard name for a region code. */
export function shardName(region) {
  return String(region || UNKNOWN_REGION).toUpperCase().replace(/[^A-Z0-9-]/g, '');
}

/** The prefix key a detail lookup derives from an ident. */
export function prefixKey(ident) {
  return String(ident || '').toUpperCase().slice(0, 2);
}

/**
 * Group long-tail rows by region.
 * @returns {{ shards: Map<string, object[]>, prefixes: Record<string, string[]> }}
 *   `prefixes` maps every 2-char ident prefix to the shards that contain it —
 *   usually one, since ICAO idents are allocated regionally.
 */
export function shardByRegion(airports) {
  const shards = new Map();
  const prefixSets = new Map();
  for (const a of airports) {
    const key = shardName(a.region || UNKNOWN_REGION);
    let rows = shards.get(key);
    if (!rows) { rows = []; shards.set(key, rows); }
    rows.push(a);

    const p = prefixKey(a.icao);
    if (!p) continue;
    let set = prefixSets.get(p);
    if (!set) { set = new Set(); prefixSets.set(p, set); }
    set.add(key);
  }
  for (const rows of shards.values()) {
    rows.sort((x, y) => String(x.icao).localeCompare(String(y.icao)));
  }
  const prefixes = {};
  for (const p of [...prefixSets.keys()].sort()) {
    prefixes[p] = [...prefixSets.get(p)].sort();
  }
  return { shards, prefixes };
}

/**
 * The manifest the client reads first: which shards exist, how big each is, and
 * the ident-prefix hint that turns a detail lookup into a single shard fetch.
 */
export function buildManifest({ shards, prefixes, generated, source, sourceUrl }) {
  const regions = [...shards.keys()].sort().map((region) => ({
    region,
    count: shards.get(region).length,
    file: `${region}.json`,
  }));
  return {
    generated,
    source,
    sourceUrl,
    count: regions.reduce((n, r) => n + r.count, 0),
    regions,
    prefixes,
  };
}

/** The payload written for one shard. */
export function shardPayload({ region, airports, generated, source, sourceUrl }) {
  return { generated, source, sourceUrl, region, count: airports.length, airports };
}
