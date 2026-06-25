import { describe, expect, it } from 'vitest';
import type { Airport } from '../src/lib/content';
import {
  REGION_FILTERS,
  inRegion,
  regionBadge,
  regionRank,
  compareAirports,
} from '../src/lib/aerodromes';

// inRegion / regionBadge / regionRank only read `icao`, `region` and
// `country_en`, so the fixture supplies just those (cast through unknown to
// satisfy the wide Airport interface without irrelevant boilerplate).
function ap(fields: Partial<Airport>): Airport {
  return { icao: 'ZZZZ', ...fields } as unknown as Airport;
}

const ksa = ap({ icao: 'OERK', region: 'KSA' });
const ksaByCountry = ap({ icao: 'OEJN', country_en: 'Saudi Arabia' });
const gcc = ap({ icao: 'OMDB', region: 'GCC' });
const mena = ap({ icao: 'HECA', region: 'MENA' });
const world = ap({ icao: 'KLAX', region: 'NA' });
const worldNoRegion = ap({ icao: '05AK' });

describe('inRegion', () => {
  it('matches everything in the "all" bucket', () => {
    for (const a of [ksa, gcc, mena, world, worldNoRegion]) {
      expect(inRegion(a, 'all')).toBe(true);
    }
  });

  it('treats a Saudi country_en as Saudi even without a region tag', () => {
    expect(inRegion(ksaByCountry, 'saudi')).toBe(true);
  });

  it('nests Saudi inside GCC and MENA (hierarchical buckets)', () => {
    expect(inRegion(ksa, 'gcc')).toBe(true);
    expect(inRegion(ksa, 'mena')).toBe(true);
    expect(inRegion(gcc, 'mena')).toBe(true);
  });

  it('does not promote a GCC airport into the Saudi bucket', () => {
    expect(inRegion(gcc, 'saudi')).toBe(false);
  });

  it('excludes MENA/GCC/Saudi from the "world" bucket', () => {
    expect(inRegion(ksa, 'world')).toBe(false);
    expect(inRegion(gcc, 'world')).toBe(false);
    expect(inRegion(mena, 'world')).toBe(false);
    expect(inRegion(world, 'world')).toBe(true);
    expect(inRegion(worldNoRegion, 'world')).toBe(true);
  });

  it('covers every declared filter bucket', () => {
    // Guards against a new RegionFilter being added without a matching branch.
    for (const f of REGION_FILTERS) {
      expect(typeof inRegion(ksa, f)).toBe('boolean');
    }
  });
});

describe('regionBadge', () => {
  it('maps each airport to its primary bucket', () => {
    expect(regionBadge(ksa)).toBe('saudi');
    expect(regionBadge(ksaByCountry)).toBe('saudi');
    expect(regionBadge(gcc)).toBe('gcc');
    expect(regionBadge(mena)).toBe('mena');
    expect(regionBadge(world)).toBe('world');
    expect(regionBadge(worldNoRegion)).toBe('world');
  });
});

describe('regionRank', () => {
  it('orders Saudi -> GCC -> MENA -> World', () => {
    expect(regionRank(ksa)).toBe(0);
    expect(regionRank(gcc)).toBe(1);
    expect(regionRank(mena)).toBe(2);
    expect(regionRank(world)).toBe(3);
  });
});

describe('compareAirports', () => {
  it('sorts by region rank first', () => {
    const sorted = [world, mena, gcc, ksa].sort(compareAirports);
    expect(sorted.map((a) => a.icao)).toEqual(['OERK', 'OMDB', 'HECA', 'KLAX']);
  });

  it('breaks ties within a region by ICAO', () => {
    const a = ap({ icao: 'OEMA', region: 'KSA' });
    const b = ap({ icao: 'OEDF', region: 'KSA' });
    expect([a, b].sort(compareAirports).map((x) => x.icao)).toEqual(['OEDF', 'OEMA']);
  });

  it('keeps the directory Saudi-first instead of leading with low ICAOs', () => {
    const sorted = [worldNoRegion, ksa].sort(compareAirports);
    expect(sorted[0].icao).toBe('OERK');
  });
});
