/** Guide slugs (order shown in the index) and the tools each guide links to. */
export const GUIDE_SLUGS = [
  'saudi-ppl-requirements',
  'saudi-cpl-requirements',
  'saudi-instrument-rating',
  'gaca-medical-class-1',
  'foreign-license-conversion-to-gaca',
  'icao-english-saelpt',
  'airspace-explained',
  'reading-metar-taf',
  'decoding-notams',
  'the-airac-cycle',
] as const;

export type GuideSlug = (typeof GUIDE_SLUGS)[number];

export type GuideTopic = 'licensing' | 'medical' | 'language' | 'airspace' | 'weather' | 'planning';
export type GuideLevel = 'beginner' | 'intermediate';

/** Topic display order in the index. */
export const GUIDE_TOPICS: GuideTopic[] = [
  'licensing',
  'medical',
  'language',
  'airspace',
  'weather',
  'planning',
];

/** Per-guide classification — structure only; labels are localized in i18n. */
export const GUIDE_META: Record<GuideSlug, { topic: GuideTopic; level: GuideLevel }> = {
  'saudi-ppl-requirements': { topic: 'licensing', level: 'beginner' },
  'saudi-cpl-requirements': { topic: 'licensing', level: 'intermediate' },
  'saudi-instrument-rating': { topic: 'licensing', level: 'intermediate' },
  'gaca-medical-class-1': { topic: 'medical', level: 'beginner' },
  'foreign-license-conversion-to-gaca': { topic: 'licensing', level: 'intermediate' },
  'icao-english-saelpt': { topic: 'language', level: 'beginner' },
  'airspace-explained': { topic: 'airspace', level: 'beginner' },
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
};
