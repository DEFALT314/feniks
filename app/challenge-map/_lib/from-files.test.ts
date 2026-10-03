import { describe, expect, it } from "vitest";
import { ChallengeArea, Challenge, Persona } from "@/lib/contracts/knowledge-base";
import { categoriesFromFiles } from "@/app/library/_lib/from-files";
import { challengeAreasFromFiles } from "./from-files";

const areas = challengeAreasFromFiles();

describe("Challenges Map from files", () => {
  it("has 8 areas in map order, 48 challenges and 9 fictional personas", () => {
    expect(areas.map((a) => a.nr)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(areas.flatMap((a) => a.wyzwania)).toHaveLength(48);
    expect(areas.flatMap((a) => a.persony)).toHaveLength(9);
  });

  it("everything passes the contract and challenge ids are unique across the map", () => {
    for (const a of areas) {
      expect(ChallengeArea.safeParse(a).success).toBe(true);
      expect(Challenge.array().safeParse(a.wyzwania).success).toBe(true);
      expect(Persona.array().safeParse(a.persony).success).toBe(true);
    }
    const ids = areas.flatMap((a) => a.wyzwania.map((w) => w.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("an area with two personas gets numbered ids, like the seed", () => {
    const mental = areas.find((a) => a.id === "zdrowie-psychiczne")!;
    expect(mental.persony.map((p) => p.id)).toEqual([
      "persona-zdrowie-psychiczne-1",
      "persona-zdrowie-psychiczne-2",
    ]);
    expect(areas.find((a) => a.id === "seniorzy")!.persony[0].id).toBe("persona-seniorzy");
  });

  it("links only to existing Library categories", () => {
    const known = new Set(categoriesFromFiles().map((c) => c.id));
    for (const a of areas) {
      expect(a.kategorie_biblioteki.length).toBeGreaterThan(0);
      expect(a.kategorie_biblioteki.every((k) => known.has(k))).toBe(true);
    }
  });
});
