// Hybrid ranking: vector similarity and BM25 merged by weighted score fusion.
//
// ALPHA = weight of vectors. On the accuracy sets with mmlw-e5-base (top-1 on ROPS / colloquial /
// atypical queries): 0.6 → 89/88/88%, 0.7 → 93/90/90%, 0.8 → 94/92/88%, 0.9 → 93/92/88%.
// Score fusion (not rank fusion) keeps magnitudes, so a clear semantic winner is not outvoted by an
// item that merely repeats a word of the query.
import type { Bm25Hit } from "./bm25";

export const ALPHA = 0.8;
export const DEPTH = 20; // candidates taken from each method before fusion

export type Ranked = { id: string; score: number; similarity: number | null; bm25: Bm25Hit | null };

export function normalize(scores: Map<string, number>): Map<string, number> {
  const values = [...scores.values()];
  if (!values.length) return new Map();
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  return new Map([...scores].map(([k, v]) => [k, hi > lo ? (v - lo) / (hi - lo) : 1]));
}

// similarities: all known vector similarities (id → cosine), best first or not; empty without a query vector.
export function fuse(
  similarities: Map<string, number>,
  lexical: Bm25Hit[],
  alpha = ALPHA,
): Ranked[] {
  const lexById = new Map(lexical.map((h) => [h.id, h]));
  const topVector = [...similarities].sort((a, b) => b[1] - a[1]).slice(0, DEPTH);
  const pool = new Set([
    ...topVector.map(([id]) => id),
    ...lexical.slice(0, DEPTH).map((h) => h.id),
  ]);
  const a = similarities.size ? alpha : 0;

  const sem = normalize(
    new Map([...pool].flatMap((id) => (similarities.has(id) ? [[id, similarities.get(id)!]] : []))),
  );
  const lex = normalize(new Map(lexical.map((h) => [h.id, h.score])));
  return [...pool]
    .map((id) => ({
      id,
      score: a * (sem.get(id) ?? 0) + (1 - a) * (lex.get(id) ?? 0),
      similarity: similarities.get(id) ?? null,
      bm25: lexById.get(id) ?? null,
    }))
    .sort((x, y) => y.score - x.score);
}
