/**
 * The flight-tools registry — the single source of truth for the catalog.
 * Names/blurbs/category labels are resolved from i18n by id (so they stay
 * bilingual); this file holds only structure (route, category, status, search
 * keywords). Flip `status` to 'live' as each tool ships, and add its route to
 * src/router.tsx.
 */

export type ToolCategoryId =
  | 'wind-runway'
  | 'atmosphere'
  | 'speed'
  | 'climb-descent'
  | 'navigation'
  | 'fuel-weight'
  | 'time-cycles'
  | 'weather'
  | 'gacar'
  | 'currency'
  | 'procedures'
  | 'reference'
  | 'directory';

export interface ToolMeta {
  id: string;
  route: string;
  category: ToolCategoryId;
  status: 'live' | 'soon';
  badge?: 'new';
  /** Language-neutral search hints (abbreviations, alt names). */
  keywords?: string[];
}

/** Display order of the categories in the hub. */
export const TOOL_CATEGORIES: ToolCategoryId[] = [
  'wind-runway',
  'atmosphere',
  'speed',
  'climb-descent',
  'navigation',
  'fuel-weight',
  'time-cycles',
  'weather',
  'gacar',
  'currency',
  'procedures',
  'reference',
  'directory',
];

const t = (
  id: string,
  category: ToolCategoryId,
  status: 'live' | 'soon',
  opts: { badge?: 'new'; keywords?: string[]; route?: string } = {},
): ToolMeta => ({
  id,
  route: opts.route ?? `/tools/${id}`,
  category,
  status,
  badge: opts.badge,
  keywords: opts.keywords,
});

export const TOOLS: ToolMeta[] = [
  // Wind & runway
  t('crosswind', 'wind-runway', 'live', { keywords: ['xwind', 'headwind', 'runway'] }),
  t('wind-table', 'wind-runway', 'live', { badge: 'new', keywords: ['all runways', 'components'] }),
  t('hydroplaning', 'wind-runway', 'live', {
    badge: 'new',
    keywords: ['aquaplaning', 'tyre', 'tire'],
  }),
  t('takeoff-landing', 'wind-runway', 'live', {
    keywords: ['tora', 'lda', 'distance', 'performance'],
  }),

  // Atmosphere & altitude
  t('density-altitude', 'atmosphere', 'live', { keywords: ['da', 'pa', 'isa'] }),
  t('pressure-altitude', 'atmosphere', 'live', {
    badge: 'new',
    keywords: ['pa', 'flight level', 'fl'],
  }),
  t('isa', 'atmosphere', 'live', { badge: 'new', keywords: ['standard atmosphere', 'deviation'] }),
  t('altimeter', 'atmosphere', 'live', { badge: 'new', keywords: ['qnh', 'qfe', 'setting'] }),
  t('cloud-base', 'atmosphere', 'live', { keywords: ['dew point', 'spread', 'lcl'] }),

  // Speed
  t('tas', 'speed', 'live', { keywords: ['true airspeed', 'cas', 'mach'] }),
  t('mach', 'speed', 'live', { badge: 'new', keywords: ['speed of sound', 'tas'] }),

  // Climb, descent & turns
  t('climb-gradient', 'climb-descent', 'live', {
    badge: 'new',
    keywords: ['ft/nm', 'fpm', 'sid', 'percent'],
  }),
  t('top-of-descent', 'climb-descent', 'live', { keywords: ['tod', 'descent point'] }),
  t('descent-vdp', 'climb-descent', 'live', {
    badge: 'new',
    keywords: ['rate', 'vdp', 'glidepath'],
  }),
  t('standard-rate-turn', 'climb-descent', 'live', {
    badge: 'new',
    keywords: ['rate one', 'bank', 'radius'],
  }),

  // Navigation & planning
  t('wind-triangle', 'navigation', 'live', {
    badge: 'new',
    keywords: ['heading', 'groundspeed', 'wca'],
  }),
  t('great-circle', 'navigation', 'live', {
    badge: 'new',
    keywords: ['distance', 'bearing', 'gc'],
  }),
  t('one-in-sixty', 'navigation', 'live', {
    badge: 'new',
    keywords: ['track error', 'correction'],
  }),
  t('tsd', 'navigation', 'live', { keywords: ['time speed distance'] }),
  t('e6b', 'navigation', 'live', { keywords: ['flight computer', 'whiz wheel'] }),
  t('route-planner', 'navigation', 'soon', { keywords: ['leg', 'eta', 'wind'] }),
  t('flight-plan', 'navigation', 'soon', { keywords: ['icao fpl', 'filing'] }),

  // Fuel & weight
  t('fuel', 'fuel-weight', 'live', { keywords: ['burn', 'endurance', 'range'] }),
  t('specific-range', 'fuel-weight', 'live', {
    badge: 'new',
    keywords: ['nm per kg', 'efficiency'],
  }),
  t('weight-balance', 'fuel-weight', 'live', { keywords: ['cg', 'mac', 'moment', 'wb'] }),

  // Time & cycles
  t('zulu-clock', 'time-cycles', 'live', { badge: 'new', keywords: ['utc', 'ksa', 'local', 'z'] }),
  t('airac', 'time-cycles', 'live', { keywords: ['cycle', '28 day', 'effective'] }),
  t('sun-times', 'time-cycles', 'live', { keywords: ['sunrise', 'sunset', 'twilight', 'night'] }),

  // Weather & decoding
  t('metar', 'weather', 'live', { keywords: ['decode', 'observation'] }),
  t('taf', 'weather', 'live', { badge: 'new', keywords: ['forecast', 'decode'] }),
  t('notam', 'weather', 'live', { keywords: ['q code', 'decode'] }),
  t('met-brief', 'weather', 'soon', { keywords: ['route', 'weather briefing'] }),

  // GACAR regulatory lookups
  t('vfr-minima', 'gacar', 'live', {
    badge: 'new',
    keywords: ['visibility', 'cloud clearance', 'airspace'],
  }),
  t('oxygen', 'gacar', 'live', { badge: 'new', keywords: ['o2', 'altitude', 'part 91'] }),
  t('fuel-reserves', 'gacar', 'live', {
    badge: 'new',
    keywords: ['reserve', 'alternate', 'part 121'],
  }),
  t('conversion-checker', 'gacar', 'live', { keywords: ['foreign licence', 'convert'] }),

  // Currency & validity
  t('part61-currency', 'currency', 'live', {
    keywords: ['90 day', 'night', 'passenger', 'recency'],
  }),
  t('medical-validity', 'currency', 'live', {
    badge: 'new',
    keywords: ['class 1', 'class 2', 'expiry'],
  }),
  t('flight-review', 'currency', 'live', { badge: 'new', keywords: ['ipc', 'bfr', 'due'] }),

  // Procedures & R/T
  t('holding', 'procedures', 'live', { keywords: ['entry', 'teardrop', 'parallel'] }),
  t('procedural-separation', 'procedures', 'live', { keywords: ['separation', 'minima'] }),
  t('vfr-brief', 'procedures', 'live', { keywords: ['checklist', 'preflight'] }),
  t('loa', 'procedures', 'live', { keywords: ['letter of authorization'] }),

  // Quick reference
  t('transponder', 'reference', 'live', {
    badge: 'new',
    keywords: ['squawk', '7500', '7600', '7700'],
  }),
  t('phonetic', 'reference', 'live', {
    badge: 'new',
    keywords: ['alphabet', 'morse', 'alpha bravo'],
  }),
  t('units', 'reference', 'live', { keywords: ['converter', 'feet', 'metres', 'knots'] }),
  t('chart-symbols', 'reference', 'live', { keywords: ['legend', 'vfr chart'] }),

  // Directory & glossary
  t('aerodromes', 'directory', 'live', { keywords: ['airport', 'icao', 'oerk', 'oejn'] }),
  t('airspace', 'directory', 'live', { keywords: ['frequency', 'acc', 'tma', 'ctr'] }),
  t('definitions', 'directory', 'live', { keywords: ['glossary', 'part 1', 'terms'] }),
];

export const liveTools = () => TOOLS.filter((x) => x.status === 'live');
export const toolsByCategory = (c: ToolCategoryId) => TOOLS.filter((x) => x.category === c);
