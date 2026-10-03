import { describe, expect, it } from "vitest";
import { NUMBER_PLACEHOLDER, removeInventedNumbers } from "./guards";

describe("removeInventedNumbers", () => {
  it("replaces numbers that are not in the user's text", () => {
    expect(removeInventedNumbers("Wsparcie dla 40 seniorów.", "seniorzy")).toEqual({
      text: `Wsparcie dla ${NUMBER_PLACEHOLDER} seniorów.`,
      replaced: true,
    });
  });

  it("keeps numbers the user wrote", () => {
    expect(
      removeInventedNumbers("Spotkania 2 razy w tygodniu.", "2 razy w tygodniu").replaced,
    ).toBe(false);
  });

  // Production draft read "[liczba do uzupełnienia]. Rekrutacja wolontariuszy…"
  it("keeps list markers at the start of a line or sentence", () => {
    const text = "1. Rekrutacja wolontariuszy. 2. Odwiedziny seniorów.\n3) Zakupy.";
    expect(removeInventedNumbers(text, "")).toEqual({ text, replaced: false });
  });

  it("still replaces a number that ends a sentence", () => {
    const out = removeInventedNumbers("Seniorów będzie 40. Potem ocena.", "");
    expect(out.text).toBe(`Seniorów będzie ${NUMBER_PLACEHOLDER}. Potem ocena.`);
  });
});
