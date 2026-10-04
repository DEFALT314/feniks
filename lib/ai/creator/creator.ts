// AI for the idea creator (#18): hints, application draft and unusual approaches (#103).
// Both go through generateJson (personal data removed, JSON validated, one retry) and are
// shown with the „Propozycja AI” label; the user applies them with a click (P2's UI).
import { z } from "zod";
import demoCalls from "@/data/derived/demo-calls.json";
import {
  ApplicationSectionKey,
  CallSummary,
  IdeaField,
  type AlternativesRequest,
  type AlternativesResponse,
  type ApplicationRequest,
  type ApplicationResponse,
  type HintRequest,
  type HintResponse,
  type IdeaDraft,
} from "@/lib/contracts/ai";
import { generateJson, type GenerateJsonOptions } from "../llm";
import { type Answers, canvasFacts } from "./canvas-facts";
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
  const current: Record<z.infer<typeof IdeaField>, string | undefined> = {
    title: request.idea.title,
    description: request.idea.description,
    essence: request.idea.essence,
    audience: request.idea.audience,
  };
  const same = (a: string, b: string | undefined) =>
    simplify(a) === simplify(b ?? "") && simplify(a) !== "";
  return {
    hints: out.hints
      .filter(
        (h, n, all) => fields.includes(h.field) && all.findIndex((x) => x.field === h.field) === n,
      )
      .map((h) => {
        const text = removeInventedNumbers(h.text.trim(), source).text;
        // "Istota" is one sentence by definition (the card says so)
        return {
          field: h.field,
          text: h.field === "essence" ? firstSentence(text) : text,
          why: h.why ?? null,
        };
      })
      // a "hint" that repeats what the field already says is noise
      .filter((h) => !same(h.text, current[h.field])),
  };
}

const simplify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

function firstSentence(text: string): string {
  return text.split(/(?<=[.!?])\s+(?=[A-ZĄĆĘŁŃÓŚŹŻ])/)[0];
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
// Budget lines straight from the costs the author ticked in the canvas, each with [kwota]: computed,
// so no cost is invented and none the author chose is lost.
export function budgetFromCanvas(answers: Answers): { text: string; sources: string[] } | null {
  const lines: string[] = [];
  const sources: string[] = [];
  for (const [step, label] of [
    ["koszty-stale", "Koszty stałe"],
    ["koszty-zmienne", "Koszty zmienne"],
  ] as const) {
    const a = answers[step];
    if (!a || !("choices" in a)) continue;
    const picked = [...a.choices.filter((c) => c !== "inne"), ...(a.other ? [a.other] : [])];
    if (!picked.length) continue;
    sources.push(`Kanwa: ${label}`);
    lines.push(`${label}:`, ...picked.map((c) => `- ${c}: [kwota]`));
  }
  return lines.length ? { text: lines.join("\n"), sources } : null;
}

// Sentences about whether the idea fits the call belong to "fit", not to the application text
// (the model tends to add "Cel nie jest powiązany z celem naboru…" despite being told not to).
const FIT_TALK = /\b(nabor\w*|naboru)\b/i;
const NEGATION =
  /\bnie\s+(jest|są|pasuj\w*|wiąż\w*|dotycz\w*|zgadza\w*|pokrywa\w*)|\bniezgodn\w*|\bniepowiązan\w*/i;

export function withoutFitTalk(text: string): string {
  return text
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => !(FIT_TALK.test(sentence) && NEGATION.test(sentence)))
    .join(" ")
    .trim();
}

export async function applicationDraft(
  request: ApplicationRequest,
  options: GenerateJsonOptions = {},
  calls: CallSummary[] = CALLS,
  answers: Answers = {},
): Promise<ApplicationResponse | null> {
  const call = calls.find((c) => c.id === request.call_id);
  if (!call) return null;
  const facts = canvasFacts(answers);
  const budget = budgetFromCanvas(answers);
  const allowedSources = [
    ...(["Tytuł", "Opis", "Istota", "Dla kogo"] as const).map((f) => `Fiszka: ${f}`),
    ...facts.map((f) => `Kanwa: ${f.label}`),
    "Nabór",
  ];
  const Schema = z.object({
    sections: z.array(
      z.object({
        key: ApplicationSectionKey,
        text: z.string().min(1),
        sources: z.array(z.string()).optional(),
      }),
    ),
    fit: z
      .object({ level: z.enum(["dobra", "czesciowa", "slaba"]), note: z.string().min(3) })
      .optional(),
    missing: z.array(z.string()).optional(),
  });
  const canvas = facts.length
    ? facts.map((f) => `- ${f.label}: ${f.answer}`).join("\n")
    : "(the author has not answered the canvas yet)";
  const out = await generateJson(
    Schema,
    [
      {
        role: "system",
        content: `You draft a grant application for an open call, from a resident's idea card and their answers to the innovation canvas. ${RULES}
Use the canvas answers: they are the author's own facts (who the users are, who pays, partners, channels, impact). Write each section as 2-4 full, natural sentences, not a list of three-word sentences.
Never pretend the idea fits the call. Tie the goal to the call's goal only where it truly matches (same people, same problem); if it does not, write the goal of the idea itself and say in "fit" (level "slaba" or "czesciowa") what does not match. Comments about the fit go only to "fit", never into the sections: the sections are text for the application form.
Sections: goal (the idea's goal, tied to the call's goal only where it truly matches), audience (users, who pays, who decides), activities (concrete steps, partners and how people are reached), results (what changes for a person and a community, with placeholders for any numbers)${budget ? "" : ", budget (only cost categories with [kwota], never amounts)"}.
For each section list "sources": which of these it is based on: ${JSON.stringify(allowedSources)}.
"fit": does the idea fit what the call funds? level "dobra", "czesciowa" or "slaba" and one plain-Polish sentence why.
"missing": up to 4 short items the author must still add before applying (e.g. "Ilu seniorom pomożecie"), plain Polish.
Return json: {"sections": [{"key": "goal"|"audience"|"activities"|"results"|"budget", "text": "...", "sources": ["..."]}], "fit": {"level": "...", "note": "..."}, "missing": ["..."]}`,
      },
      {
        role: "user",
        content: `Call: ${call.name}\nCall goal: ${call.goal}\n\nIdea card:\n${ideaText(request.idea)}\n\nCanvas answers:\n${canvas}`,
      },
    ],
    { temperature: 0.3, maxTokens: 3000, ...options },
  );
  const source = `${ideaText(request.idea)}\n${canvas}\n${call.name}\n${call.goal}`;
  const allowed = new Set(allowedSources);
  const sections = SECTION_ORDER.flatMap((key) => {
    if (key === "budget" && budget) {
      return [
        {
          key,
          title: SECTION_TITLES[key],
          text: budget.text,
          needs_user_input: true,
          sources: budget.sources,
        },
      ];
    }
    const s = out.sections.find((x) => x.key === key);
    if (!s) return [];
    const { text, replaced } = removeInventedNumbers(withoutFitTalk(s.text.trim()), source);
    return [
      {
        key,
        title: SECTION_TITLES[key],
        text,
        needs_user_input: replaced || hasPlaceholder(text),
        sources: [...new Set((s.sources ?? []).filter((x) => allowed.has(x)))],
      },
    ];
  });
  return {
    call_id: call.id,
    sections,
    ...(out.fit
      ? {
          fit: {
            level: out.fit.level,
            note: removeInventedNumbers(out.fit.note.trim(), source).text,
          },
        }
      : {}),
    missing: (out.missing ?? [])
      .map((m) => m.trim())
      .filter(Boolean)
      .slice(0, 4),
  };
}

// --- unusual approaches (#103) ---

export async function alternatives(
  request: AlternativesRequest,
  options: GenerateJsonOptions = {},
): Promise<AlternativesResponse> {
  const out = await generateJson(
    // The model may give more than 3: accept them and keep the first 3
    z.object({
      alternatives: z.array(
        z.object({ title: z.string(), text: z.string(), why: z.string().nullable().optional() }),
      ),
    }),
    [
      {
        role: "system",
        content: `You help a resident develop a social-innovation idea for ROPS Małopolska. Propose 2 or 3 unusual,
non-obvious ways to solve the SAME problem for the SAME people: e.g. a different group that helps, an unexpected
local partner (school, pharmacy, parish, sports club, shop), a different format (phone, game, meeting, mobile
service), or turning the receivers into helpers. Each must be realistic for a small Małopolska municipality and
different from what the idea already does. Serious and practical: a social worker should take it seriously. No
one-off events or gimmicks (no matches, concerts, contests, fans, celebrities). ${RULES}
Return json: {"alternatives": [{"title": "a few words", "text": "1-3 sentences", "why": "one short sentence"}]}`,
      },
      { role: "user", content: `Idea:\n${ideaText(request.idea)}` },
    ],
    // 0.8 gave ideas like "football fans visit seniors after hospital"; 0.5 stays varied but sensible
    { temperature: 0.5, maxTokens: 1500, ...options },
  );
  const source = ideaText(request.idea);
  return {
    alternatives: out.alternatives
      .filter((a) => a.title.trim() !== "" && a.text.trim() !== "")
      .slice(0, 3)
      .map((a) => ({
        title: a.title.trim(),
        text: removeInventedNumbers(a.text.trim(), source).text,
        why: a.why ? removeInventedNumbers(a.why.trim(), source).text : null,
      })),
  };
}
