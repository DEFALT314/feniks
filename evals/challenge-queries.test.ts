// Guards the challenge eval set: every expected id exists on the Challenges Map and in the right area.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import map from "@/data/rops/mapa_wyzwan.json";

const cases: { query: string; area: string; challenges: string[] }[] = readFileSync(
  join(__dirname, "challenge_queries.jsonl"),
  "utf8",
)
  .trim()
  .split("\n")
  .map((line) => JSON.parse(line));
const areaOf = new Map(
  map.obszary.flatMap((o) => o.kluczowe_wyzwania.map((w) => [w.id, o.id] as const)),
);

describe("evals/challenge_queries.jsonl", () => {
  it("names only existing challenges, the first one from the expected area", () => {
    for (const c of cases) {
      expect(c.challenges.length, c.query).toBeGreaterThan(0);
      for (const id of c.challenges) expect(areaOf.has(id), `${id} in "${c.query}"`).toBe(true);
      expect(areaOf.get(c.challenges[0]), c.query).toBe(c.area);
    }
  });

  it("covers every challenge of the map at least once", () => {
    const covered = new Set(cases.flatMap((c) => c.challenges));
    const missing = [...areaOf.keys()].filter((id) => !covered.has(id));
    expect(missing).toEqual([]);
  });
});
