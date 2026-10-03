import { z } from "zod";
import canvasData from "@/data/rops/canvas_innowacji.json";
import type { IdeaStage } from "@/lib/contracts/ai";
import {
  Canvas,
  ChoiceWithTextAnswer,
  MatrixAnswer,
  MultiChoiceAnswer,
  PartnersAnswer,
  SingleChoiceAnswer,
  TextListAnswer,
  type CanvasAnswer,
  type CanvasField,
} from "@/lib/contracts/idea-creator";

export const canvas = Canvas.parse(canvasData);

// One field = one screen, in the order of the printed canvas
export const fields: CanvasField[] = canvas.arkusze.flatMap((sheet) => sheet.pola);

export type CanvasSection = { id: string; label: string; fields: CanvasField[] };

// Plain-language section names from design/makiety/Kreator.dc.html (block names in the data are jargon)
const SECTION_LABELS: Record<string, string> = {
  Problem: "Problem",
  "Aktorzy zmiany": "Kto pomoże, kto przeszkodzi",
  Rozwiązanie: "Rozwiązanie",
  "Struktura kosztów": "Koszty",
  Odbiorcy: "Odbiorcy",
  "Źródła dochodów": "Skąd pieniądze",
  "Propozycja wartości": "Co to daje ludziom",
  Kanały: "Jak dotrzeć",
  "Konstelacja partnerów": "Partnerzy",
  Wpływ: "Wpływ",
};

// Consecutive fields with the same block form a section of the side menu
export const sections: CanvasSection[] = fields.reduce<CanvasSection[]>((acc, field) => {
  const last = acc.at(-1);
  if (last && last.fields[0].blok === field.blok) last.fields.push(field);
  else acc.push({ id: field.id, label: SECTION_LABELS[field.blok] ?? field.blok, fields: [field] });
  return acc;
}, []);

export function fieldIndex(fieldId: string): number {
  return fields.findIndex((f) => f.id === fieldId);
}

export function sectionOf(fieldId: string): CanvasSection | undefined {
  return sections.find((s) => s.fields.some((f) => f.id === fieldId));
}

const OTHER = "inne";

// Answer schema for one field: the shape for its type, and values must come from the field's options
export function answerSchema(field: CanvasField): z.ZodType<CanvasAnswer> {
  const options = field.opcje ?? [];
  const isOption = (v: string) => options.includes(v);
  switch (field.typ) {
    case "jeden_wybor":
    case "skala":
      return SingleChoiceAnswer.strict().refine((a) => isOption(a.choice));
    case "jeden_wybor_plus_tekst":
      return ChoiceWithTextAnswer.strict().refine((a) => isOption(a.choice));
    case "wiele_wyborow":
    case "wiele_wyborow_max3":
      return MultiChoiceAnswer.strict().refine(
        (a) =>
          a.choices.every(isOption) &&
          new Set(a.choices).size === a.choices.length &&
          (field.typ !== "wiele_wyborow_max3" || a.choices.length <= 3) &&
          (a.other === undefined || a.choices.includes(OTHER)),
      );
    case "tekst_lista":
      return TextListAnswer.strict();
    case "lista_partnerow":
      return PartnersAnswer.strict().refine((a) =>
        a.partners.every(
          (p) => (field.osie ?? []).includes(p.axis) && (field.status ?? []).includes(p.status),
        ),
      );
    case "macierz":
      return MatrixAnswer.strict().refine((a) =>
        Object.entries(a.cells).every(
          ([column, row]) =>
            (field.kolumny ?? []).includes(column) && (field.wiersze ?? []).includes(row),
        ),
      );
  }
}

// An answer counts once the author actually chose or wrote something
export function isAnswered(answer: CanvasAnswer | undefined): boolean {
  if (!answer) return false;
  if ("choice" in answer) return answer.choice !== "";
  if ("choices" in answer) return answer.choices.length > 0;
  if ("items" in answer) return answer.items.some((item) => item.trim() !== "");
  if ("partners" in answer) return answer.partners.length > 0;
  return Object.keys(answer.cells).length > 0;
}

export function answeredCount(
  sectionFields: CanvasField[],
  answers: Record<string, CanvasAnswer>,
): number {
  return sectionFields.filter((f) => isAnswered(answers[f.id])).length;
}

// The "gotowosc" (readiness) question answers the card's stage directly
const STAGE_BY_READINESS: Record<string, IdeaStage> = {
  Pomysł: "pomysl",
  Prototyp: "prototyp",
  "Przetestowane rozwiązanie": "przetestowane",
  "Gotowe do wdrożenia": "gotowe",
};

export function stageFromAnswers(answers: Record<string, CanvasAnswer>): IdeaStage | null {
  const readiness = answers["gotowosc"];
  return readiness && "choice" in readiness ? (STAGE_BY_READINESS[readiness.choice] ?? null) : null;
}

export const STAGE_LABELS: Record<IdeaStage, string> = {
  pomysl: "Pomysł",
  prototyp: "Prototyp",
  przetestowane: "Przetestowane",
  gotowe: "Gotowe do wdrożenia",
};

// Short plain-text summary of an answer, e.g. "Mocno przeszkadza" or "Osoba: Silny, Społeczność: Wyraźny"
export function describeAnswer(answer: CanvasAnswer): string {
  if ("choice" in answer)
    return "text" in answer && answer.text ? `${answer.choice} (${answer.text})` : answer.choice;
  if ("choices" in answer) {
    const choices = answer.choices.filter((c) => c !== OTHER);
    return [...choices, ...(answer.other ? [answer.other] : [])].join(", ");
  }
  if ("items" in answer) return answer.items.filter((item) => item.trim() !== "").join(", ");
  if ("partners" in answer) return answer.partners.map((p) => p.name).join(", ");
  return Object.entries(answer.cells)
    .map(([column, row]) => `${column}: ${row}`)
    .join(", ");
}

export type CardTextField = "opis" | "istota" | "dla_kogo";

// Canvas answers that help write each text field of the card (mapowanie_fiszki in the canvas data)
export function cardHints(answers: Record<string, CanvasAnswer>): Record<CardTextField, string[]> {
  const hints: Record<CardTextField, string[]> = { opis: [], istota: [], dla_kogo: [] };
  for (const field of fields) {
    const target = field.mapowanie_fiszki;
    const answer = answers[field.id];
    if (!target || target === "etap" || !answer || !isAnswered(answer)) continue;
    hints[target].push(`${field.nazwa}: ${describeAnswer(answer)}`);
  }
  return hints;
}
