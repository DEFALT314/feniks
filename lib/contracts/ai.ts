// Contract for AI in the idea creator (P3 endpoints, used by P2's /my/creator):
//   POST /api/ai/podpowiedz  hints for the idea card fields
//   POST /api/ai/wniosek     draft of a grant application for an open call
//   POST /api/ai/obraz       visualisation of the idea
// Sample data: lib/contracts/fixtures/ai.json. After 17:00, changes only by adding fields.
//
// Rules (CLAUDE.md, rule 5): every AI text is shown with the „Propozycja AI” label and is used only
// after a human click ("Użyj"); AI never invents numbers or costs, those stay as [placeholders].
import { z } from "zod";
import fixture from "./fixtures/ai.json";

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

// --- /api/ai/podpowiedz ---

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

// --- GET /api/ai/nabory ---
// Open calls ("nabory") to choose from. Until P4 adds a calls table, these are demo calls
// (demo: true, labelled "Dane demonstracyjne" in the UI).

export const CallSummary = z.object({
  id: z.string(),
  name: z.string(),
  organizer: z.string(),
  goal: z.string(), // what the call funds, plain Polish
  deadline: z.string().nullable(), // ISO date
  demo: z.boolean(),
});
export type CallSummary = z.infer<typeof CallSummary>;

export const CallList = z.object({ calls: z.array(CallSummary) });
export type CallList = z.infer<typeof CallList>;

// --- /api/ai/wniosek ---

export const ApplicationRequest = z.object({
  idea: IdeaDraft,
  call_id: z.string(), // the open call ("nabór") chosen from the ROPS list
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
    }),
  ),
});
export type ApplicationResponse = z.infer<typeof ApplicationResponse>;

// --- /api/ai/obraz ---

export const ImageRequest = z.object({
  idea: IdeaDraft,
  regenerate: z.boolean().optional(), // "Wygeneruj ponownie"
});
export type ImageRequest = z.infer<typeof ImageRequest>;

export const ImageResponse = z.object({
  image_url: z.string(), // Supabase Storage URL
  alt_text: z.string(), // "Opis obrazu dla czytnika ekranu", Polish
});
export type ImageResponse = z.infer<typeof ImageResponse>;

// Sample data checked against the schemas: a mistake in fixtures shows up immediately.
export const aiFixtures = {
  callList: CallList.parse(fixture.call_list),
  hintRequest: HintRequest.parse(fixture.hint_request),
  hintResponse: HintResponse.parse(fixture.hint_response),
  applicationRequest: ApplicationRequest.parse(fixture.application_request),
  applicationResponse: ApplicationResponse.parse(fixture.application_response),
  imageRequest: ImageRequest.parse(fixture.image_request),
  imageResponse: ImageResponse.parse(fixture.image_response),
};
