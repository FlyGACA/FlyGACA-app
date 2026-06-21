import type { Airport } from './content';

/** Region filter buckets for the aerodromes directory. */
export type RegionFilter = 'all' | 'saudi' | 'gcc' | 'mena' | 'world';

export const REGION_FILTERS: RegionFilter[] = ['all', 'saudi', 'gcc', 'mena', 'world'];

/** A concrete region a single airport belongs to (the `all` bucket excluded). */
export type RegionBadge = Exclude<RegionFilter, 'all'>;

/**
 * Region tags as written by scripts/build-airports.mjs: curated Saudi rows carry
 * 'KSA', other Gulf states 'GCC', the wider region 'MENA', the rest a continent
 * code. The filter buckets are hierarchical (Saudi ⊂ GCC ⊂ MENA).
 */
export function inRegion(a: Airport, filter: RegionFilter): boolean {
  const r = a.region ?? '';
  const saudi = r === 'KSA' || a.country_en === 'Saudi Arabia';
  switch (filter) {
    case 'all':
      return true;
    case 'saudi':
      return saudi;
    case 'gcc':
      return r === 'GCC' || saudi;
    case 'mena':
      return r === 'MENA' || r === 'GCC' || saudi;
    case 'world':
      return r !== 'MENA' && r !== 'GCC' && !saudi;
  }
}

/** The badge bucket shown on a card / detail page for a single airport. */
export function regionBadge(a: Airport): RegionBadge {
  const r = a.region ?? '';
  if (r === 'KSA' || a.country_en === 'Saudi Arabia') return 'saudi';
  if (r === 'GCC') return 'gcc';
  if (r === 'MENA') return 'mena';
  return 'world';
}
