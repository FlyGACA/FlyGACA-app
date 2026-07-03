/**
 * Typed runtime content loader. The regulatory corpus and content indexes ship
 * as static JSON under /data and are fetched at runtime (as in the legacy site),
 * so the heavy corpus never bloats the JS bundle.
 */
export async function fetchJson<T>(
  path: string,
  signal?: AbortSignal,
  validate?: (data: unknown) => data is T,
): Promise<T> {
  const res = await fetch(path, { signal });
  if (!res.ok) {
    throw new Error(`Failed to load ${path}: ${res.status} ${res.statusText}`);
  }
  let data: unknown;
  try {
    data = await res.json();
  } catch (err) {
    // A truncated/malformed body should surface as a load error at the call
    // site (retryable, evicted from loadJson's cache), not as a downstream
    // render crash on a value that was silently cast to T.
    throw new Error(`Failed to parse ${path}: ${err instanceof Error ? err.message : String(err)}`);
  }
  if (validate && !validate(data)) {
    throw new Error(`Failed to validate ${path}: unexpected shape`);
  }
  return data as T;
}

/**
 * Session-scoped, de-duplicated loader for the static `/data/*` indexes. Several
 * surfaces read the same large files — e.g. the ~1.5 MB `airports.json` is used by
 * the command palette and three flight tools — so without sharing, each mount
 * re-fetches and (more expensively) re-parses the file on the main thread.
 *
 * Two complementary layers keep that cheap:
 *  - this in-memory promise cache shares ONE fetch + parse per path for the life of
 *    the tab (multiple callers await the same promise);
 *  - the service worker's NetworkFirst `flygaca-data` runtime cache (vite.config.ts)
 *    serves the bytes from disk across visits.
 *
 * A rejected load is evicted so a later caller can retry; pass `force` to refresh
 * (e.g. a retry button). Intended for the static content indexes, not mutable data.
 */
const jsonCache = new Map<string, Promise<unknown>>();

export function loadJson<T>(path: string, force = false): Promise<T> {
  if (force) jsonCache.delete(path);
  let promise = jsonCache.get(path);
  if (!promise) {
    // No per-caller AbortSignal: the promise is shared, so one caller unmounting
    // must not cancel the load others are awaiting (callers guard their own setState).
    promise = fetchJson<T>(path).catch((err) => {
      jsonCache.delete(path);
      throw err;
    });
    jsonCache.set(path, promise);
  }
  return promise as Promise<T>;
}

/** Test-only: drop the in-memory cache so each test starts from a clean slate. */
export function clearJsonCache(): void {
  jsonCache.clear();
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
  /** Present on the worldwide rows; the original curated Saudi set omitted them. */
  country_en?: string;
  country_ar?: string;
  region?: string;
  /** Short OurAirports type: large | medium | small | heliport | seaplane | balloonport. */
  type?: string;
  lat: number;
  lon: number;
  elev_ft: number;
  /** Runway designators; worldwide rows add length (ft) and surface where known. */
  rwys: { id: string; len?: number; surf?: string }[];
  freqs: { l: string; v: string }[];
  /** Magnetic variation, present on the curated Saudi (AIP-KSA) records only. */
  mag?: string;
  /** Aerodrome services (type, runway summary, …) — curated Saudi records only. */
  services?: { l: string; v: string }[];
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
  /** Human-readable citation label, e.g. "GACAR Part 91, §91.165". */
  cite?: string;
  /** Corpus pointer for the citation. Latent — not yet rendered. */
  citeRef?: SearchRef;
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
  read?: ContentLink & { label: string };
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

export interface PathStep extends ContentLink {
  label: string;
  note: string;
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
 * `d` heading · `b` badge (e.g. "Part 61") · `x` excerpt. The corpus pointer is
 * either the semantic `kind`/`id`/`anchor` fields (current) or the legacy `u`
 * URL (`document.html?type=…&id=…#…`) still emitted by un-migrated corpus
 * builds — read it through {@link searchEntryLink} so both shapes route alike.
 */
export interface SearchEntry {
  d: string;
  b: string;
  x?: string;
  /** Semantic corpus pointer. */
  kind?: LibraryKind;
  id?: string;
  anchor?: string;
  /** @deprecated Legacy composite URL; superseded by `kind`/`id`/`anchor`. */
  u?: string;
}

export interface SearchIndex {
  generated: string;
  count: number;
  scope: string;
  entries: SearchEntry[];
}

/** Legacy `type=` tokens that don't already match a {@link LibraryKind}. */
const SEARCH_TYPE_TO_KIND: Record<string, LibraryKind> = {
  handbooks: 'handbook',
};

export interface SearchRef {
  kind: LibraryKind;
  /** Document slug. */
  id: string;
  /** In-document heading anchor, if any. */
  anchor?: string;
}

/**
 * A corpus pointer as it may appear in data. The historical shape is a legacy
 * `document.html?type=<t>&id=<slug>#<anchor>` string, still emitted by the
 * upstream corpus builders; the semantic shape keeps routing out of the data
 * (`{ kind, id, anchor }`). Normalise either through {@link toSearchRef} so the
 * app parses both identically and is ready for the data to switch shapes with
 * no frontend change.
 */
export type SearchLink = string | { kind?: string; type?: string; id?: string; anchor?: string };

/** Resolve a legacy `type=` token or a semantic `kind` to a corpus kind. */
function toCorpusKind(token: string | undefined): LibraryKind | undefined {
  if (!token) return undefined;
  return token in CORPUS ? (token as LibraryKind) : SEARCH_TYPE_TO_KIND[token];
}

/** Parse a legacy `document.html?type=…&id=…#…` search-index URL into a {@link SearchRef}. */
export function parseSearchUrl(u: string): SearchRef | null {
  const kind = toCorpusKind(/[?&]type=([^&#]+)/.exec(u)?.[1]);
  const id = /[?&]id=([^&#]+)/.exec(u)?.[1];
  if (!id || !kind) return null;
  const anchor = /#(.+)$/.exec(u)?.[1];
  return anchor ? { kind, id, anchor } : { kind, id };
}

/**
 * Normalise any corpus pointer — legacy URL string or semantic object — into a
 * {@link SearchRef}. Returns null when the pointer names no routable document.
 */
export function toSearchRef(link: SearchLink): SearchRef | null {
  if (typeof link === 'string') return parseSearchUrl(link);
  const kind = toCorpusKind(link.kind ?? link.type);
  if (!kind || !link.id) return null;
  return link.anchor ? { kind, id: link.id, anchor: link.anchor } : { kind, id: link.id };
}

/**
 * Build the app's Document-reader route for a corpus pointer.
 * `document.html?type=reference&id=ac-68-1#sec-x` → `/library/reference/ac-68-1#sec-x`.
 * Returns null for pointers we can't route. Pass `q` to carry the search phrase
 * through to the reader so it can highlight and scroll to the matched passage.
 */
export function searchHref(link: SearchLink, q?: string): string | null {
  const ref = toSearchRef(link);
  if (!ref) return null;
  const query = q && q.trim() ? `?q=${encodeURIComponent(q.trim())}` : '';
  return `${CORPUS[ref.kind].base}/${ref.id}${query}${ref.anchor ? `#${ref.anchor}` : ''}`;
}

/**
 * The corpus pointer for a search hit, tolerant of both the current semantic
 * entry (`kind`/`id`/`anchor`) and the legacy `u` URL. Pass the result to
 * {@link toSearchRef} or {@link searchHref}.
 */
export function searchEntryLink(e: SearchEntry): SearchLink {
  return e.u ?? e;
}

/**
 * A link inside curated content (reading paths, ground-school lessons, quiz
 * citations). It is one of two semantic shapes — a corpus pointer
 * (`kind`/`id`/`anchor`) or an internal app route (`route`) — with a legacy
 * no-build `url` string tolerated during migration. Resolve with {@link linkHref}.
 */
export interface ContentLink {
  kind?: LibraryKind;
  id?: string;
  anchor?: string;
  /** An in-app route path, e.g. `/tools/vfr-minima` or `/study/quiz?bank=medical`. */
  route?: string;
  /** @deprecated Legacy no-build URL (`…/document.html?…` or `../tools/x.html`). */
  url?: string;
}

/**
 * Rewrite a legacy no-build internal `.html` link to its app route. Handles the
 * `guides/`, `tools/`, `library`, `study/groundschool`, and `study/quiz?bank=…`
 * pages the vanilla PWA linked by file. Returns null for corpus URLs (those go
 * through {@link searchHref}) and anything unrecognised.
 */
function legacyRouteHref(u: string): string | null {
  const s = u.replace(/^(?:\.\.\/)+/, '').replace(/^\//, '');
  const page = /^(guides|tools)\/([a-z0-9-]+)\.html$/i.exec(s);
  if (page) return `/${page[1]}/${page[2]}`;
  if (/^library\.html$/i.test(s)) return '/library';
  if (/^study\/groundschool\.html$/i.test(s)) return '/study/groundschool';
  const quiz = /^study\/quiz\.html(\?[^#]*)?$/i.exec(s);
  if (quiz) return `/study/quiz${quiz[1] ?? ''}`;
  return null;
}

/**
 * Resolve any {@link ContentLink} (or legacy URL string) to an in-app href, or
 * null if it names nothing routable. Corpus pointers route through the Library
 * reader; `route` links pass through; legacy strings are parsed as a corpus URL
 * first, then as an internal `.html` page.
 */
export function linkHref(link: ContentLink | string, q?: string): string | null {
  if (typeof link === 'string') return searchHref(link, q) ?? legacyRouteHref(link);
  if (link.route) return link.route;
  if (link.url) return searchHref(link.url, q) ?? legacyRouteHref(link.url);
  return searchHref(link, q);
}

/**
 * One compiled regulatory Part, as emitted by scripts/parse-regulations.mjs from the Markdown
 * source under content/regulations/. `references` are the Parts this one cites; `sectionRefs`
 * are `§` citations; `sections` is the document's own heading outline.
 */
export interface RegulationRecord {
  slug: string;
  partNum: number;
  part: string;
  title: string;
  category: string;
  references: string[];
  sectionRefs: string[];
  sections: string[];
}

/**
 * The optimized cross-reference lookup dictionary (public/data/regulations-lookup.json),
 * compiled in CI so the frontend can render "references / referenced by" instantly without
 * re-parsing the corpus. `index.referencedBy` is the reverse graph: slug → Parts that cite it.
 */
export interface RegulationsLookup {
  generated: string | null;
  count: number;
  parts: Record<string, RegulationRecord>;
  index: {
    byPart: string[];
    referencedBy: Record<string, string[]>;
  };
}

/** Load the compiled regulatory cross-reference lookup (cached for the tab session). */
export function loadRegulationsLookup(): Promise<RegulationsLookup> {
  return loadJson<RegulationsLookup>('/data/regulations-lookup.json');
}
