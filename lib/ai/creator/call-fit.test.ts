import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { innovationsFromFiles } from "@/app/library/_lib/from-files";
import type { CallSummary } from "@/lib/contracts/ai";
import type { MatchDeps } from "../matching/pipeline";
import { ideaAreas, rankCalls } from "./call-fit";

const areas = [
  { id: "seniorzy", nazwa: "Seniorzy", kategorie_biblioteki: ["dla-seniorow"], wyzwania: [] },
  {
    id: "niepelnosprawnosc",
    nazwa: "Niepełnosprawność",
    kategorie_biblioteki: ["dla-osob-o-ograniczonej-mobilnosci"],
    wyzwania: [],
  },
];
const deps: MatchDeps = {
  innovations: innovationsFromFiles(),
  areas,
  embedQuery: async () => null,
  vectorSearch: async () => [],
};
const call = (id: string, a?: string[]): CallSummary => ({
  id,
  name: id,
  organizer: "ROPS",
  goal: "",
  deadline: null,
  demo: true,
  areas: a,
});

describe("ideaAreas", () => {
  it("finds the area from the innovations the search finds for the card", async () => {
    const found = await ideaAreas(
      "Seniorzy boją się korzystać z bankomatu i płacić kartą w sklepie.",
      deps,
    );
    expect(found[0]).toEqual({ id: "seniorzy", name: "Seniorzy" });
  });

  it("puts the area the idea already has first and ignores a too short card", async () => {
    expect(await ideaAreas("krótko", deps, "niepelnosprawnosc")).toEqual([
      { id: "niepelnosprawnosc", name: "Niepełnosprawność" },
    ]);
  });
});

describe("rankCalls", () => {
  const calls = [
    call("inny", ["niepelnosprawnosc"]),
    call("dowolny", []),
    call("pasuje", ["seniorzy"]),
  ];

  it("puts fitting calls first, then calls for any area, then the rest", () => {
    expect(
      rankCalls(calls, [{ id: "seniorzy", name: "Seniorzy" }]).map((c) => [c.id, c.fit]),
    ).toEqual([
      ["pasuje", "pasuje"],
      ["dowolny", "dowolny"],
      ["inny", "inny"],
    ]);
  });

  it("without a known area marks nothing as fitting or not", () => {
    expect(rankCalls(calls, []).map((c) => c.fit)).toEqual(["dowolny", "dowolny", "dowolny"]);
  });
});
