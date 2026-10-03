import { describe, expect, it } from "vitest";
import { Category, Innovation } from "@/lib/contracts/knowledge-base";
import { categoriesFromFiles, innovationsFromFiles } from "./from-files";
import { innovationFromRow } from "./row";
import { libraryUrl } from "./url-params";
import { LibraryFilters } from "@/lib/contracts/knowledge-base";

const fromFiles = innovationsFromFiles();

// A database row is the contract without the derived fields (supabase/seed.sql)
function asRow(i: Innovation) {
  const { opis_niepelny, ma_film, ma_pdf, ...row } = i;
  void opis_niepelny;
  void ma_film;
  void ma_pdf;
  return { ...row, autor_instytucja: "ukryte w UI", program: i.program, kolejnosc: 1 };
}

describe("Library data from files (fallback without the database)", () => {
  it("has the same numbers as the seed: 158 innovations, 124 for matching, 27 verified", () => {
    expect(fromFiles).toHaveLength(158);
    expect(fromFiles.filter((i) => i.do_matchmakingu)).toHaveLength(124);
    expect(fromFiles.filter((i) => i.sprawdzona_przez_rops)).toHaveLength(27);
    expect(new Set(fromFiles.map((i) => i.id)).size).toBe(158);
  });

  it("every record passes the contract and points to a known category", () => {
    const categories = Category.array().parse(categoriesFromFiles());
    const ids = new Set(categories.map((c) => c.id));
    for (const i of fromFiles) {
      expect(Innovation.safeParse(i).success).toBe(true);
      expect(ids.has(i.kategoria_id)).toBe(true);
    }
    expect(categories.at(-1)).toMatchObject({ id: "inne", nazwa: "Inne" });
  });

  it("records outside the Library: only 'pewne' go to matching, the rest are marked incomplete", () => {
    const outside = fromFiles.filter((i) => i.spoza_biblioteki);
    expect(outside).toHaveLength(43);
    expect(outside.filter((i) => i.do_matchmakingu)).toHaveLength(9);
    expect(outside.every((i) => i.opis_niepelny === (i.pewnosc !== "pewne"))).toBe(true);
    expect(outside.every((i) => !i.sprawdzona_przez_rops)).toBe(true);
  });
});

describe("Library data from the database", () => {
  it("a table row gives the same card as the files (derived fields recomputed)", () => {
    for (const i of fromFiles.slice(0, 30)) {
      expect(innovationFromRow(asRow(i))).toEqual(i);
    }
  });

  it("drops columns the contract does not expose, e.g. the author institution", () => {
    const card = innovationFromRow(asRow(fromFiles[0]));
    expect(card).not.toHaveProperty("autor_instytucja");
  });

  it("rejects a broken row instead of showing a half-empty card", () => {
    expect(() => innovationFromRow({ id: "x" })).toThrow();
  });
});

describe("Library address", () => {
  it("keeps filters, repeats categories and skips page 1", () => {
    const f = LibraryFilters.parse({ q: "seniorzy", category: ["a", "b"], video: "1", page: "1" });
    expect(libraryUrl(f)).toBe("/library?q=seniorzy&category=a&category=b&video=1");
    expect(libraryUrl(f, { page: 3 })).toContain("page=3");
  });
});
