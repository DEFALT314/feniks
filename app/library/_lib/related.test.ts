import { describe, expect, it } from "vitest";
import { challengeAreasFromFiles } from "@/app/challenge-map/_lib/from-files";
import { innovationsFromFiles } from "./from-files";
import { similarInnovations, challengesForInnovation } from "./related";

const catalog = innovationsFromFiles();
const areas = challengeAreasFromFiles();
const card = (id: string) => catalog.find((i) => i.id === id)!;

describe("related items on the card", () => {
  it("similar innovations exclude the innovation itself and incomplete descriptions", () => {
    for (const i of catalog.slice(0, 40)) {
      const similar = similarInnovations(i, catalog);
      expect(similar.length).toBeLessThanOrEqual(3);
      expect(similar.some((p) => p.id === i.id || p.opis_niepelny)).toBe(false);
    }
  });

  it("Merkury links to the challenge about seniors' digital skills", () => {
    const challenges = challengesForInnovation(card("merkury"), areas);
    expect(challenges[0].area.id).toBe("seniorzy");
    expect(challenges.map((c) => c.challenge.tekst).join(" ")).toMatch(/cyfrow/i);
  });

  it("challenges come only from areas linked to the innovation's category", () => {
    const i = card("bawita");
    for (const { area } of challengesForInnovation(i, areas)) {
      expect(area.kategorie_biblioteki).toContain(i.kategoria_id);
    }
  });

  it("the map from files has 8 areas, 48 challenges and 9 personas", () => {
    expect(areas).toHaveLength(8);
    expect(areas.flatMap((a) => a.wyzwania)).toHaveLength(48);
    expect(areas.flatMap((a) => a.persony)).toHaveLength(9);
  });
});
