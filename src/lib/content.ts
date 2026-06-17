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

export interface GacarDocument {
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

export interface Airport {
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

/**
 * Rewrite a legacy search-index URL to the app's Document-reader route.
 * `document.html?type=regulations&id=part-61#sec-x` → `/library/part-61#sec-x`.
 * Returns null for entries we can't yet route (non-regulations scopes).
 */
export function searchHref(u: string): string | null {
  const id = /[?&]id=([^&#]+)/.exec(u)?.[1];
  if (!id) return null;
  const anchor = /#(.+)$/.exec(u)?.[1];
  return `/library/${id}${anchor ? `#${anchor}` : ''}`;
}
