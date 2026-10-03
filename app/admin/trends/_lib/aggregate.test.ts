import { describe, expect, it } from "vitest";
import { challengeAreasFromFiles } from "@/app/challenge-map/_lib/from-files";
import { aggregateTrends, chartLabel, parsePeriod, type QueryRow } from "./aggregate";

const areas = challengeAreasFromFiles();
const seniors = areas.find((a) => a.id === "seniorzy")!;
const q = (area_id: string | null, challenge_id: string | null = null, weak = false): QueryRow => ({
  area_id,
  challenge_id,
  match_quality: weak ? "weak" : "strong",
});

describe("needs in the region", () => {
  it("counts queries and ideas per area, busiest first", () => {
    const t = aggregateTrends(
      areas,
      [q("seniorzy"), q("seniorzy", null, true), q("ubostwo")],
      [{ obszar_id: "seniorzy" }, { obszar_id: "bezdomnosc" }],
    );
    expect(t.areas[0]).toMatchObject({ id: "seniorzy", queries: 2, ideas: 1, total: 3, weak: 1 });
    expect(t.areas).toHaveLength(8);
    expect(t.total).toBe(5);
  });

  it("rows without a known area are counted as unassigned, not lost", () => {
    const t = aggregateTrends(areas, [q(null), q("nie-ma-takiego")], [{ obszar_id: null }]);
    expect(t.unassigned).toBe(3);
    expect(t.areas.every((a) => a.total === 0)).toBe(true);
  });

  it("ranks challenges by queries and names them from the Challenges Map", () => {
    const [first, second] = seniors.wyzwania;
    const t = aggregateTrends(
      areas,
      [
        q("seniorzy", second.id),
        q("seniorzy", second.id),
        q("seniorzy", first.id),
        q("seniorzy", "zle-id"),
      ],
      [],
    );
    expect(t.challenges.map((c) => [c.id, c.count])).toEqual([
      [second.id, 2],
      [first.id, 1],
    ]);
    expect(t.challenges[0]).toMatchObject({ text: second.tekst, areaName: "Seniorzy" });
  });

  it("the chart has a text alternative with the same numbers", () => {
    const t = aggregateTrends(areas, [q("seniorzy"), q("seniorzy")], []);
    expect(chartLabel(t.areas)).toBe("Wykres słupkowy: Seniorzy 2.");
    expect(chartLabel(aggregateTrends(areas, [], []).areas)).toMatch(/brak zgłoszeń/);
  });

  it("only 7, 30 or 90 days; anything else falls back to 30", () => {
    expect(parsePeriod("7")).toBe(7);
    expect(parsePeriod("90")).toBe(90);
    expect(parsePeriod("365")).toBe(30);
    expect(parsePeriod(undefined)).toBe(30);
  });
});
