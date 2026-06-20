/**
 * A tiny fuzzy matcher for the command palette. Pure (no DOM): scores how well a
 * query subsequence-matches a target string, rewarding consecutive runs and
 * word-boundary starts so "wb" ranks "Weight & balance" above an incidental hit.
 * Returns a non-negative score, or -1 when the query is not a subsequence.
 */

const BOUNDARY = /[\s/&·—-]/;

export function fuzzyScore(query: string, target: string): number {
  const q = query.trim().toLowerCase();
  if (!q) return 0;
  const t = target.toLowerCase();
  if (t.includes(q)) {
    // Strong direct-substring bonus; even stronger when it starts the string.
    return 1000 - t.indexOf(q) + (t.startsWith(q) ? 200 : 0);
  }

  let score = 0;
  let ti = 0;
  let run = 0;
  for (let qi = 0; qi < q.length; qi++) {
    const ch = q[qi];
    let found = -1;
    for (let k = ti; k < t.length; k++) {
      if (t[k] === ch) {
        found = k;
        break;
      }
    }
    if (found === -1) return -1;
    score += 10;
    if (found === ti) {
      run += 1;
      score += run * 5; // consecutive characters
    } else {
      run = 0;
    }
    if (found === 0 || BOUNDARY.test(t[found - 1])) score += 15; // word boundary
    ti = found + 1;
  }
  return score;
}

export interface Rankable {
  label: string;
  keywords?: string[];
}

/** Best score for an item across its label and keyword hints. */
export function scoreItem(query: string, item: Rankable): number {
  let best = fuzzyScore(query, item.label);
  for (const kw of item.keywords ?? []) {
    best = Math.max(best, fuzzyScore(query, kw));
  }
  return best;
}

/** Filter to matching items and sort best-first (stable for equal scores). */
export function rankItems<T extends Rankable>(query: string, items: T[]): T[] {
  if (!query.trim()) return items;
  return items
    .map((item, i) => ({ item, i, s: scoreItem(query, item) }))
    .filter((x) => x.s >= 0)
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map((x) => x.item);
}
