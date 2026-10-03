// AI draft of a Middleman service card: turns a Library innovation into a service that a specific
// institution can order and run. Guarded against generic AI text ("slop"):
// - only facts about the innovation and the institution go in; unknowns become things to check,
// - marketing words are rejected by the schema, so generateJson asks the model to rewrite once,
// - numbers, amounts and dates that are not in the input become placeholders (code, not prompt),
// - the first step is always contact with the authors through ROPS.
import { z } from "zod";
import type { Innovation } from "@/lib/contracts/knowledge-base";
import type { InstitutionFit, InstitutionProfile } from "@/lib/contracts/middleman";
import { removeInventedNumbers } from "../creator/guards";
import { generateJson, type GenerateJsonOptions } from "../llm";
import { INSTITUTION_LABELS } from "./facts";

const MUNICIPALITY_LABELS: Record<InstitutionProfile["municipality_kind"], string> = {
  wiejska: "gmina wiejska",
  "miejsko-wiejska": "gmina miejsko-wiejska",
  miejska: "gmina miejska",
  powiat: "powiat",
};

// Words that make a text sound like an advert instead of a plan. Checked case-insensitively.
export const BUZZWORDS = [
  "innowacyjn",
  "kompleksow",
  "synergi",
  "holistyczn",
  "przełomow",
  "kluczow",
  "nowoczesn",
  "efektywn",
  "wieloaspektow",
  "dedykowan",
  "unikaln",
];

export function buzzwordsIn(text: string, innovationName = ""): string[] {
  // A word from the innovation's own name ("Organizator kompleksowej opieki…") may be quoted,
  // also in a shortened form, so it is not counted as marketing language.
  const name = innovationName.toLowerCase();
  const lower = text.toLowerCase();
  return BUZZWORDS.filter((w) => !name.includes(w) && lower.includes(w));
}

export const ROPS_FIRST_STEP = "Napisz do ROPS i poproś o rozmowę z autorami innowacji.";

const SYSTEM = `You turn a social innovation from the ROPS Małopolska library into a service card that one specific institution can order, fund and run.
Use ONLY the facts given about the innovation and the institution. If something needed is unknown, say what the institution must check, never invent it.
Write plain, concrete Polish for municipal staff: short sentences, no jargon, no marketing words (innowacyjny, kompleksowy, synergia, holistyczny, przełomowy, kluczowy, nowoczesny, efektywny, dedykowany, unikalny).
Never write numbers, amounts, dates, durations or costs; write [do uzupełnienia] instead.
Fields:
- "title": the service as this municipality would name it in its own documents (not the innovation's name), at most 8 words.
- "for_whom": who in this municipality benefits, from the innovation's audience, 1-2 sentences.
- "how_it_works": 3-6 steps; each step starts with who acts (e.g. "Pracownik GOPS…", "Rodzina…", "Koordynator…") and says what they do.
- "who_delivers": which staff of THIS institution and which partners, using the institution's staff description and the innovation's implementers, 1-2 sentences.
- "risks": 2-3 concrete things that can go wrong for THIS institution, considering its constraints and the kind of municipality, one short paragraph.
- "first_steps": exactly 3 steps; the first one is contacting the innovation's authors through ROPS.
Return json: {"title": "...", "for_whom": "...", "how_it_works": ["..."], "who_delivers": "...", "risks": "...", "first_steps": ["...", "...", "..."]}`;

export type ServiceDraft = {
  title: string;
  for_whom: string;
  how_it_works: string[];
  who_delivers: string;
  risks: string;
  first_steps: string[];
};

function facts(innovation: Innovation, institution: InstitutionProfile, fit: InstitutionFit) {
  return {
    innovation: {
      name: innovation.nazwa,
      description: innovation.opis_krotki,
      problem: innovation.problem,
      for_whom: innovation.dla_kogo,
      who_can_implement: innovation.kto_moze_wdrozyc,
      does_it_work: innovation.czy_dziala,
    },
    institution: {
      type: INSTITUTION_LABELS[institution.type],
      name: institution.name,
      municipality: MUNICIPALITY_LABELS[institution.municipality_kind],
      staff: institution.staff ?? "nie podano",
      constraints: institution.constraints ?? "nie podano",
    },
    fit: fit.note,
  };
}

export async function draftServiceCard(
  innovation: Innovation,
  institution: InstitutionProfile,
  fit: InstitutionFit,
  options: GenerateJsonOptions = {},
): Promise<ServiceDraft> {
  const plain = z
    .string()
    .trim()
    .min(3)
    .refine((t) => !buzzwordsIn(t, innovation.nazwa).length, {
      message:
        "remove marketing words (innowacyjny, kompleksowy, kluczowy, efektywny…) and say it plainly",
    });
  const Schema = z.object({
    title: plain,
    for_whom: plain,
    how_it_works: z.array(plain).min(3).max(6),
    who_delivers: plain,
    risks: plain,
    first_steps: z.array(plain).min(2).max(4),
  });
  const input = facts(innovation, institution, fit);
  const out = await generateJson(
    Schema,
    [
      { role: "system", content: SYSTEM },
      { role: "user", content: `Facts (json):\n${JSON.stringify(input)}` },
    ],
    { temperature: 0.3, maxTokens: 2500, ...options },
  );

  const source = JSON.stringify(input);
  const clean = (t: string) => removeInventedNumbers(t, source).text;
  const steps = out.first_steps.map(clean);
  const firstSteps = (/ROPS/.test(steps[0] ?? "") ? steps : [ROPS_FIRST_STEP, ...steps]).slice(
    0,
    3,
  );
  return {
    title: clean(out.title),
    for_whom: clean(out.for_whom),
    how_it_works: out.how_it_works.map(clean),
    who_delivers: clean(out.who_delivers),
    risks: clean(out.risks),
    first_steps: firstSteps,
  };
}
