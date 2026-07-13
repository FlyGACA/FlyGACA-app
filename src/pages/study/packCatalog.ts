/**
 * Prep packs — curated exam-prep bundles that point at existing study material
 * (quiz banks, ground-school modules, reading paths, study sheets). Structure
 * lives here; the user-facing name/desc are localized in i18n under
 * `study.packCatalog.<id>` (mirrors the Guides structure-in-TS pattern).
 */
export interface Pack {
  id: string;
  /** Marks the pack as a Pro perk. Enforced only when PACKS_GATED is on. */
  pro: boolean;
  /** quiz.json bank ids — also the pool for the pack's combined quiz. */
  bankIds: string[];
  /** groundschool.json module ids. */
  moduleIds?: string[];
  /** paths-index.json path ids. */
  pathIds?: string[];
  /** pdfs-index.json slugs. */
  sheetSlugs?: string[];
  /** reference-index.json slugs — deeper corpus reading surfaced on the pack. */
  librarySlugs?: string[];
}

export const PACKS: Pack[] = [
  {
    id: 'ppl-exam',
    pro: false,
    bankIds: ['vfr-flight-rules', 'air-law', 'airspace', 'pilot-licensing', 'navigation'],
    moduleIds: ['air-law', 'navigation', 'operations'],
    pathIds: ['private-pilot'],
    sheetSlugs: ['saudi-ppl-study-sheet'],
  },
  {
    id: 'airspace-vfr',
    pro: false,
    bankIds: ['airspace', 'vfr-flight-rules'],
    moduleIds: ['air-law'],
    pathIds: ['airspace-vfr'],
  },
  {
    id: 'medical',
    pro: true,
    bankIds: ['medical', 'human-factors'],
    pathIds: ['aviation-medical'],
    sheetSlugs: ['gaca-class1-study-sheet'],
  },
  {
    id: 'aip',
    pro: true,
    bankIds: ['aip-ais', 'airspace'],
    sheetSlugs: ['aeronautical-information-manual-aim'],
    librarySlugs: [
      'saudi-aip-gen-2-1',
      'saudi-aip-gen-2-2',
      'saudi-aip-gen-3-3',
      'saudi-aip-gen-3-4',
      'saudi-aip-enr-1-1',
      'saudi-aip-enr-1-2',
      'saudi-aip-enr-1-4',
      'saudi-aip-enr-1-6',
    ],
  },
  {
    id: 'elp',
    pro: true,
    bankIds: ['radio-elpt'],
    sheetSlugs: ['saelpt-study-sheet'],
  },
  {
    id: 'conversion',
    pro: true,
    bankIds: ['air-law', 'pilot-licensing'],
    pathIds: ['foreign-licence'],
    sheetSlugs: ['conversion-study-sheet'],
  },
];

/**
 * Gating seam — paywalls `pro` packs behind an active plan (the `prep-packs`
 * feature in src/lib/features.ts). Free packs (`ppl-exam`, `airspace-vfr`) stay
 * open; flip to `false` to make every pack free again.
 */
export const PACKS_GATED = true;

export const PACK_IDS = PACKS.map((p) => p.id);

/** Total pieces of material a pack bundles, for the "what's inside" count. */
export function packItemCount(p: Pack): number {
  return (
    p.bankIds.length +
    (p.moduleIds?.length ?? 0) +
    (p.pathIds?.length ?? 0) +
    (p.sheetSlugs?.length ?? 0) +
    (p.librarySlugs?.length ?? 0)
  );
}
