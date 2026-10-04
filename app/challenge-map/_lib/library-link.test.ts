import { describe, expect, it } from "vitest";
import { categoriesFromFiles, innovationsFromFiles } from "@/app/library/_lib/from-files";
import { challengeLibraryLink } from "./library-link";

const catalog = innovationsFromFiles();
const available = { kategorie: categoriesFromFiles(), grupy: [], etykiety: [] };
const seniors = { kategorie_biblioteki: ["dla-seniorow"] };

describe("challengeLibraryLink", () => {
  it("searches by the challenge words inside the area's categories", () => {
    const link = challengeLibraryLink(seniors, "Kompetencje cyfrowe seniorów", catalog, available);
    expect(link.wholeArea).toBe(false);
    expect(link.count).toBeGreaterThan(0);
    expect(link.href).toContain("q=Kompetencje");
    expect(link.href).toContain("category=dla-seniorow");
  });

  it("falls back to the whole area when the words find nothing, never an empty list", () => {
    const link = challengeLibraryLink(seniors, "Zzyzx qwerty", catalog, available);
    expect(link.wholeArea).toBe(true);
    expect(link.href).toBe("/library?category=dla-seniorow");
    expect(link.count).toBeGreaterThan(0);
  });
});
