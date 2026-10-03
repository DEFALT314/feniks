import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { innovationsFromFiles } from "@/app/library/_lib/from-files";
import { buildIndex, informativeStems, search } from "./bm25";
import { coveredProbability } from "./coverage";
import { fuse, normalize } from "./fusion";
import { highlight } from "./highlight";
import { stemsMatch, tokenize } from "./text";

const catalog = innovationsFromFiles().filter((i) => i.do_matchmakingu && i.opublikowana);
const index = buildIndex(catalog);
const gold: { zapytanie: string; oczekiwane_id: string }[] = readFileSync(
  "data/rops/gold_matchmaking.jsonl",
  "utf8",
)
  .trim()
  .split("\n")
  .map((l) => JSON.parse(l));

describe("text", () => {
  it("strips diacritics and stopwords and cuts stems", () => {
    expect(tokenize("Babcia ma problem z pamięcią").map((t) => t.stem)).toEqual(["babci", "pamie"]);
  });

  it("keeps positions of the original words", () => {
    const [t] = tokenize("  Udar");
    expect(t).toMatchObject({ word: "Udar", start: 2, end: 6 });
  });

  it("matches short stems by prefix", () => {
    expect(stemsMatch("udar", "udarz")).toBe(true);
    expect(stemsMatch("dom", "domow")).toBe(false); // too short to be a safe prefix
  });
});

describe("BM25", () => {
  it("catalog has the 124 matchmaking innovations", () => {
    expect(catalog).toHaveLength(124);
  });

  it("ignores generic words that appear in many descriptions", () => {
    expect([...informativeStems(index, "pomoc osoba ze stresem").keys()]).toEqual(["stres"]);
  });

  it("finds an innovation by an inflected keyword", () => {
    expect(search(index, "seniorzy nie umieją obsłużyć bankomatu")[0].id).toBe("merkury");
  });

  // Guards the port from the evaluated Python prototype (BM25 alone there: 93% top 3).
  it("keywords alone put the expected innovation in the top 3 for at least 88% of ROPS queries", () => {
    const hits = gold.filter((g) =>
      search(index, g.zapytanie, 3).some((h) => h.id === g.oczekiwane_id),
    ).length;
    expect(hits / gold.length).toBeGreaterThanOrEqual(0.88);
  });
});

describe("fusion", () => {
  it("normalizes to 0–1", () => {
    expect([
      ...normalize(
        new Map([
          ["a", 2],
          ["b", 4],
        ]),
      ).values(),
    ]).toEqual([0, 1]);
  });

  it("a clear semantic winner beats an item that only shares a word", () => {
    const lexical = [{ id: "word-only", score: 5, matchedStems: new Set(["stres"]) }];
    const similarities = new Map([
      ["meaning", 0.92],
      ["word-only", 0.84],
      ["other", 0.83],
    ]);
    expect(fuse(similarities, lexical)[0].id).toBe("meaning");
  });

  it("uses keywords only when there is no query vector", () => {
    const lexical = [{ id: "a", score: 1, matchedStems: new Set<string>() }];
    expect(fuse(new Map(), lexical)).toEqual([
      { id: "a", score: 1, similarity: null, bm25: lexical[0] },
    ]);
  });
});

describe("coverage", () => {
  it("one standing-out innovation means covered, a flat list means a gap", () => {
    const peaked = [0.93, 0.86, 0.85, 0.85, 0.84, 0.84, 0.84, 0.83, 0.83, 0.83];
    const flat = [0.85, 0.849, 0.848, 0.847, 0.846, 0.845, 0.844, 0.843, 0.842, 0.841];
    expect(coveredProbability(peaked, 12)!).toBeGreaterThan(0.5);
    expect(coveredProbability(flat, 0)!).toBeLessThan(0.5);
  });

  it("has no opinion without vectors", () => {
    expect(coveredProbability([], 3)).toBeNull();
  });
});

describe("highlight", () => {
  it("marks matching words and joins neighbours", () => {
    expect(highlight("Brakuje opieki i sprzętu w domu.", ["opiek", "sprze", "domu"])).toEqual([
      { text: "Brakuje ", highlight: false },
      { text: "opieki", highlight: true },
      { text: " i ", highlight: false },
      { text: "sprzętu w domu", highlight: true },
      { text: ".", highlight: false },
    ]);
  });

  it("segments always rebuild the text", () => {
    const text = "Tata wraca ze szpitala po udarze, mieszka sam na wsi.";
    expect(
      highlight(text, ["szpit", "udar"])
        .map((s) => s.text)
        .join(""),
    ).toBe(text);
  });

  it("returns the whole text when nothing matches", () => {
    expect(highlight("abc", [])).toEqual([{ text: "abc", highlight: false }]);
  });
});
