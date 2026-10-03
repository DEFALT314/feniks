import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import library from "@/data/rops/biblioteka.json";
import { GLOSSARY, GUIDES } from "./guides";

const ROOT = join(__dirname, "..", "..", "..");
const ids = new Set(library.innowacje.map((i) => i.id));

// /library/bawita → app/library/[id]/page.tsx exists and "bawita" is a real innovation
function routeExists(href: string): boolean {
  const path = href.split("?")[0];
  const [, first, second] = path.split("/");
  if (first === "library" && second) {
    return ids.has(second) && existsSync(join(ROOT, "app", "library", "[id]", "page.tsx"));
  }
  return existsSync(join(ROOT, "app", ...path.split("/").filter(Boolean), "page.tsx"));
}

describe("educational guides", () => {
  it("every guide has a plain intro, steps and something to do next", () => {
    expect(GUIDES.length).toBeGreaterThanOrEqual(4);
    for (const g of GUIDES) {
      expect(g.intro.length).toBeGreaterThan(40);
      expect(g.steps.length).toBeGreaterThanOrEqual(3);
      expect(g.links.length).toBeGreaterThanOrEqual(1);
    }
    expect(new Set(GUIDES.map((g) => g.id)).size).toBe(GUIDES.length);
  });

  it("every link leads to an existing page of the app", () => {
    for (const link of GUIDES.flatMap((g) => g.links)) {
      expect(routeExists(link.href), link.href).toBe(true);
    }
  });

  it("uses plain Polish: no English words in the texts", () => {
    const text = JSON.stringify([GUIDES, GLOSSARY]).toLowerCase();
    for (const word of ["matchmaking", "dashboard", "feedback", "workflow", "case study"]) {
      expect(text).not.toContain(word);
    }
  });
});
