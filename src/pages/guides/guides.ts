/** Guide slugs (order shown in the index) and the tools each guide links to. */
export const GUIDE_SLUGS = [
  'saudi-ppl-requirements',
  'saudi-cpl-requirements',
  'saudi-instrument-rating',
  'night-rating',
  'atpl-requirements',
  'flight-instructor-rating',
  'gaca-medical-class-1',
  'foreign-license-conversion-to-gaca',
  'icao-english-saelpt',
  'radiotelephony-phraseology',
  'airspace-explained',
  'drone-uas-rules-in-ksa',
  'weight-and-balance-basics',
  'density-altitude-and-performance',
  'fuel-planning-and-reserves',
  'reading-metar-taf',
  'decoding-notams',
  'the-airac-cycle',
] as const;

export type GuideSlug = (typeof GUIDE_SLUGS)[number];

export type GuideTopic =
  | 'licensing'
  | 'medical'
  | 'language'
  | 'airspace'
  | 'weather'
  | 'planning'
  | 'operations'
  | 'performance';
export type GuideLevel = 'beginner' | 'intermediate' | 'advanced';

/** Topic display order in the index. */
export const GUIDE_TOPICS: GuideTopic[] = [
  'licensing',
  'medical',
  'language',
  'airspace',
  'operations',
  'performance',
  'weather',
  'planning',
];

/** Per-guide classification — structure only; labels are localized in i18n. */
export const GUIDE_META: Record<GuideSlug, { topic: GuideTopic; level: GuideLevel }> = {
  'saudi-ppl-requirements': { topic: 'licensing', level: 'beginner' },
  'saudi-cpl-requirements': { topic: 'licensing', level: 'intermediate' },
  'saudi-instrument-rating': { topic: 'licensing', level: 'intermediate' },
  'night-rating': { topic: 'licensing', level: 'intermediate' },
  'atpl-requirements': { topic: 'licensing', level: 'advanced' },
  'flight-instructor-rating': { topic: 'licensing', level: 'advanced' },
  'gaca-medical-class-1': { topic: 'medical', level: 'beginner' },
  'foreign-license-conversion-to-gaca': { topic: 'licensing', level: 'intermediate' },
  'icao-english-saelpt': { topic: 'language', level: 'beginner' },
  'radiotelephony-phraseology': { topic: 'language', level: 'beginner' },
  'airspace-explained': { topic: 'airspace', level: 'beginner' },
  'drone-uas-rules-in-ksa': { topic: 'operations', level: 'beginner' },
  'weight-and-balance-basics': { topic: 'performance', level: 'beginner' },
  'density-altitude-and-performance': { topic: 'performance', level: 'intermediate' },
  'fuel-planning-and-reserves': { topic: 'operations', level: 'intermediate' },
  'reading-metar-taf': { topic: 'weather', level: 'beginner' },
  'decoding-notams': { topic: 'planning', level: 'intermediate' },
  'the-airac-cycle': { topic: 'planning', level: 'intermediate' },
};

/** Stable DOM id for a guide section heading (for the TOC + progress anchors). */
export function sectionId(index: number, heading: string): string {
  const base = heading
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `sec-${index}-${base || 'section'}`;
}

/** Related tool routes per guide (label comes from the tool's i18n name). */
export const GUIDE_TOOLS: Record<string, string[]> = {
  'gaca-medical-class-1': ['/tools/medical-validity'],
  'foreign-license-conversion-to-gaca': ['/tools/conversion-checker'],
  'airspace-explained': ['/tools/airspace', '/tools/vfr-minima'],
  'reading-metar-taf': ['/tools/metar', '/tools/taf'],
  'decoding-notams': ['/tools/notam'],
  'the-airac-cycle': ['/tools/airac'],
  'saudi-ppl-requirements': ['/tools/part61-currency'],
  'night-rating': ['/tools/sun-times'],
  'flight-instructor-rating': ['/tools/flight-review'],
  'radiotelephony-phraseology': ['/tools/phonetic', '/tools/transponder'],
  'weight-and-balance-basics': ['/tools/weight-balance'],
  'density-altitude-and-performance': ['/tools/density-altitude', '/tools/takeoff-landing'],
  'fuel-planning-and-reserves': ['/tools/fuel', '/tools/specific-range'],
};

/** Tool route → i18n name key, for rendering related-tool chips. */
export const TOOL_NAME_KEY: Record<string, string> = {
  '/tools/medical-validity': 'tools.items.medical-validity.name',
  '/tools/conversion-checker': 'tools.items.conversion-checker.name',
  '/tools/airspace': 'tools.items.airspace.name',
  '/tools/vfr-minima': 'tools.items.vfr-minima.name',
  '/tools/metar': 'tools.items.metar.name',
  '/tools/taf': 'tools.items.taf.name',
  '/tools/notam': 'tools.items.notam.name',
  '/tools/airac': 'tools.items.airac.name',
  '/tools/part61-currency': 'tools.items.part61-currency.name',
  '/tools/sun-times': 'tools.items.sun-times.name',
  '/tools/flight-review': 'tools.items.flight-review.name',
  '/tools/phonetic': 'tools.items.phonetic.name',
  '/tools/transponder': 'tools.items.transponder.name',
  '/tools/weight-balance': 'tools.items.weight-balance.name',
  '/tools/density-altitude': 'tools.items.density-altitude.name',
  '/tools/takeoff-landing': 'tools.items.takeoff-landing.name',
  '/tools/fuel': 'tools.items.fuel.name',
  '/tools/specific-range': 'tools.items.specific-range.name',
};

/** GACAR library doc slugs each guide cites (see public/data/gacar-index.json). */
export const GUIDE_REGS: Record<string, string[]> = {
  'saudi-ppl-requirements': ['part-61', 'part-91'],
  'saudi-cpl-requirements': ['part-61'],
  'saudi-instrument-rating': ['part-61', 'part-91'],
  'night-rating': ['part-61', 'part-91'],
  'atpl-requirements': ['part-61'],
  'flight-instructor-rating': ['part-61', 'part-141'],
  'gaca-medical-class-1': ['part-67'],
  'foreign-license-conversion-to-gaca': ['part-61'],
  'icao-english-saelpt': ['part-61'],
  'radiotelephony-phraseology': ['part-91'],
  'airspace-explained': ['part-71', 'part-91'],
  'drone-uas-rules-in-ksa': ['part-101', 'part-107'],
  'weight-and-balance-basics': ['part-91'],
  'density-altitude-and-performance': ['part-91'],
  'fuel-planning-and-reserves': ['part-91', 'part-121'],
  'reading-metar-taf': ['part-91'],
  'decoding-notams': ['part-91'],
  'the-airac-cycle': ['part-91'],
};

/** "61" from "part-61" — for the chip label `GACAR Part {{part}}`. */
export const partNumber = (slug: string): string => slug.replace(/^part-/, '');
