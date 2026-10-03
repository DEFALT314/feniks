import { describe, expect, it } from "vitest";
import { LibraryFilters } from "@/lib/contracts/knowledge-base";
import { innovationsFromFiles, categoriesFromFiles } from "./from-files";
import { normalize, stem, queryStems, search } from "./search";
import { libraryUrl } from "./url-params";

const catalog = innovationsFromFiles();
const available = { kategorie: categoriesFromFiles(), grupy: [], etykiety: [] };
const filters = (p: Record<string, unknown> = {}) => LibraryFilters.parse(p);

describe("query normalization", () => {
  it("removes Polish diacritics and capital letters", () => {
    expect(normalize("Samotność Seniorów, Łódź!")).toBe("samotnosc seniorow lodz");
  });

  it("joins inflected forms through a shared stem", () => {
    expect(stem("seniorow")).toBe(stem("seniorzy").slice(0, 5));
    expect("seniorzy".startsWith(stem("seniorow"))).toBe(true);
  });

  it("skips short and stop words", () => {
    expect(queryStems("pomoc dla seniorów w domu")).toEqual(queryStems("pomoc seniorów domu"));
    expect(queryStems("pomoc dla seniorów w domu")).toHaveLength(3);
  });
});

describe("search", () => {
  it("without filters returns the whole published catalog, ROPS-checked first", () => {
    const result = search(catalog, filters(), available);
    expect(result.liczba).toBe(158);
    expect(result.wyniki).toHaveLength(20);
    expect(result.wyniki[0].sprawdzona_przez_rops).toBe(true);
    expect(result.liczba_stron).toBe(8);
  });

  it("records with an incomplete description are at the end of the list", () => {
    const result = search(catalog, filters(), available, 1000);
    const last = result.wyniki[result.wyniki.length - 1];
    expect(last.opis_niepelny).toBe(true);
  });

  it("finds BaWita by a keyword in a different inflected form", () => {
    const result = search(catalog, filters({ q: "tablica manipulacyjna" }), available);
    expect(result.wyniki[0].id).toBe("bawita");
  });

  it("the name weighs more than the description", () => {
    const result = search(catalog, filters({ q: "Merkury" }), available);
    expect(result.wyniki[0].nazwa).toContain("Merkury");
  });

  it("filters by several categories at once", () => {
    const result = search(
      catalog,
      filters({ category: ["dla-seniorow", "dla-rynku-pracy"] }),
      available,
      1000,
    );
    expect(new Set(result.wyniki.map((i) => i.kategoria_id))).toEqual(
      new Set(["dla-seniorow", "dla-rynku-pracy"]),
    );
  });

  it("verified=1 leaves the 27 innovations selected for dissemination", () => {
    expect(search(catalog, filters({ verified: "1" }), available).liczba).toBe(27);
  });

  it("the category count ignores the selected category but respects the other filters", () => {
    const result = search(catalog, filters({ category: "dla-seniorow", video: "1" }), available);
    const withFilm = catalog.filter((i) => i.ma_film);
    expect(result.liczniki.kategorie["dla-rynku-pracy"] ?? 0).toBe(
      withFilm.filter((i) => i.kategoria_id === "dla-rynku-pracy").length,
    );
    expect(result.liczba).toBe(withFilm.filter((i) => i.kategoria_id === "dla-seniorow").length);
  });

  it("a page out of range gives the last page", () => {
    const result = search(catalog, filters({ page: "99" }), available);
    expect(result.strona).toBe(result.liczba_stron);
  });

  it("no match gives an empty list", () => {
    expect(search(catalog, filters({ q: "qqqzzzxxx" }), available).liczba).toBe(0);
  });
});

describe("filters from the page URL", () => {
  it("verified=false does not enable the filter", () => {
    expect(filters({ verified: "false" }).verified).toBe(false);
  });

  it("an invalid page falls back to 1", () => {
    expect(filters({ page: "abc" }).page).toBe(1);
  });

  it("the URL keeps filters and changes the page", () => {
    const f = filters({ q: "seniorzy", category: ["a", "b"], video: "1" });
    expect(libraryUrl(f, { page: 2 })).toBe(
      "/library?q=seniorzy&category=a&category=b&video=1&page=2",
    );
    expect(libraryUrl(filters())).toBe("/library");
  });
});
