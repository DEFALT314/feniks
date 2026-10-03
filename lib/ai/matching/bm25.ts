// Multi-field BM25 (BM25F) over the innovation catalog, in memory (~150 items).
import type { Innovation } from "@/lib/contracts/knowledge-base";
import { stemsMatch, tokenize } from "./text";

// Keywords weigh most: the jury tests relevance with keywords from the problem description.
export const FIELD_WEIGHTS = { keywords: 3, name: 2, problem: 1, summary: 1, audience: 1 } as const;

// Query words found in more than this share of items ("pomoc", "osoba") carry no signal here, but
// summed over a vague query they push random items above the real matches. Inflected variants are
// counted together. 0.2 was best on the accuracy sets.
export const MAX_DF = 0.2;

const K1 = 1.2;
const B = 0.5;

export type Bm25Hit = {
  id: string;
  score: number;
  matchedStems: Set<string>; // stems of the query that matched, for highlighting
};

export type Bm25Index = {
  tf: Map<string, Map<string, number>>;
  docLength: Map<string, number>;
  docs: Map<string, Set<string>>; // stem → ids of items containing it
  avgLength: number;
};

function fields(i: Innovation): [keyof typeof FIELD_WEIGHTS, string][] {
  return [
    ["keywords", i.slowa_kluczowe.join(" ")],
    ["name", i.nazwa],
    ["problem", i.problem ?? ""],
    ["summary", i.opis_krotki ?? ""],
    ["audience", i.dla_kogo.join(" ")],
  ];
}

export function buildIndex(items: Innovation[]): Bm25Index {
  const index: Bm25Index = { tf: new Map(), docLength: new Map(), docs: new Map(), avgLength: 0 };
  for (const item of items) {
    const tf = new Map<string, number>();
    let length = 0;
    for (const [field, text] of fields(item)) {
      const w = FIELD_WEIGHTS[field];
      for (const t of tokenize(text)) {
        tf.set(t.stem, (tf.get(t.stem) ?? 0) + w);
        length += w;
      }
    }
    for (const stem of tf.keys()) {
      if (!index.docs.has(stem)) index.docs.set(stem, new Set());
      index.docs.get(stem)!.add(item.id);
    }
    index.tf.set(item.id, tf);
    index.docLength.set(item.id, length);
    index.avgLength += length;
  }
  index.avgLength /= Math.max(1, items.length);
  return index;
}

// Vocabulary stems matching a query stem (exact or prefix, see stemsMatch).
function expand(index: Bm25Index, stem: string): string[] {
  return [...index.docs.keys()].filter((t) => stemsMatch(t, stem));
}

// Stems of the query that are informative for this catalog (not generic words).
export function informativeStems(
  index: Bm25Index,
  query: string,
  maxDf = MAX_DF,
): Map<string, string[]> {
  const n = index.tf.size;
  const out = new Map<string, string[]>(); // query stem → matching vocabulary stems
  for (const t of tokenize(query)) {
    if (out.has(t.stem)) continue;
    const stems = expand(index, t.stem);
    const items = new Set(stems.flatMap((s) => [...index.docs.get(s)!]));
    if (stems.length && items.size / n <= maxDf) out.set(t.stem, stems);
  }
  return out;
}

export function search(index: Bm25Index, query: string, limit = 20, maxDf = MAX_DF): Bm25Hit[] {
  const n = index.tf.size;
  const queryStems = informativeStems(index, query, maxDf);
  const hits: Bm25Hit[] = [];
  for (const [id, tf] of index.tf) {
    let score = 0;
    const matchedStems = new Set<string>();
    for (const [queryStem, stems] of queryStems) {
      for (const stem of stems) {
        const f = tf.get(stem);
        if (!f) continue;
        const df = index.docs.get(stem)!.size;
        const idf = Math.log(1 + (n - df + 0.5) / (df + 0.5));
        const norm = f + K1 * (1 - B + (B * index.docLength.get(id)!) / index.avgLength);
        score += (idf * f * (K1 + 1)) / norm;
        matchedStems.add(queryStem);
      }
    }
    if (score > 0) hits.push({ id, score, matchedStems });
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}
