// Matchmaking pipeline for POST /api/match (contract: lib/contracts/match.ts).
//
//   description → remove personal data → hybrid retrieval (vectors from Supabase + BM25)
//   → LLM picks ≤3 with reason and quote (or "none") → challenge from the Challenges Map
//   → highlighted words → response + statistics row (area and challenge only, never the text).
//
// Degrades gracefully: no embedding service → keywords only; no LLM → ranking without AI reasons.
// Dependencies are passed in, so the whole flow is unit-tested without network or database.
import { InnovationSummary, type Innovation } from "@/lib/contracts/knowledge-base";
import type { MatchRequest, MatchResponse, MatchedInnovation } from "@/lib/contracts/match";
import { redactPersonalData } from "../privacy";
import { buildIndex, informativeStems, search, type Bm25Index } from "./bm25";
import { COVERED_BELOW, coveredProbability } from "./coverage";
import { fuse, type Ranked } from "./fusion";
import { highlight, stemsOf } from "./highlight";
import { RERANK_CANDIDATES, type RerankResult } from "./rerank";
import { stemsMatch, tokenize } from "./text";

export type VectorHit = { ref_id: string; similarity: number };

export type AreaWithChallenges = {
  id: string;
  nazwa: string;
  kategorie_biblioteki: string[]; // Library categories that belong to this area
  wyzwania: { id: string; tekst: string }[];
};

export type MatchDeps = {
  innovations: Innovation[]; // what the user may see; filtered to do_matchmakingu here
  areas: AreaWithChallenges[];
  embedQuery: (text: string) => Promise<number[] | null>;
  vectorSearch: (
    vector: number[],
    kind: "innovation" | "challenge",
    count: number,
  ) => Promise<VectorHit[]>;
  rerank?: (description: string, candidates: Innovation[]) => Promise<RerankResult>;
};

export type MatchStats = {
  area_id: string | null;
  challenge_id: string | null;
  match_quality: "strong" | "weak";
};

const MORE = 5;
const CHALLENGE_CANDIDATES = 10;

// Short challenge texts alone can mislead ("wraca ze szpitala" resembled "po opuszczeniu placówki" in
// the homelessness area), so the best challenge is taken from an area whose Library categories
// include the recommended innovations; the plain best match is the fallback.
export function chooseChallenge(
  hits: VectorHit[],
  areas: AreaWithChallenges[],
  pickedCategories: string[],
): MatchResponse["challenge"] {
  const located = hits.flatMap((hit) => {
    const area = areas.find((a) => a.wyzwania.some((w) => w.id === hit.ref_id));
    const found = area?.wyzwania.find((w) => w.id === hit.ref_id);
    return area && found ? [{ area, found }] : [];
  });
  const preferred =
    located.find(({ area }) =>
      pickedCategories.slice(0, 1).some((c) => area.kategorie_biblioteki.includes(c)),
    ) ??
    located.find(({ area }) =>
      pickedCategories.some((c) => area.kategorie_biblioteki.includes(c)),
    ) ??
    located[0];
  return preferred
    ? {
        area_id: preferred.area.id,
        area_name: preferred.area.nazwa,
        challenge_id: preferred.found.id,
        challenge_text: preferred.found.tekst,
      }
    : null;
}
const indexCache = new WeakMap<Innovation[], { catalog: Innovation[]; index: Bm25Index }>();

function catalogIndex(innovations: Innovation[]) {
  let cached = indexCache.get(innovations);
  if (!cached) {
    const catalog = innovations.filter((i) => i.do_matchmakingu && i.opublikowana);
    cached = { catalog, index: buildIndex(catalog) };
    indexCache.set(innovations, cached);
  }
  return cached;
}

function itemStems(i: Innovation): Set<string> {
  return stemsOf([i.nazwa, i.opis_krotki, i.problem, ...i.dla_kogo, ...i.slowa_kluczowe].join(" "));
}

function matchedKeywords(i: Innovation, queryStems: string[]): string[] {
  return i.slowa_kluczowe.filter((k) =>
    tokenize(k).some((t) => queryStems.some((s) => stemsMatch(t.stem, s))),
  );
}

// Reason shown when the LLM is unavailable: honest and short, no invented claims.
function searchReason(keywords: string[]): string {
  return keywords.length
    ? `Pasuje do słów z Twojego opisu: ${keywords.slice(0, 3).join(", ")}.`
    : "Opis tej innowacji jest podobny do Twojego problemu.";
}

export async function runMatch(
  request: MatchRequest,
  deps: MatchDeps,
): Promise<{ response: MatchResponse; stats: MatchStats }> {
  const description = redactPersonalData(request.description);
  const { catalog, index } = catalogIndex(deps.innovations);
  const byId = new Map(catalog.map((i) => [i.id, i]));

  const vector = await deps.embedQuery(description);
  const similarities = new Map<string, number>();
  let challengeHits: VectorHit[] = [];
  if (vector) {
    const [innovationHits, challenges] = await Promise.all([
      deps.vectorSearch(vector, "innovation", 50).catch(() => []),
      deps.vectorSearch(vector, "challenge", CHALLENGE_CANDIDATES).catch(() => []),
    ]);
    for (const hit of innovationHits) {
      if (byId.has(hit.ref_id)) similarities.set(hit.ref_id, hit.similarity);
    }
    challengeHits = challenges;
  }
  const lexical = search(index, description);
  const ranked: Ranked[] = fuse(similarities, lexical);

  const sorted = [...similarities.values()].sort((a, b) => b - a);
  const p = coveredProbability(sorted, lexical[0]?.score ?? 0);
  let weak = p !== null ? p < COVERED_BELOW : lexical.length === 0;

  const candidates = ranked.slice(0, RERANK_CANDIDATES).map((r) => byId.get(r.id)!);
  let ai: RerankResult | null = null;
  if (deps.rerank && candidates.length) {
    ai = await deps.rerank(description, candidates).catch((e) => {
      console.error("rerank failed, ranking only:", (e as Error).message);
      return null;
    });
  }

  const queryStems = [...informativeStems(index, description).keys()];
  const picks = ai
    ? ai.picks
    : candidates.slice(0, 3).map((i) => ({
        id: i.id,
        reason: searchReason(matchedKeywords(i, queryStems)),
        quote: null,
      }));
  if (ai && !ai.picks.length) weak = true;

  const challenge = chooseChallenge(
    challengeHits,
    deps.areas,
    picks.map((p) => byId.get(p.id)!.kategoria_id),
  );

  const innovations: MatchedInnovation[] = picks.map((p) => {
    const i = byId.get(p.id)!;
    return {
      innovation: InnovationSummary.parse(i),
      reason: p.reason,
      quote: p.quote,
      summary_segments: highlight(i.opis_krotki ?? "", queryStems),
      matched_keywords: matchedKeywords(i, queryStems),
    };
  });

  // In the description, highlight the informative words that occur in the recommended innovations.
  const pickedStems = new Set(picks.flatMap((p) => [...itemStems(byId.get(p.id)!)]));
  const shown = queryStems.filter((s) => [...pickedStems].some((t) => stemsMatch(s, t)));

  const pickedIds = new Set(picks.map((p) => p.id));
  const response: MatchResponse = {
    description_segments: highlight(description, shown),
    challenge,
    innovations,
    more: ranked
      .filter((r) => !pickedIds.has(r.id))
      .slice(0, MORE)
      .map((r) => InnovationSummary.parse(byId.get(r.id)!)),
    match_quality: weak ? "weak" : "strong",
    no_match_reason: ai && !ai.picks.length ? ai.noMatchReason : null,
    picked_by: ai ? "ai" : "search",
  };
  return {
    response,
    stats: {
      area_id: challenge?.area_id ?? null,
      challenge_id: challenge?.challenge_id ?? null,
      match_quality: response.match_quality,
    },
  };
}
