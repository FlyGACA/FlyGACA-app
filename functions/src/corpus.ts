/**
 * Retrieval over the GACAR corpus (DESIGN §3 D2 / §6.3). v1 is a static,
 * deterministic lexical/BM25 index over the same `library-search.json` the app
 * already ships — no vector store, no extra infra. The retriever's interface is
 * the seam a future vector/hybrid swap happens behind.
 *
 * Each corpus entry is `{ d: heading, b: "Part N" badge, u: legacy URL+anchor,
 * x: passage text }`. We map every retrieved passage to a `ChatSource` carrying
 * a real part/section/url/verbatim/corpusVersion so citations are exact.
 */
import { readFile } from "node:fs/promises";
import type { ChatSource } from "./contract.js";

/** Raw entry shape in `library-search.json`. */
interface SearchEntry {
  d: string;
  b: string;
  u: string;
  x?: string;
}

interface SearchIndex {
  generated: string;
  count: number;
  scope: string;
  entries: SearchEntry[];
}

export interface Retrieved {
  entry: SearchEntry;
  /** BM25 score (higher = more relevant). */
  score: number;
}

/**
 * Where the corpus is loaded from. An `http(s)` value is fetched (the corpus is
 * already served at the Hosting `/data` path); anything else is read from disk
 * (emulator / tests). Defaults to the deployed Hosting origin.
 */
const CORPUS_SOURCE =
  process.env.CORPUS_URL ?? "https://flygaca-app.web.app/data/library-search.json";

// ----------------------------------------------------------------------------
// Tokenization
// ----------------------------------------------------------------------------

// Small English stopword set — enough to denoise BM25 without dropping aviation
// terms. (Arabic queries against this English corpus are a known v1 limitation;
// see DESIGN §3 D2 — promote to embeddings if cross-lingual recall is needed.)
const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "of", "to", "in", "on", "for", "is", "are",
  "be", "as", "at", "by", "it", "this", "that", "with", "from", "what", "which",
  "how", "do", "does", "can", "i", "my", "me", "you", "your",
]);

const TOKEN_RE = /[\p{L}\p{N}]+/gu;

function tokenize(text: string): string[] {
  const out: string[] = [];
  const matches = text.toLowerCase().matchAll(TOKEN_RE);
  for (const m of matches) {
    const tok = m[0];
    if (tok.length < 2 || STOPWORDS.has(tok)) continue;
    out.push(tok);
  }
  return out;
}

// ----------------------------------------------------------------------------
// BM25 index
// ----------------------------------------------------------------------------

const K1 = 1.5;
const B = 0.75;
/** Heading (`d`) tokens count this many times — a light field boost. */
const HEADING_BOOST = 2;

interface Posting {
  id: number;
  tf: number;
}

class Bm25Index {
  readonly generated: string;
  private readonly entries: SearchEntry[];
  private readonly postings = new Map<string, Posting[]>();
  private readonly docLen: number[] = [];
  private readonly avgdl: number;
  private readonly n: number;

  constructor(index: SearchIndex) {
    this.generated = index.generated;
    this.entries = index.entries;
    this.n = index.entries.length;

    let total = 0;
    for (let id = 0; id < this.entries.length; id++) {
      const e = this.entries[id];
      const tokens = tokenize(e.x ?? "");
      // Boost heading tokens by repeating them.
      const headingTokens = tokenize(e.d ?? "");
      for (let i = 0; i < HEADING_BOOST; i++) tokens.push(...headingTokens);

      const tf = new Map<string, number>();
      for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);

      this.docLen[id] = tokens.length;
      total += tokens.length;

      for (const [term, freq] of tf) {
        let list = this.postings.get(term);
        if (!list) {
          list = [];
          this.postings.set(term, list);
        }
        list.push({ id, tf: freq });
      }
    }
    this.avgdl = this.n > 0 ? total / this.n : 0;
  }

  private idf(term: string): number {
    const df = this.postings.get(term)?.length ?? 0;
    if (df === 0) return 0;
    // BM25 idf with the +1 smoothing so it never goes negative.
    return Math.log(1 + (this.n - df + 0.5) / (df + 0.5));
  }

  search(query: string, k: number): Retrieved[] {
    const terms = new Set(tokenize(query));
    if (terms.size === 0) return [];

    const scores = new Map<number, number>();
    for (const term of terms) {
      const list = this.postings.get(term);
      if (!list) continue;
      const idf = this.idf(term);
      for (const { id, tf } of list) {
        const dl = this.docLen[id];
        const denom = tf + K1 * (1 - B + (B * dl) / (this.avgdl || 1));
        const contribution = idf * ((tf * (K1 + 1)) / (denom || 1));
        scores.set(id, (scores.get(id) ?? 0) + contribution);
      }
    }

    return [...scores.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, k)
      .map(([id, score]) => ({ entry: this.entries[id], score }));
  }
}

// ----------------------------------------------------------------------------
// Lazy, cached load
// ----------------------------------------------------------------------------

let indexPromise: Promise<Bm25Index> | null = null;

async function loadRaw(): Promise<SearchIndex> {
  if (/^https?:\/\//.test(CORPUS_SOURCE)) {
    const res = await fetch(CORPUS_SOURCE);
    if (!res.ok) throw new Error(`corpus fetch failed: ${res.status} ${CORPUS_SOURCE}`);
    return (await res.json()) as SearchIndex;
  }
  return JSON.parse(await readFile(CORPUS_SOURCE, "utf8")) as SearchIndex;
}

/** Build (or return the cached) BM25 index. Warm instances reuse it. */
export function getIndex(): Promise<Bm25Index> {
  if (!indexPromise) {
    indexPromise = loadRaw()
      .then((raw) => new Bm25Index(raw))
      .catch((err) => {
        indexPromise = null; // allow retry on the next request
        throw err;
      });
  }
  return indexPromise;
}

/** Retrieve the top-`k` passages for a query. */
export async function retrieve(query: string, k = 6): Promise<Retrieved[]> {
  const index = await getIndex();
  return index.search(query, k);
}

// ----------------------------------------------------------------------------
// Citation mapping (replicates `searchHref` in src/lib/content.ts)
// ----------------------------------------------------------------------------

const TYPE_TO_BASE: Record<string, string> = {
  regulations: "/library",
  reference: "/library/reference",
  handbooks: "/library/handbook",
};

/** Rewrite a legacy search-index URL to the app's Document-reader route. */
export function searchHref(u: string): string | null {
  const type = /[?&]type=([^&#]+)/.exec(u)?.[1];
  const id = /[?&]id=([^&#]+)/.exec(u)?.[1];
  const base = type ? TYPE_TO_BASE[type] : undefined;
  if (!id || !base) return null;
  const anchor = /#(.+)$/.exec(u)?.[1];
  return `${base}/${id}${anchor ? `#${anchor}` : ""}`;
}

function partOf(badge: string): string | undefined {
  return /Part\s+([\w.-]+)/i.exec(badge)?.[1];
}

function sectionOf(u: string): string | undefined {
  const anchor = /#(?:sec-)?(.+)$/.exec(u)?.[1];
  return anchor ? anchor : undefined;
}

/** Map a retrieved entry to the public `ChatSource` shape. */
export function toChatSource(entry: SearchEntry, generated: string): ChatSource {
  const part = partOf(entry.b);
  const badge = entry.b?.trim();
  const heading = entry.d?.trim();
  const citation = /^Part\b/i.test(badge ?? "")
    ? `GACAR ${badge}${heading ? ` — ${heading}` : ""}`
    : [badge, heading].filter(Boolean).join(" — ") || "GACAR";
  return {
    citation,
    url: searchHref(entry.u) ?? "/library",
    verbatim: entry.x?.trim() || undefined,
    section: sectionOf(entry.u),
    part,
    corpusVersion: `Rev ${generated}`,
  };
}

/** Test-only: inject a prebuilt index (skips network/disk load). */
export function __setIndexForTest(raw: SearchIndex): void {
  indexPromise = Promise.resolve(new Bm25Index(raw));
}
