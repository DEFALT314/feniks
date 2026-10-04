import { describe, expect, it } from "vitest";
import type { InnovationSummary } from "@/lib/contracts/knowledge-base";
import { accountItemsFor, navItemsFor } from "@/components/ui/navigation";
import { homeStats, personalTiles, pickFeatured, plural } from "./home";

const innovation = (over: Partial<InnovationSummary> & { id: string }): InnovationSummary => ({
  nazwa: over.id,
  kategoria_id: "dla-seniorow",
  etykieta: null,
  sprawdzona_przez_rops: false,
  opis_krotki: null,
  dla_kogo: [],
  slowa_kluczowe: [],
  spoza_biblioteki: false,
  opis_niepelny: false,
  ma_film: false,
  ma_pdf: false,
  kto_moze_wdrozyc: [],
  ...over,
});

const category = (id: string) => ({ id, nazwa: id, url: `https://example.org/${id}` });

describe("homeStats", () => {
  it("counts only Library innovations, ROPS-checked ones, challenges and used categories", () => {
    const stats = homeStats(
      [
        innovation({ id: "a", sprawdzona_przez_rops: true }),
        innovation({ id: "b", kategoria_id: "rynek-pracy" }),
        innovation({ id: "c", kategoria_id: "inne", spoza_biblioteki: true }),
      ],
      [category("dla-seniorow"), category("rynek-pracy"), category("inne"), category("pusta")],
      [{ wyzwania: [1, 2, 3] }, { wyzwania: [4] }],
    );

    expect(stats).toEqual({
      libraryInnovations: 2,
      checkedByRops: 1,
      challenges: 4,
      categories: 2,
    });
  });
});

describe("pickFeatured", () => {
  const list = [
    innovation({ id: "x", sprawdzona_przez_rops: true }),
    innovation({ id: "y", sprawdzona_przez_rops: true }),
    innovation({ id: "z", sprawdzona_przez_rops: true }),
    innovation({ id: "plain" }),
    innovation({ id: "outside", sprawdzona_przez_rops: true, spoza_biblioteki: true }),
  ];

  it("puts the preferred innovations first, in the given order", () => {
    expect(pickFeatured(list, ["z", "x"]).map((i) => i.id)).toEqual(["z", "x", "y"]);
  });

  it("fills up with other checked innovations when a preferred id is missing", () => {
    expect(pickFeatured(list, ["gone", "y"], 2).map((i) => i.id)).toEqual(["y", "x"]);
  });

  it("never shows unchecked innovations or ones from outside the Library", () => {
    expect(pickFeatured(list, ["plain", "outside"], 5).map((i) => i.id)).toEqual(["x", "y", "z"]);
  });
});

describe("plural", () => {
  const forms = ["innowacja", "innowacje", "innowacji"] as const;

  it.each([
    [1, "innowacja"],
    [3, "innowacje"],
    [22, "innowacje"],
    [5, "innowacji"],
    [12, "innowacji"],
    [115, "innowacji"],
  ])("%i → %s", (n, expected) => {
    expect(plural(n, ...forms)).toBe(expected);
  });
});

describe("personalTiles", () => {
  const tiles = (role: Parameters<typeof navItemsFor>[0]) =>
    personalTiles(navItemsFor(role), accountItemsFor(role)).map((t) => t.href);

  it("is empty for visitors", () => {
    expect(tiles(null)).toEqual([]);
  });

  it("puts the role's main task first and lists every own page once, without the profile", () => {
    expect(tiles("jst")).toEqual(["/my/middleman", "/my/creator", "/my/tester", "/my/messages"]);
    expect(tiles("ekspert")).toEqual(["/my/tester", "/my/creator", "/my/messages"]);
  });

  it("starts with the ROPS panel for ROPS staff", () => {
    expect(tiles("rops_admin")[0]).toBe("/admin");
  });

  it("gives every tile a plain-language explanation", () => {
    for (const t of personalTiles(navItemsFor("ngo"), accountItemsFor("ngo")))
      expect(t.text.length).toBeGreaterThan(20);
  });
});
