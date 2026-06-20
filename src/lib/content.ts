/**
 * Typed runtime content loader. The regulatory corpus and content indexes ship
 * as static JSON under /data and are fetched at runtime (as in the legacy site),
 * so the heavy corpus never bloats the JS bundle.
 */
export async function fetchJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(path, { signal });
  if (!res.ok) {
    throw new Error(`Failed to load ${path}: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

export interface ToolEntry {
  id: string;
  route: string;
  live: boolean;
}

export interface ToolsManifest {
  version: number;
  tools: ToolEntry[];
}

export interface GacarCategory {
  id: string;
  label: string;
}

/**
 * Optional provenance carried on synced records. Written by `scripts/sync-gaca.mjs`
 * from the official-source (GACA / AIP) extraction agents; additive and ignored by
 * the reader (`fetchJson` drops unknown fields), so it never affects rendering. Its
 * only job is to let one refresh/AIRAC cycle be diffed against the next.
 */
export interface SourceProvenance {
  /** Canonical source URL the record was extracted from. */
  sourceUrl?: string;
  /** Document revision / amendment marker (e.g. "Rev 3", AC letter "C"). */
  revision?: string;
  /** ISO date the source became effective (AIRAC effective date, AC date). */
  effectiveDate?: string;
  /** Content hash of the imported body/asset, for change detection. */
  contentHash?: string;
}

export interface GacarDocument extends SourceProvenance {
  part: string;
  partNum: number;
  title: string;
  category: string;
  slug: string;
  pages: number;
  outline?: string[];
}

export interface GacarIndex {
  generated: string;
  source: string;
  sourceUrl: string;
  count: number;
  categories: GacarCategory[];
  documents: GacarDocument[];
}

/**
 * The three browsable/readable corpora behind the Library. They share the
 * GACAR index shape (`{ categories, documents }`); a corpus doc carries either
 * Part metadata (regulations) or a `badge` + `sections` (reference/handbooks).
 */
export type LibraryKind = 'regulations' | 'reference' | 'handbook';

export interface CorpusDoc extends SourceProvenance {
  slug: string;
  title: string;
  category: string;
  part?: string;
  partNum?: number;
  pages?: number;
  badge?: string;
  sections?: number;
  outline?: string[];
}

export interface CorpusIndex {
  generated: string;
  count: number;
  categories: GacarCategory[];
  documents: CorpusDoc[];
}

export interface CorpusMeta {
  index: string;
  dir: string;
  base: string;
}

/** Where each corpus's index, HTML, and reader route live. */
export const CORPUS: Record<LibraryKind, CorpusMeta> = {
  regulations: { index: '/data/gacar-index.json', dir: '/data/parts', base: '/library' },
  reference: {
    index: '/data/reference-index.json',
    dir: '/data/library',
    base: '/library/reference',
  },
  handbook: { index: '/data/ebooks-index.json', dir: '/data/ebooks', base: '/library/handbook' },
};

export interface ChartDoc extends SourceProvenance {
  region: string;
  variant: string;
  date: string | null;
  label: string;
  slug: string;
  image: string;
  /** Native pixel dimensions, used to set the Leaflet image-overlay bounds. */
  w: number;
  h: number;
}

export interface ChartsIndex {
  generated: string;
  source: string;
  sourceUrl: string;
  count: number;
  documents: ChartDoc[];
}

export interface PdfCategory {
  id: string;
  label: string;
}

export interface PdfDoc {
  title: string;
  slug: string;
  category: string;
  /** 'reader' docs open in the Library reader; otherwise a deployed PDF file. */
  kind?: 'reader' | 'file';
  file?: string;
  link?: string;
  available?: boolean;
  note?: string;
}

export interface PdfsIndex {
  generated: string;
  categories: PdfCategory[];
  documents: PdfDoc[];
}

export interface Airport extends SourceProvenance {
  icao: string;
  iata: string;
  name_en: string;
  name_ar: string;
  city_en: string;
  city_ar: string;
  lat: number;
  lon: number;
  elev_ft: number;
  rwys: { id: string }[];
  freqs: { l: string; v: string }[];
}

export interface AirportsIndex {
  count: number;
  airports: Airport[];
}

/** An ATS airspace (CTR/TMA) in the study airspace directory. Geometry is the
 *  AIP's approximate circle (`center` + `radius_nm`); a `polygon` ring, when
 *  present, is the published lateral boundary and overrides the circle. */
export interface AtsAirspace extends SourceProvenance {
  id: string;
  name: string;
  name_ar: string;
  type: string;
  class: string;
  center: [number, number];
  radius_nm: number;
  unit: string;
  polygon?: [number, number][];
}

export interface AirspaceClass {
  id: string;
  label: string;
  color: string;
}

export interface AirspacesIndex {
  generated: string;
  source: string;
  note: string;
  count: number;
  classes: AirspaceClass[];
  airspaces: AtsAirspace[];
}

export interface DefinitionTerm {
  term: string;
  def: string;
  url: string;
}

export interface DefinitionsIndex {
  count: number;
  terms: DefinitionTerm[];
}

export interface QuizQuestion {
  q: string;
  options: string[];
  answer: number;
  explain: string;
}

export interface QuizBank {
  id: string;
  title: string;
  desc: string;
  source: string;
  questions: QuizQuestion[];
}

export interface QuizData {
  exam: { title: string; questions: number; minutes: number; passMark: number };
  banks: QuizBank[];
}

export interface GsLesson {
  id: string;
  title: string;
  objective: string;
  adel: string;
  read?: { label: string; url: string };
}

export interface GsModule {
  id: string;
  title: string;
  summary: string;
  quiz?: string;
  lessons: GsLesson[];
}

export interface GroundSchoolData {
  title: string;
  intro: string;
  modules: GsModule[];
}

export interface PathStep {
  label: string;
  note: string;
  url: string;
}

export interface ReadingPath {
  id: string;
  title: string;
  desc: string;
  steps: PathStep[];
}

export interface PathsIndex {
  paths: ReadingPath[];
}

/**
 * One hit in the lazy full-text search index (`/data/library-search.json`).
 * `d` heading · `b` badge (e.g. "Part 61") · `u` legacy URL
 * (`document.html?type=regulations&id=<slug>#<anchor>`) · `x` excerpt.
 */
export interface SearchEntry {
  d: string;
  b: string;
  u: string;
  x?: string;
}

export interface SearchIndex {
  generated: string;
  count: number;
  scope: string;
  entries: SearchEntry[];
}

const SEARCH_TYPE_TO_KIND: Record<string, LibraryKind> = {
  regulations: 'regulations',
  reference: 'reference',
  handbooks: 'handbook',
};

export interface SearchRef {
  kind: LibraryKind;
  /** Document slug. */
  id: string;
  /** In-document heading anchor, if any. */
  anchor?: string;
}

/** Parse a legacy search-index URL into its corpus kind, document id and anchor. */
export function parseSearchUrl(u: string): SearchRef | null {
  const type = /[?&]type=([^&#]+)/.exec(u)?.[1];
  const id = /[?&]id=([^&#]+)/.exec(u)?.[1];
  const kind = type ? SEARCH_TYPE_TO_KIND[type] : undefined;
  if (!id || !kind) return null;
  const anchor = /#(.+)$/.exec(u)?.[1];
  return { kind, id, anchor };
}

/**
 * Rewrite a legacy search-index URL to the app's Document-reader route.
 * `document.html?type=reference&id=ac-68-1#sec-x` → `/library/reference/ac-68-1#sec-x`.
 * Returns null for entries we can't route. Pass `q` to carry the search phrase
 * through to the reader so it can highlight and scroll to the matched passage.
 */
export function searchHref(u: string, q?: string): string | null {
  const ref = parseSearchUrl(u);
  if (!ref) return null;
  const query = q && q.trim() ? `?q=${encodeURIComponent(q.trim())}` : '';
  return `${CORPUS[ref.kind].base}/${ref.id}${query}${ref.anchor ? `#${ref.anchor}` : ''}`;
}
