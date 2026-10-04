// Contract for AI in the idea creator (P3 endpoints, used by P2's /my/creator):
//   POST /api/ai/hints        hints for the idea card fields
//   POST /api/ai/application  draft of a grant application for an open call
//   GET  /api/ai/calls        open calls to choose from
//   POST /api/ai/alternatives unusual ways to solve the same problem (#103)
//   POST /api/ai/review       "Sprawdź fiszkę": what to change, each point with its evidence
// Sample data: lib/contracts/fixtures/ai.json. After 17:00, changes only by adding fields.
//
// Rules (CLAUDE.md, rule 5): every AI text is shown with the „Propozycja AI” label and is used only
// after a human click ("Użyj"); AI never invents numbers or costs, those stay as [placeholders].
import { z } from "zod";
import fixture from "./fixtures/ai.json";
import { InnovationSummary } from "./knowledge-base";

export const IdeaStage = z.enum(["pomysl", "prototyp", "przetestowane", "gotowe"]);
export type IdeaStage = z.infer<typeof IdeaStage>;

// The idea card ("fiszka") as the AI needs it; P2 maps its own fields onto this.
export const IdeaDraft = z.object({
  title: z.string().trim().max(200),
  description: z.string().trim().max(3000),
  essence: z.string().trim().max(500).optional(), // "Istota"
  audience: z.string().trim().max(500).optional(), // "Dla kogo"
  stage: IdeaStage.optional(),
  area_id: z.string().optional(), // ChallengeArea.id when the author picked an area
});
export type IdeaDraft = z.infer<typeof IdeaDraft>;

// --- /api/ai/hints ---

export const IdeaField = z.enum(["title", "description", "essence", "audience"]);
export type IdeaField = z.infer<typeof IdeaField>;

export const HintRequest = z.object({
  idea: IdeaDraft,
  fields: z.array(IdeaField).min(1).optional(), // default: all fields
});
export type HintRequest = z.infer<typeof HintRequest>;

export const HintResponse = z.object({
  hints: z.array(
    z.object({
      field: IdeaField,
      text: z.string(), // proposed new value; the user clicks "Użyj" or ignores it
      why: z.string().nullable(), // one short sentence, plain Polish
    }),
  ),
});
export type HintResponse = z.infer<typeof HintResponse>;

// --- GET /api/ai/calls ---
// Open calls ("nabory") to choose from. Until P4 adds a calls table, these are demo calls
// (demo: true, labelled "Dane demonstracyjne" in the UI).

export const CallSummary = z.object({
  id: z.string(),
  name: z.string(),
  organizer: z.string(),
  goal: z.string(), // what the call funds, plain Polish
  deadline: z.string().nullable(), // ISO date
  demo: z.boolean(),
  // Added after 17:00: Challenges Map areas the call is for (empty = any area)
  areas: z.array(z.string()).optional(),
});
export type CallSummary = z.infer<typeof CallSummary>;

export const CallList = z.object({ calls: z.array(CallSummary) });
export type CallList = z.infer<typeof CallList>;

// POST /api/ai/calls (added after 17:00): the open calls ranked for the card as it is now.
// Computed, no AI: the idea's Challenges Map areas come from the same search as /match.
export const CallFit = z.enum(["pasuje", "dowolny", "inny"]);
export const RankCallsRequest = z.object({ idea: IdeaDraft });
export const RankedCallList = z.object({
  calls: z.array(CallSummary.extend({ fit: CallFit })), // fitting first, then any area, then others
  idea_areas: z.array(z.object({ id: z.string(), name: z.string() })),
});
export type RankedCallList = z.infer<typeof RankedCallList>;

// --- /api/ai/application ---

export const ApplicationRequest = z.object({
  idea: IdeaDraft,
  call_id: z.string(), // the open call ("nabór") chosen from the ROPS list
  // Added after 17:00: the saved idea, so the draft uses the author's canvas answers (costs,
  // partners, audience, impact). Read with the author's session (RLS); ignored if not theirs.
  idea_id: z.uuid().optional(),
});
export type ApplicationRequest = z.infer<typeof ApplicationRequest>;

export const ApplicationSectionKey = z.enum([
  "goal",
  "activities",
  "results",
  "audience",
  "budget",
]);

export const ApplicationResponse = z.object({
  call_id: z.string(),
  sections: z.array(
    z.object({
      key: ApplicationSectionKey,
      title: z.string(), // "Cel projektu", "Działania", "Rezultaty"…
      text: z.string(), // may contain [placeholders] the user must fill in
      needs_user_input: z.boolean(), // true when text has placeholders (numbers, costs)
      // Added after 17:00: where the text comes from, e.g. ["Kanwa: Koszty stałe", "Fiszka: Opis"]
      sources: z.array(z.string()).optional(),
    }),
  ),
  // Added after 17:00 (optional): computed from data, shown next to the AI draft.
  fit: z
    .object({
      level: z.enum(["dobra", "czesciowa", "slaba"]),
      note: z.string(), // plain Polish: why the idea fits the call or not
    })
    .optional(),
  missing: z.array(z.string()).optional(), // what the author must still add before applying
});
export type ApplicationResponse = z.infer<typeof ApplicationResponse>;

// --- /api/ai/alternatives (#103) ---
// "Pokaż inne podejścia": 2–3 unusual ways to solve the same problem (another group, partner or
// format). The author adds one to the description with a click, or ignores them.

export const AlternativesRequest = z.object({ idea: IdeaDraft });
export type AlternativesRequest = z.infer<typeof AlternativesRequest>;

export const AlternativesResponse = z.object({
  alternatives: z
    .array(
      z.object({
        title: z.string(), // a few words, plain Polish
        text: z.string(), // 1–3 sentences: what would be done differently
        why: z.string().nullable(), // one short sentence: why it may work
      }),
    )
    .max(3),
});
export type AlternativesResponse = z.infer<typeof AlternativesResponse>;
// --- POST /api/ai/review: "Sprawdź fiszkę" (added after 17:00) ---
// Instead of rewording the card, points out what to change, each point with its evidence: an answer
// from the author's canvas or a similar innovation from the ROPS Library (with a verbatim quote).
// Points with ai: false are computed from the data; ai: true are „Propozycja AI”.

export const ReviewRequest = z.object({
  idea: IdeaDraft,
  idea_id: z.uuid().optional(), // the saved idea: its canvas answers are read with the author's session
});
export type ReviewRequest = z.infer<typeof ReviewRequest>;

export const ReviewSource = z.discriminatedUnion("kind", [
  // canvas question (step id of /my/creator/[id]?step=…) and the author's answer
  z.object({
    kind: z.literal("kanwa"),
    step: z.string(),
    label: z.string(),
    answer: z.string(),
  }),
  // a similar innovation from the ROPS Library; quote is copied verbatim from its card
  z.object({
    kind: z.literal("biblioteka"),
    innovation_id: z.string(),
    name: z.string(),
    quote: z.string().nullable(),
  }),
  // a field of the card itself
  z.object({ kind: z.literal("fiszka"), field: IdeaField }),
]);
export type ReviewSource = z.infer<typeof ReviewSource>;

export const ReviewCheck = z.object({
  id: z.string(),
  kind: z.enum(["brakuje", "do_przemyslenia", "mocna_strona"]),
  title: z.string(), // short, plain Polish: what to change
  detail: z.string(), // 1–2 sentences: why it matters
  field: IdeaField.nullable(), // card field to change ("Przejdź do pola"), if any
  step: z.string().nullable(), // canvas question to revisit ("Popraw w kanwie"), if any
  suggestion: z.string().nullable(), // a sentence to add to `field`, only from the author's own facts
  source: ReviewSource,
  ai: z.boolean(),
});
export type ReviewCheck = z.infer<typeof ReviewCheck>;

export const ReviewResponse = z.object({
  progress: z.object({
    card_filled: z.number().int().min(0), // of 4 text fields
    card_total: z.number().int().min(1),
    canvas_answered: z.number().int().min(0),
    canvas_total: z.number().int().min(1),
  }),
  checks: z.array(ReviewCheck), // most important first: brakuje, do_przemyslenia, mocna_strona
  similar: z.array(InnovationSummary).max(3), // the evidence used, for "Coś podobnego już działa"
});
export type ReviewResponse = z.infer<typeof ReviewResponse>;

// Sample data checked against the schemas: a mistake in fixtures shows up immediately.
export const aiFixtures = {
  callList: CallList.parse(fixture.call_list),
  hintRequest: HintRequest.parse(fixture.hint_request),
  hintResponse: HintResponse.parse(fixture.hint_response),
  applicationRequest: ApplicationRequest.parse(fixture.application_request),
  applicationResponse: ApplicationResponse.parse(fixture.application_response),
  alternativesRequest: AlternativesRequest.parse(fixture.alternatives_request),
  alternativesResponse: AlternativesResponse.parse(fixture.alternatives_response),
  reviewResponse: ReviewResponse.parse(fixture.review_response),
};
