import { describe, expect, it } from "vitest";
import type { CanvasField } from "@/lib/contracts/idea-creator";
import {
  answeredCount,
  answerSchema,
  cardHints,
  describeAnswer,
  fields,
  isAnswered,
  sectionOf,
  sections,
  stageFromAnswers,
} from "./canvas";

const field = (id: string): CanvasField => {
  const found = fields.find((f) => f.id === id);
  if (!found) throw new Error(`no field ${id}`);
  return found;
};
const valid = (id: string, answer: unknown) => answerSchema(field(id)).safeParse(answer).success;

describe("canvas steps", () => {
  it("has one screen per field of the ROPS canvas", () => {
    expect(fields).toHaveLength(22);
    expect(new Set(fields.map((f) => f.id)).size).toBe(22);
  });

  it("groups fields into the ten sections of the mockup, in order", () => {
    expect(sections.map((s) => s.label)).toEqual([
      "Problem",
      "Kto pomoże, kto przeszkodzi",
      "Rozwiązanie",
      "Koszty",
      "Odbiorcy",
      "Skąd pieniądze",
      "Co to daje ludziom",
      "Jak dotrzeć",
      "Partnerzy",
      "Wpływ",
    ]);
    expect(sections.map((s) => s.fields.length)).toEqual([3, 2, 3, 2, 3, 2, 2, 3, 1, 1]);
    expect(sectionOf("gotowosc")?.label).toBe("Rozwiązanie");
  });
});

describe("answerSchema", () => {
  it("accepts only listed options for single choice", () => {
    expect(valid("intensywnosc", { choice: "Mocno przeszkadza" })).toBe(true);
    expect(valid("intensywnosc", { choice: "Wymyślona odpowiedź" })).toBe(false);
    expect(valid("intensywnosc", { choices: ["Mocno przeszkadza"] })).toBe(false);
  });

  it("requires text with a choice-plus-text answer", () => {
    expect(valid("glowny-dochod", { choice: "Mamy pomysł", text: "Dotacja gminy" })).toBe(true);
    expect(valid("glowny-dochod", { choice: "Mamy pomysł" })).toBe(false);
  });

  it("limits 'pick up to three' to three distinct options", () => {
    const options = field("wartosc-emocjonalna").opcje!;
    expect(valid("wartosc-emocjonalna", { choices: options.slice(0, 3) })).toBe(true);
    expect(valid("wartosc-emocjonalna", { choices: options.slice(0, 4) })).toBe(false);
    expect(valid("koszty-stale", { choices: field("koszty-stale").opcje!.slice(0, 5) })).toBe(true);
    expect(valid("koszty-stale", { choices: ["inne", "inne"] })).toBe(false);
  });

  it("allows 'other' text only when 'inne' is chosen", () => {
    expect(valid("koszty-stale", { choices: ["inne"], other: "ubezpieczenie" })).toBe(true);
    expect(valid("koszty-stale", { choices: ["czynsz / przestrzeń"], other: "x" })).toBe(false);
  });

  it("checks partner axes and statuses", () => {
    const ok = { partners: [{ name: "KGW", axis: "dotarcie", status: "w rozmowach" }] };
    expect(valid("partnerzy", ok)).toBe(true);
    expect(
      valid("partnerzy", { partners: [{ name: "KGW", axis: "zysk", status: "w rozmowach" }] }),
    ).toBe(false);
    expect(
      valid("partnerzy", { partners: [{ name: "", axis: "dotarcie", status: "potencjalny" }] }),
    ).toBe(false);
  });

  it("checks matrix columns and rows", () => {
    expect(valid("wplyw", { cells: { Osoba: "Silny" } })).toBe(true);
    expect(valid("wplyw", { cells: { Gmina: "Silny" } })).toBe(false);
    expect(valid("wplyw", { cells: { Osoba: "Ogromny" } })).toBe(false);
  });
});

describe("progress", () => {
  it("counts only real answers", () => {
    expect(isAnswered(undefined)).toBe(false);
    expect(isAnswered({ choices: [] })).toBe(false);
    expect(isAnswered({ items: ["", "  "] })).toBe(false);
    expect(isAnswered({ items: ["sołtys"] })).toBe(true);
    const problem = sections[0].fields;
    expect(answeredCount(problem, { intensywnosc: { choice: "Mocno przeszkadza" } })).toBe(1);
  });

  it("takes the card stage from the readiness answer", () => {
    expect(stageFromAnswers({})).toBeNull();
    expect(stageFromAnswers({ gotowosc: { choice: "Prototyp" } })).toBe("prototyp");
    expect(stageFromAnswers({ gotowosc: { choice: "Gotowe do wdrożenia" } })).toBe("gotowe");
  });
});

describe("card hints", () => {
  it("summarises answers for the card fields they map to", () => {
    const hints = cardHints({
      intensywnosc: { choice: "Mocno przeszkadza" },
      "skala-problemu": { choice: "Wąska grupa (np. jedna szkoła, okolica)" },
      wplyw: { cells: { Osoba: "Silny", Społeczność: "Wyraźny" } },
      "koszty-stale": { choices: ["inne"], other: "ubezpieczenie" }, // not mapped to the card
    });
    expect(hints.opis).toEqual(["Intensywność: Mocno przeszkadza"]);
    expect(hints.dla_kogo).toEqual(["Skala problemu: Wąska grupa (np. jedna szkoła, okolica)"]);
    expect(hints.istota).toEqual(["Wpływ: Osoba: Silny, Społeczność: Wyraźny"]);
  });

  it("describes every answer shape in plain text", () => {
    expect(describeAnswer({ choice: "Mamy pomysł", text: "dotacja" })).toBe(
      "Mamy pomysł (dotacja)",
    );
    expect(describeAnswer({ choices: ["Spokój", "inne"], other: "radość" })).toBe("Spokój, radość");
    expect(
      describeAnswer({ partners: [{ name: "KGW", axis: "dotarcie", status: "potencjalny" }] }),
    ).toBe("KGW");
  });
});
