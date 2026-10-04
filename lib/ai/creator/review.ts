// "Sprawdź fiszkę" (POST /api/ai/review): what the author should change, each point with evidence.
//
//   1. Rules on the card and the canvas answers (canvas-facts.ts), computed, never wrong.
//   2. The AI adds up to 3 points the rules can't see, comparing the card with similar innovations
//      from the ROPS Library: each point must name its source (an innovation from the list with a
//      verbatim quote, a canvas question the author answered, or a card field). Anything else is
//      dropped. A sentence to add is accepted only if it invents no numbers.
//
// The result replaces rewording hints: it tells what to change and where, and why.
import { z } from "zod";
import {
  IdeaField,
  type IdeaDraft,
  type ReviewCheck,
  type ReviewResponse,
} from "@/lib/contracts/ai";
import { InnovationSummary, type Innovation } from "@/lib/contracts/knowledge-base";
import { generateJson, idFrom, type GenerateJsonOptions } from "../llm";
import { type Answers, CANVAS_TOTAL, canvasFacts, ruleChecks } from "./canvas-facts";
import { removeInventedNumbers } from "./guards";

export const MAX_AI_CHECKS = 3;
const MAX_CHECKS = 7;

export type ReviewDeps = {
  answers: Answers; // canvas answers of the saved idea ({} when not saved or not readable)
  similar: Innovation[]; // up to 3 similar innovations from the Library, best first
  llm: GenerateJsonOptions | null; // null: rules only (no model configured)
};

const FIELD_NAMES: Record<IdeaField, string> = {
  title: "Tytuł",
  description: "Opis",
  essence: "Istota",
  audience: "Dla kogo",
};

const cardValue = (idea: IdeaDraft, field: IdeaField) =>
  ({
    title: idea.title,
    description: idea.description,
    essence: idea.essence,
    audience: idea.audience,
  })[field] ?? "";

const normalize = (s: string) => s.replace(/\s+/g, " ").trim();
const unquote = (q: string) =>
  normalize(q)
    .replace(/^[„"“'«]+|[”"'»]+$/g, "")
    .replace(/[.…]+$/, "");

function innovationText(i: Innovation): string {
  return normalize([i.opis_krotki ?? "", i.problem ?? "", i.czy_dziala ?? ""].join(" "));
}

const SYSTEM = `You review the idea card of a resident or an organisation that wants ROPS Małopolska to support their social innovation.
You get the card, the author's answers from the innovation canvas, similar innovations from the ROPS Library (JSON), and points already found.
Find at most ${MAX_AI_CHECKS} NEW, concrete points that would make the idea clearer or stronger. Most useful: what a similar innovation does that the card does not mention (how people are found, who organises, how it is paid for, what was learned).
Rules:
- Each point has a source: "biblioteka" (innovation_id from the list and a "quote" copied character for character from its description, problem or results), "kanwa" (a canvas step id from the list) or "fiszka" (a card field).
- "title": what to change, as an instruction or a question, max 80 characters, plain Polish, e.g. "Skąd dowiecie się o wypisie ze szpitala?".
- "detail": 1-2 short sentences in plain Polish addressed to the author ("Napisz…", "W podobnej innowacji…").
- "suggestion": optional ONE sentence the author could add to "field", built only from facts in the card or the canvas; null if it would need new facts. Never numbers, amounts, dates or names.
- "kind": "brakuje" (something missing), "do_przemyslenia" (a risk or a choice to think over) or "mocna_strona" (a strength to say out loud).
- Do not repeat points already found. Do not praise or reword the card. No generic advice ("dodaj więcej szczegółów").
Return json: {"checks": [{"kind": "...", "title": "...", "detail": "...", "field": "title"|"description"|"essence"|"audience"|null, "source": "biblioteka"|"kanwa"|"fiszka", "innovation_id": "..."|null, "step": "..."|null, "quote": "..."|null, "suggestion": "..."|null}]}`;

async function aiChecks(
  idea: IdeaDraft,
  deps: ReviewDeps,
  found: ReviewCheck[],
): Promise<ReviewCheck[]> {
  if (!deps.llm) return [];
  const facts = canvasFacts(deps.answers);
  const steps = facts.map((f) => f.step);
  const byId = new Map(deps.similar.map((i) => [i.id, i]));
  const Schema = z.object({
    checks: z
      .array(
        z.object({
          kind: z.enum(["brakuje", "do_przemyslenia", "mocna_strona"]),
          title: z.string().min(3).max(120),
          detail: z.string().min(3).max(400),
          field: IdeaField.nullable().optional(),
          source: z.enum(["biblioteka", "kanwa", "fiszka"]),
          innovation_id: idFrom([...byId.keys()])
            .nullable()
            .optional(),
          step: (steps.length ? idFrom(steps) : z.literal("none")).nullable().optional(),
          quote: z.string().nullable().optional(),
          suggestion: z.string().nullable().optional(),
        }),
      )
      .max(5),
  });

  const card = (Object.keys(FIELD_NAMES) as IdeaField[])
    .map((f) => `${FIELD_NAMES[f]} (${f}): ${cardValue(idea, f) || "(puste)"}`)
    .join("\n");
  const canvas = facts.length
    ? facts.map((f) => `- ${f.step} | ${f.label}: ${f.answer}`).join("\n")
    : "(brak odpowiedzi)";
  const similar = deps.similar.map((i) => ({
    id: i.id,
    name: i.nazwa,
    description: i.opis_krotki,
    problem: i.problem,
    results: i.czy_dziala,
    who_implements: i.kto_moze_wdrozyc,
  }));
  const out = await generateJson(
    Schema,
    [
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content: `Card:\n${card}\n\nCanvas answers (step | question: answer):\n${canvas}\n\nSimilar innovations (json):\n${JSON.stringify(similar)}\n\nPoints already found:\n${found.map((c) => `- ${c.title}`).join("\n") || "(none)"}`,
      },
    ],
    { temperature: 0.2, maxTokens: 1800, ...deps.llm },
  );

  // The author's own facts: the only base a suggested sentence may use.
  const ownFacts = [card, canvas].join("\n");
  const taken = new Set(found.map((c) => normalize(c.title).toLowerCase()));
  const checks: ReviewCheck[] = [];
  for (const [n, c] of out.checks.entries()) {
    let source: ReviewCheck["source"] | null = null;
    let step: string | null = null;
    if (c.source === "biblioteka" && c.innovation_id && byId.has(c.innovation_id)) {
      const innovation = byId.get(c.innovation_id)!;
      const quote = c.quote ? unquote(c.quote) : "";
      source = {
        kind: "biblioteka",
        innovation_id: innovation.id,
        name: innovation.nazwa,
        quote: quote.length >= 8 && innovationText(innovation).includes(quote) ? quote : null,
      };
    } else if (c.source === "kanwa" && c.step && c.step !== "none") {
      const fact = facts.find((f) => f.step === c.step);
      if (fact) {
        source = { kind: "kanwa", step: fact.step, label: fact.label, answer: fact.answer };
        step = fact.step;
      }
    } else if (c.source === "fiszka" && c.field) {
      source = { kind: "fiszka", field: c.field };
    }
    if (!source) continue; // a point without evidence is not shown
    const title = normalize(c.title).replace(/\.$/, "");
    if (taken.has(title.toLowerCase())) continue;
    taken.add(title.toLowerCase());

    const field = c.field ?? null;
    let suggestion: string | null = null;
    if (c.suggestion && field) {
      const guarded = removeInventedNumbers(normalize(c.suggestion), ownFacts);
      const current = normalize(cardValue(idea, field)).toLowerCase();
      if (!guarded.replaced && !current.includes(guarded.text.toLowerCase())) {
        suggestion = guarded.text;
      }
    }
    checks.push({
      id: `ai-${n + 1}`,
      kind: c.kind,
      title: title.slice(0, 90),
      detail: normalize(c.detail),
      field,
      step,
      suggestion,
      source,
      ai: true,
    });
    if (checks.length === MAX_AI_CHECKS) break;
  }
  return checks;
}

const ORDER = { brakuje: 0, do_przemyslenia: 1, mocna_strona: 2 } as const;

export async function reviewIdea(idea: IdeaDraft, deps: ReviewDeps): Promise<ReviewResponse> {
  const rules = ruleChecks(idea, deps.answers);
  const ai = await aiChecks(idea, deps, rules);
  // Missing things first, then what to think over, then strengths; within a kind, rules first.
  const checks = [...rules, ...ai]
    .sort((a, b) => ORDER[a.kind] - ORDER[b.kind])
    .slice(0, MAX_CHECKS);
  const filled = (Object.keys(FIELD_NAMES) as IdeaField[]).filter(
    (f) => cardValue(idea, f).trim() !== "",
  ).length;
  return {
    progress: {
      card_filled: filled,
      card_total: 4,
      canvas_answered: canvasFacts(deps.answers).length,
      canvas_total: CANVAS_TOTAL,
    },
    checks,
    similar: deps.similar.slice(0, 3).map((i) => InnovationSummary.parse(i)),
  };
}

// Text the similar innovations are searched with: the whole card, not only the description.
export function reviewSearchText(idea: IdeaDraft): string {
  return [idea.title, idea.description, idea.essence, idea.audience]
    .map((p) => p?.trim().replace(/[.!?\s]+$/, ""))
    .filter(Boolean)
    .join(". ")
    .slice(0, 2000);
}
