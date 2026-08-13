/**
 * Loader for the region-sharded long-tail aerodrome tier
 * (`/data/airports-extra/<REGION>.json` + `_manifest.json`).
 *
 * The long tail is ~66k airfields — 20.8 MB raw, 2.8 MB gzipped — and both
 * consumers used to fetch all of it to use a slice: the directory needs one
 * region when a region filter is on, the detail page needs one record. Sharding
 * by region turns "filter to GCC" into a 17 KB fetch and a Gulf ICAO lookup into
 * the same, with no duplicated bytes (see scripts/lib/airport-shards.mjs).
 *
 * Shard selection is only ever a SUPERSET of what a filter matches: the callers
 * still run `inRegion` over the rows they load, so a mapping that pulls one shard
 * too many costs bytes, never correctness.
 */

import { loadJson, type Airport } from '@/lib/content';
import type { RegionFilter } from '@/lib/aerodromes';

const DIR = '/data/airports-extra';

export interface AirportShardEntry {
  region: string;
  count: number;
  file: string;
}

export interface AirportShardManifest {
  generated: string;
  source: string;
  sourceUrl: string;
  count: number;
  regions: AirportShardEntry[];
  /** 2-char ident prefix → the shard regions that contain it. */
  prefixes: Record<string, string[]>;
}

interface AirportShard {
  region: string;
  count: number;
  airports: Airport[];
}

/** Region tags that sit inside the MENA hierarchy; everything else is `world`. */
const GCC_TAGS = ['KSA', 'GCC'];
const MENA_TAGS = ['KSA', 'GCC', 'MENA'];

/**
 * Which shards a directory filter needs.
 *
 * The hierarchy is Saudi ⊂ GCC ⊂ MENA (`inRegion`). In the long tail a Saudi
 * airfield is tagged `GCC` — the builder only writes `KSA` on the curated core
 * rows — so the `saudi` filter must still read the GCC shard, and `world`
 * excludes exactly the MENA-hierarchy tags.
 */
export function shardsForFilter(manifest: AirportShardManifest, filter: RegionFilter): string[] {
  const all = manifest.regions.map((r) => r.region);
  const has = (tags: string[]) => all.filter((r) => tags.includes(r));
  switch (filter) {
    case 'all':
      return all;
    case 'saudi':
      return has(GCC_TAGS);
    case 'gcc':
      return has(GCC_TAGS);
    case 'mena':
      return has(MENA_TAGS);
    case 'world':
      // `world` is everything outside the MENA hierarchy, so those shards can be
      // skipped entirely — a GCC-tagged row is never a `world` match.
      return all.filter((r) => !MENA_TAGS.includes(r));
    default:
      return all;
  }
}

/** Which shards could hold a given ident, from the manifest's prefix hint. */
export function shardsForIdent(manifest: AirportShardManifest, icao: string): string[] {
  const prefix = String(icao || '')
    .toUpperCase()
    .slice(0, 2);
  const hit = manifest.prefixes?.[prefix];
  return hit && hit.length > 0 ? hit : [];
}

export function loadAirportShardManifest(): Promise<AirportShardManifest> {
  return loadJson<AirportShardManifest>(`${DIR}/_manifest.json`);
}

/** One shard's rows. Cached per path by loadJson, so repeat views are free. */
export async function loadAirportShard(region: string): Promise<Airport[]> {
  const shard = await loadJson<AirportShard>(`${DIR}/${region}.json`);
  return shard.airports ?? [];
}

/** Several shards in parallel, concatenated. A shard that fails is skipped. */
export async function loadAirportShards(regions: string[]): Promise<Airport[]> {
  const results = await Promise.all(
    regions.map((r) => loadAirportShard(r).catch(() => [] as Airport[])),
  );
  return results.flat();
}

/** The long-tail rows a directory filter needs (a superset — callers still filter). */
export async function loadAirportsForFilter(filter: RegionFilter): Promise<Airport[]> {
  const manifest = await loadAirportShardManifest();
  return loadAirportShards(shardsForFilter(manifest, filter));
}

/**
 * Find one long-tail airfield by ident. Reads the prefix hint first so a lookup
 * costs a single shard; falls back to a full sweep only when the hint misses (an
 * ident whose prefix is absent from the manifest, e.g. a stale deep link).
 */
export async function findLongTailAirport(icao: string): Promise<Airport | null> {
  const code = String(icao || '').toUpperCase();
  if (!code) return null;
  const manifest = await loadAirportShardManifest();
  const hinted = shardsForIdent(manifest, code);
  const find = (rows: Airport[]) => rows.find((a) => a.icao?.toUpperCase() === code) ?? null;

  if (hinted.length > 0) {
    const hit = find(await loadAirportShards(hinted));
    if (hit) return hit;
  }
  const rest = manifest.regions.map((r) => r.region).filter((r) => !hinted.includes(r));
  if (rest.length === 0) return null;
  return find(await loadAirportShards(rest));
}
