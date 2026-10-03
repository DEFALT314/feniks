// AI for the idea creator (#18): hints and application draft.
// Both go through generateJson (personal data removed, JSON validated, one retry) and are
// shown with the „Propozycja AI” label; the user applies them with a click (P2's UI).
import { z } from "zod";
import demoCalls from "@/data/derived/demo-calls.json";
import {
  ApplicationSectionKey,
  CallSummary,
  IdeaField,
  type ApplicationRequest,
  type ApplicationResponse,
  type HintRequest,
  type HintResponse,
  type IdeaDraft,
} from "@/lib/contracts/ai";
import { generateJson, type GenerateJsonOptions } from "../llm";
import { hasPlaceholder, removeInventedNumbers } from "./guards";

export const CALLS = CallSummary.array().parse(demoCalls.calls);

const FIELD_NAMES: Record<z.infer<typeof IdeaField>, string> = {
  title: "Tytuł",
  description: "Opis",
  essence: "Istota",
  audience: "Dla kogo",
};

function ideaText(idea: IdeaDraft): string {
  return [
    `Tytuł: ${idea.title}`,
    `Opis: ${idea.description}`,
    idea.essence ? `Istota: ${idea.essence}` : null,
    idea.audience ? `Dla kogo: ${idea.audience}` : null,
    idea.stage ? `Etap: ${idea.stage}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

const RULES = `Write in plain Polish, short sentences, no jargon. Never invent numbers, amounts, dates, costs,
names of people or institutions. Where a number or cost is needed, write a placeholder in square brackets,
e.g. [liczba uczestników]. Do not add facts that are not in the idea.`;

// --- hints ---

export async function hints(
  request: HintRequest,
  options: GenerateJsonOptions = {},
): Promise<HintResponse> {
  const fields = request.fields ?? IdeaField.options;
  const Schema = z.object({
    hints: z.array(
      z.object({
        field: IdeaField,
        text: z.string().min(1),
        why: z.string().nullable().optional(),
      }),
    ),
  });
  const out = await generateJson(
    Schema,
    [
      {
        role: "system",
        content: `You help a resident improve the card of their social-innovation idea for ROPS Małopolska.
For each requested field, propose a better or missing text based only on the idea. ${RULES}
Return json: {"hints": [{"field": one of ${JSON.stringify(fields)}, "text": "...", "why": "one short sentence"}]}`,
      },
      {
        role: "user",
        content: `Idea:\n${ideaText(request.idea)}\n\nFields to improve: ${fields.map((f) => FIELD_NAMES[f]).join(", ")}`,
      },
    ],
    { temperature: 0.4, maxTokens: 2000, ...options },
  );
  const source = ideaText(request.idea);
  return {
    hints: out.hints
      .filter(
        (h, n, all) => fields.includes(h.field) && all.findIndex((x) => x.field === h.field) === n,
      )
      .map((h) => ({
        field: h.field,
        text: removeInventedNumbers(h.text.trim(), source).text,
        why: h.why ?? null,
      })),
  };
}

// --- application draft ---

const SECTION_TITLES: Record<z.infer<typeof ApplicationSectionKey>, string> = {
  goal: "Cel projektu",
  audience: "Odbiorcy",
  activities: "Działania",
  results: "Rezultaty",
  budget: "Budżet",
};

// Order of a typical grant application form: who it is for comes before what will be done
const SECTION_ORDER: z.infer<typeof ApplicationSectionKey>[] = [
  "goal",
  "audience",
  "activities",
  "results",
  "budget",
];

/** `calls`: the open calls (lib/ai/creator/open-calls.ts); an unknown or closed call gives null. */
export async function applicationDraft(
  request: ApplicationRequest,
  options: GenerateJsonOptions = {},
  calls: CallSummary[] = CALLS,
): Promise<ApplicationResponse | null> {
  const call = calls.find((c) => c.id === request.call_id);
  if (!call) return null;
  const Schema = z.object({
    sections: z.array(z.object({ key: ApplicationSectionKey, text: z.string().min(1) })),
  });
  const out = await generateJson(
    Schema,
    [
      {
        role: "system",
        content: `You draft a grant application for an open call, from a resident's idea card. ${RULES}
Sections: goal (1-2 sentences tied to the call's goal), audience, activities (concrete steps), results (what changes,
with placeholders for any numbers), budget (only cost categories with placeholders, never amounts).
Return json: {"sections": [{"key": "goal"|"audience"|"activities"|"results"|"budget", "text": "..."}]}`,
      },
      {
        role: "user",
        content: `Call: ${call.name}\nCall goal: ${call.goal}\n\nIdea:\n${ideaText(request.idea)}`,
      },
    ],
    { temperature: 0.3, maxTokens: 3000, ...options },
  );
  const source = `${ideaText(request.idea)}\n${call.name}\n${call.goal}`;
  const sections = SECTION_ORDER.flatMap((key) => {
    const s = out.sections.find((x) => x.key === key);
    if (!s) return [];
    const { text, replaced } = removeInventedNumbers(s.text.trim(), source);
    return [
      { key, title: SECTION_TITLES[key], text, needs_user_input: replaced || hasPlaceholder(text) },
    ];
  });
  return { call_id: call.id, sections };
}
