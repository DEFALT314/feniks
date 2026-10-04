import { describe, expect, it } from "vitest";
import { canvasFacts, ruleChecks } from "./canvas-facts";

const idea = {
  title: "Sąsiedzki dyżur",
  description: "Wolontariusze odwiedzają seniorów po wypisie ze szpitala: zakupy, leki, rozmowa.",
};

describe("canvas facts and rule checks", () => {
  it("turns answered canvas questions into plain lines", () => {
    const facts = canvasFacts({ intensywnosc: { choice: "Bardzo poważny problem" } });
    expect(facts).toEqual([
      expect.objectContaining({ step: "intensywnosc", answer: "Bardzo poważny problem" }),
    ]);
  });

  it("points to missing fields and risky answers, each with its canvas source, missing first", () => {
    const checks = ruleChecks(idea, {
      "glowny-dochod": { choice: "Nie wiemy jeszcze", text: "" },
      "klient-platnik": { choices: ["grantodawca"] },
      "wartosc-vs-koszt": { choice: "Koszt większy niż korzyść" },
      intensywnosc: { choice: "Bardzo poważny problem" },
      "glowny-uzytkownik": { choices: ["seniorzy"] },
    });
    const ids = checks.map((c) => c.id);
    expect(ids).toEqual(
      expect.arrayContaining(["pusty-dla-kogo", "kto-zaplaci", "koszt-wiekszy", "mocny-problem"]),
    );
    expect(checks.at(-1)?.kind).toBe("mocna_strona");
    const pay = checks.find((c) => c.id === "kto-zaplaci")!;
    expect(pay.source).toMatchObject({
      kind: "kanwa",
      step: "glowny-dochod",
      answer: "Nie wiemy jeszcze (no text)".replace(" (no text)", ""),
    });
    expect(checks.find((c) => c.id === "pusty-dla-kogo")?.suggestion).toBe("Seniorzy.");
    expect(checks.every((c) => !c.ai)).toBe(true);
  });

  it("praises confirmed value and stays quiet about a complete card", () => {
    const checks = ruleChecks(
      { ...idea, essence: "Nikt nie zostaje sam po szpitalu.", audience: "Samotni seniorzy." },
      { "wartosc-vs-koszt": { choice: "Bardzo duża wartość przy małym koszcie" } },
    );
    expect(checks.map((c) => c.id)).toEqual(["tanie-i-skuteczne"]);
  });

  it("quotes the clarity answer as chosen, in a grammatical sentence", () => {
    const [check] = ruleChecks(
      { ...idea, essence: "Nikt nie zostaje sam.", audience: "Seniorzy." },
      { prostota: { choice: "Niejasne" } },
    );
    expect(check.id).toBe("niejasne");
    expect(check.detail).toContain("odpowiadasz w kanwie: „Niejasne”.");
    expect(check.detail).not.toContain("jest dla nowej osoby niejasne");
  });
});
