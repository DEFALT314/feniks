// Contract for module I, Matchmaking (P3): POST /api/match.
// The /match page (P3) and "Coś podobnego już działa" in the idea creator (P2) call it.
// Sample data: lib/contracts/fixtures/match.json. After 17:00, changes only by adding fields.
//
// Privacy: the description is not stored (the page says so); match_queries keeps only the area
// and challenge. Personal data (phone, e-mail, PESEL) is removed before anything reaches AI.
import { z } from "zod";
import fixture from "./fixtures/match.json";
import { InnovationSummary } from "./knowledge-base";

export const MatchRole = z.enum(["mieszkaniec", "ngo", "jst", "ekspert"]);
export type MatchRole = z.infer<typeof MatchRole>;

export const MatchRequest = z.object({
  description: z.string().trim().min(10).max(2000), // "Co się dzieje? Napisz własnymi słowami"
  role: MatchRole.optional(), // "Pytam jako"
  municipality: z.string().trim().max(200).optional(), // e.g. "Przykładowa Wola (gmina wiejska)"
  // false = ranking only, answered in well under a second; the page shows it first and then asks
  // again with ai: true for the AI picks and reasons (the free LLM tier takes 8–25 s per new query).
  ai: z.boolean().optional(), // default true
});
export type MatchRequest = z.infer<typeof MatchRequest>;

// A text split into pieces; highlighted pieces are the words that decided the match (<mark> in the UI).
export const TextSegment = z.object({
  text: z.string(),
  highlight: z.boolean(),
});
export type TextSegment = z.infer<typeof TextSegment>;

export const MatchedChallenge = z.object({
  area_id: z.string(), // ChallengeArea.id, e.g. "seniorzy"
  area_name: z.string(),
  challenge_id: z.string().nullable(), // Challenge.id; null when only the area fits
  challenge_text: z.string().nullable(),
});
export type MatchedChallenge = z.infer<typeof MatchedChallenge>;

export const MatchedInnovation = z.object({
  innovation: InnovationSummary,
  reason: z.string(), // why it fits, plain Polish; "Propozycja AI" when picked_by = "ai"
  quote: z.string().nullable(), // verbatim fragment of the innovation's description supporting the reason
  summary_segments: z.array(TextSegment), // opis_krotki with the matching words highlighted
  matched_keywords: z.array(z.string()), // innovation keywords that matched the description
});
export type MatchedInnovation = z.infer<typeof MatchedInnovation>;

export const MatchResponse = z.object({
  description_segments: z.array(TextSegment), // "Twój opis" after removing personal data, with highlights
  challenge: MatchedChallenge.nullable(), // "Wyzwanie z Mapy Wyzwań ROPS"
  innovations: z.array(MatchedInnovation).max(3), // "Pasujące innowacje", best first; may be empty
  more: z.array(InnovationSummary), // further candidates for "Zobacz też", without AI reasons
  match_quality: z.enum(["strong", "weak"]), // weak → stress "Zgłoś potrzebę do ROPS"
  no_match_reason: z.string().nullable(), // when innovations is empty
  picked_by: z.enum(["ai", "search"]), // "search" = AI unavailable, ranking only (no reasons)
});
export type MatchResponse = z.infer<typeof MatchResponse>;

// Sample data checked against the schema: a mistake in fixtures shows up immediately.
export const matchFixtures = {
  request: MatchRequest.parse(fixture.request),
  response: MatchResponse.parse(fixture.response),
  responseNoMatch: MatchResponse.parse(fixture.response_no_match),
};
