// The LLM reads the retrieved candidates and picks at most 3 that genuinely address the problem,
// with a plain-language reason and a verbatim quote. It may pick only ids from the list, or none.
// Given the Challenges Map, it also names the one challenge the problem belongs to (or none):
// challenge texts are too short for vectors alone to tell "mama po udarze" from "rodzice dzieci".
import { z } from "zod";
import type { Innovation } from "@/lib/contracts/knowledge-base";
import { generateJson, idFrom, type GenerateJsonOptions } from "../llm";

export const RERANK_CANDIDATES = 15;

const SYSTEM = `You match a resident's or an institution's social problem to innovations from the ROPS Małopolska library.
You get the problem and a list of candidate innovations in JSON. Choose at most 3 innovations that genuinely address the problem, best first.
Rules:
- Choose only ids from the list. Never invent innovations.
- If none really fits, return an empty "picks" list and explain briefly in Polish why in "no_match_reason".
- "reason": 1-2 short sentences in plain Polish addressed to the user ("Pomaga…"), saying why this innovation helps with their problem. No numbers or costs.
- "quote": a short fragment copied exactly, character for character, from the candidate's "description" or "problem".
Return json: {"picks": [{"id": "...", "reason": "...", "quote": "..."}], "no_match_reason": null}`;

const CHALLENGE_RULE = `
Also choose "challenge_id": the one challenge from the given Challenges Map list that this problem belongs to, preferably in the area of your first pick. Only an id from the list, or null when none fits.
Return json: {"picks": [...], "no_match_reason": null, "challenge_id": "..."}`;

export type Pick = { id: string; reason: string; quote: string | null };
export type RerankResult = {
  picks: Pick[];
  noMatchReason: string | null;
  challengeId?: string | null;
};

export type ChallengeOption = { id: string; area: string; text: string };

function sourceText(i: Innovation): string {
  return [i.opis_krotki ?? "", i.problem ?? "", i.dla_kogo.join("; ")].join("\n");
}

function normalizeQuote(q: string): string {
  return q
    .trim()
    .replace(/^[„"“'«]+|[”"'»]+$/g, "")
    .replace(/\s+/g, " ");
}

export async function rerank(
  description: string,
  candidates: Innovation[],
  options: GenerateJsonOptions = {},
  challenges: ChallengeOption[] = [],
): Promise<RerankResult> {
  const ids = candidates.map((c) => c.id);
  const challengeIds = challenges.map((c) => c.id);
  const Schema = z.object({
    picks: z
      .array(
        z.object({
          id: idFrom(ids),
          reason: z.string().min(1),
          quote: z.string().nullable().optional(),
        }),
      )
      .max(5),
    no_match_reason: z.string().nullable().optional(),
    challenge_id: (challengeIds.length ? idFrom(challengeIds) : z.string()).nullable().optional(),
  });
  const listing = candidates.map((c) => ({
    id: c.id,
    name: c.nazwa,
    description: c.opis_krotki,
    problem: c.problem,
    for_whom: c.dla_kogo,
    who_can_implement: c.kto_moze_wdrozyc,
  }));
  const out = await generateJson(
    Schema,
    [
      { role: "system", content: challenges.length ? SYSTEM + CHALLENGE_RULE : SYSTEM },
      {
        role: "user",
        content:
          `Problem:\n${description}\n\nCandidates (json):\n${JSON.stringify(listing)}` +
          (challenges.length ? `\n\nChallenges Map (json):\n${JSON.stringify(challenges)}` : ""),
      },
    ],
    { temperature: 0, maxTokens: 3000, ...options },
  );

  const byId = new Map(candidates.map((c) => [c.id, c]));
  const picks: Pick[] = [];
  for (const p of out.picks) {
    if (p.id === "none" || picks.some((x) => x.id === p.id)) continue;
    const quote = p.quote ? normalizeQuote(p.quote) : "";
    const text = sourceText(byId.get(p.id)!).replace(/\s+/g, " ");
    picks.push({
      id: p.id,
      reason: p.reason.trim(),
      quote: quote && text.includes(quote) ? quote : null,
    });
    if (picks.length === 3) break;
  }
  const challengeId =
    challenges.length && out.challenge_id && out.challenge_id !== "none" ? out.challenge_id : null;
  return {
    picks,
    noMatchReason: picks.length ? null : (out.no_match_reason ?? null),
    ...(challenges.length ? { challengeId } : {}),
  };
}
