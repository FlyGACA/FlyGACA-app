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
