import { describe, expect, it } from "vitest";
import { detectCrisis } from "./crisis";

describe("detectCrisis", () => {
  it.each([
    "przemoc w rodzinie sasiad bije zone",
    "Mąż mnie bił i grozi mi, boję się wrócić do domu",
    "Ojciec znęca się nad dziećmi",
  ])("recognises violence: %s", (text) => {
    expect(detectCrisis(text)).toBe("violence");
  });

  it.each([
    "Syn mówi, że nie chce żyć i myśli o samobójstwie",
    "kolega chce sie zabic po stracie pracy",
    "nastolatka probowala odebrac sobie zycie",
  ])("recognises thoughts of suicide: %s", (text) => {
    expect(detectCrisis(text)).toBe("suicide");
  });

  it.each([
    "mama ma alzheimera i nie wiem co robic",
    "samotni seniorzy na wsi",
    "brak transportu do lekarza",
    "Biblioteka w gminie nie ma podjazdu dla wózków",
  ])("stays quiet for everyday problems: %s", (text) => {
    expect(detectCrisis(text)).toBeNull();
  });
});
