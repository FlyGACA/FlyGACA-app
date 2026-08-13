import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { shardsForFilter, shardsForIdent, type AirportShardManifest } from '@/lib/airportShards';
import { inRegion, REGION_FILTERS, type RegionFilter } from '@/lib/aerodromes';
import type { Airport } from '@/lib/content';
import { shardByRegion, prefixKey, shardName } from '../scripts/lib/airport-shards.mjs';

/**
 * The long-tail aerodrome tier ships region-sharded so a region filter or an
 * ICAO lookup costs one small shard instead of the whole 2.8 MB gz tier.
 *
 * The load-bearing invariant is that shard selection is a SUPERSET of what the
 * filter matches: the pages still run `inRegion` over the rows they load, so
 * picking one shard too many costs bytes, but picking one too few silently drops
 * real aerodromes from the directory. Both halves are checked here — the pure
 * mapping, and the committed artifacts it is mapping over.
 */

const DIR = join(process.cwd(), 'public/data/airports-extra');
const manifest = JSON.parse(
  readFileSync(join(DIR, '_manifest.json'), 'utf8'),
) as AirportShardManifest;
const shardFile = (region: string) =>
  JSON.parse(readFileSync(join(DIR, `${region}.json`), 'utf8')) as {
    region: string;
    count: number;
    airports: Airport[];
  };

describe('committed airport shards', () => {
  it('the manifest agrees with the files on disk', () => {
    const onDisk = readdirSync(DIR)
      .filter((f) => f.endsWith('.json') && f !== '_manifest.json')
      .sort();
    const named = manifest.regions.map((r) => r.file).sort();
    expect(named).toEqual(onDisk);
    expect(manifest.regions.length).toBeGreaterThan(0);
  });

  it('every shard matches its manifest count and holds only its own region', () => {
    let total = 0;
    for (const entry of manifest.regions) {
      const shard = shardFile(entry.region);
      expect(shard.region).toBe(entry.region);
      expect(shard.airports.length).toBe(entry.count);
      expect(shard.count).toBe(entry.count);
      for (const a of shard.airports) {
        expect(shardName(a.region ?? '')).toBe(entry.region);
      }
      total += shard.airports.length;
    }
    expect(total).toBe(manifest.count);
  });

  it('no ident appears in two shards', () => {
    const seen = new Map<string, string>();
    for (const entry of manifest.regions) {
      for (const a of shardFile(entry.region).airports) {
        const prev = seen.get(a.icao);
        expect(prev, `${a.icao} in both ${prev} and ${entry.region}`).toBeUndefined();
        seen.set(a.icao, entry.region);
      }
    }
    expect(seen.size).toBe(manifest.count);
  });

  it('the prefix hint resolves every ident to the shard that holds it', () => {
    for (const entry of manifest.regions) {
      for (const a of shardFile(entry.region).airports) {
        const hinted = manifest.prefixes[prefixKey(a.icao)];
        expect(hinted, `no hint for ${a.icao}`).toBeDefined();
        expect(hinted, `hint for ${a.icao} omits ${entry.region}`).toContain(entry.region);
      }
    }
  });
});

describe('shardsForFilter', () => {
  it('never drops a row the filter would have matched', () => {
    // The superset invariant, checked against the real data: for every filter,
    // every row that `inRegion` accepts must live in a shard the mapping picks.
    for (const filter of REGION_FILTERS) {
      const picked = new Set(shardsForFilter(manifest, filter));
      for (const entry of manifest.regions) {
        if (picked.has(entry.region)) continue;
        const missed = shardFile(entry.region).airports.filter((a) => inRegion(a, filter));
        expect(
          missed.map((a) => a.icao).slice(0, 5),
          `filter "${filter}" skips shard ${entry.region} which holds matches`,
        ).toEqual([]);
      }
    }
  });

  it('"all" reads every shard', () => {
    expect(shardsForFilter(manifest, 'all').sort()).toEqual(
      manifest.regions.map((r) => r.region).sort(),
    );
  });

  it('the MENA hierarchy narrows to its own shards', () => {
    // Saudi long-tail rows are tagged GCC (only curated core rows carry KSA), so
    // the saudi filter must still read GCC.
    expect(shardsForFilter(manifest, 'saudi')).toContain('GCC');
    expect(shardsForFilter(manifest, 'gcc')).toContain('GCC');
    expect(shardsForFilter(manifest, 'gcc')).not.toContain('NA');
    expect(shardsForFilter(manifest, 'mena').sort()).toEqual(['GCC', 'MENA']);
    // world is everything outside the hierarchy.
    const world = shardsForFilter(manifest, 'world');
    expect(world).not.toContain('GCC');
    expect(world).not.toContain('MENA');
    expect(world).toContain('NA');
  });

  it('reads far fewer rows for a Gulf filter than for the whole tier', () => {
    const rows = (filter: RegionFilter) =>
      shardsForFilter(manifest, filter)
        .map((r) => manifest.regions.find((e) => e.region === r)?.count ?? 0)
        .reduce((n, c) => n + c, 0);
    expect(rows('gcc')).toBeLessThan(rows('all') / 20);
  });
});

describe('shardsForIdent', () => {
  // The long tail is keyed by the OurAirports `ident`, which for these rows is
  // usually a local code ("SA-0012", "AE-0001") rather than an ICAO one — the
  // real ICAO aerodromes live in the eager core file. So the hint is exercised
  // with a prefix the committed data actually has.
  it('resolves a known prefix, case-insensitively', () => {
    expect(shardsForIdent(manifest, 'SA-0012')).toEqual(manifest.prefixes.SA);
    expect(shardsForIdent(manifest, 'sa-0012')).toEqual(manifest.prefixes.SA);
    expect(manifest.prefixes.SA).toContain('GCC');
  });

  it('returns every candidate when a prefix spans regions', () => {
    const spanning = Object.entries(manifest.prefixes).find(([, v]) => v.length > 1);
    expect(spanning, 'expected at least one prefix in >1 region').toBeDefined();
    const [prefix, regions] = spanning!;
    expect(shardsForIdent(manifest, `${prefix}xx`)).toEqual(regions);
  });

  it('returns nothing for an unknown or empty ident, so the caller falls back', () => {
    expect(shardsForIdent(manifest, '@@nope')).toEqual([]);
    expect(shardsForIdent(manifest, '')).toEqual([]);
  });
});

describe('shardByRegion', () => {
  const mk = (icao: string, region: string): Airport =>
    ({
      icao,
      iata: '',
      name_en: '',
      name_ar: '',
      city_en: '',
      city_ar: '',
      lat: 0,
      lon: 0,
      elev_ft: 0,
      rwys: [],
      freqs: [],
      region,
    }) as Airport;

  it('groups by region, sorts by ident and records every prefix', () => {
    const { shards, prefixes } = shardByRegion([
      mk('OERK', 'GCC'),
      mk('KJFK', 'NA'),
      mk('OEJN', 'GCC'),
    ]);
    expect([...shards.keys()].sort()).toEqual(['GCC', 'NA']);
    expect(shards.get('GCC')!.map((a: Airport) => a.icao)).toEqual(['OEJN', 'OERK']);
    expect(prefixes.OE).toEqual(['GCC']);
    expect(prefixes.KJ).toEqual(['NA']);
  });

  it('routes a row with no region to a shard rather than dropping it', () => {
    const { shards } = shardByRegion([mk('ZZZZ', '')]);
    expect(shards.get('XX')!.length).toBe(1);
  });

  it('records both shards for a prefix that spans regions', () => {
    const { prefixes } = shardByRegion([mk('OEAA', 'GCC'), mk('OEBB', 'MENA')]);
    expect(prefixes.OE.sort()).toEqual(['GCC', 'MENA']);
  });
});
