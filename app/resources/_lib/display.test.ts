import { describe, expect, it } from "vitest";
import {
  formatItemCount,
  resourceDescription,
  resourceLang,
  resourceLinkLabel,
  resourcesTitle,
  tagLabel,
} from "./display";
import { resourcesFromFiles } from "./from-files";

const resources = resourcesFromFiles();

describe("formatItemCount", () => {
  it("uses Polish plural forms", () => {
    expect(formatItemCount(1)).toBe("1 pozycja");
    expect(formatItemCount(2)).toBe("2 pozycje");
    expect(formatItemCount(57)).toBe("57 pozycji");
  });
});

describe("resourceLang", () => {
  it("marks English titles and leaves Polish ones", () => {
    expect(resourceLang({ tytul: "Guide to social innovations (EN)" })).toBe("en");
    expect(resourceLang({ tytul: "Social Innovation Canvas (INNO AGH)" })).toBe("en");
    expect(resourceLang({ tytul: "Przewodnik po innowacjach społecznych" })).toBeUndefined();
  });

  it("finds only the two English publications in the ROPS data", () => {
    expect(resources.filter((r) => resourceLang(r)).map((r) => r.id)).toEqual(["p04", "p05"]);
  });
});

describe("resourceDescription", () => {
  it("hides internal file names", () => {
    expect(
      resourceDescription("Kanwa innowacji społecznej, 3 arkusze – patrz canvas_innowacji.json."),
    ).toBe("Kanwa innowacji społecznej, 3 arkusze.");
    expect(resourceDescription("Angielska wersja przewodnika.")).toBe(
      "Angielska wersja przewodnika.",
    );
    expect(resourceDescription(null)).toBeNull();
  });

  it("leaves no .json in any description from the data", () => {
    for (const r of resources) expect(resourceDescription(r.opis) ?? "").not.toMatch(/\.json/);
  });
});

describe("resourceLinkLabel", () => {
  it("gives every link in the list a different text", () => {
    const labels = resources.map((r) => resourceLinkLabel(r, resources));
    expect(new Set(labels).size).toBe(resources.length);
  });

  it("adds the year only to repeated titles", () => {
    const unique = resources.find((r) => r.id === "p01")!;
    expect(resourceLinkLabel(unique, resources)).toBe(unique.tytul);
  });
});

describe("resourcesTitle", () => {
  it("reflects the filters", () => {
    expect(resourcesTitle({}, 57)).toBe("Wiedza o innowacjach – HubMI.pl");
    expect(resourcesTitle({ type: "raport", year: 2019, tag: "NGO" }, 2)).toBe(
      "Raporty z badań, 2019, organizacje pozarządowe: 2 pozycje – Wiedza o innowacjach – HubMI.pl",
    );
  });
});

describe("tagLabel", () => {
  it("spells out abbreviations", () => {
    expect(tagLabel("osoby opuszczające ZK")).toBe("osoby opuszczające zakład karny");
    expect(tagLabel("seniorzy")).toBe("seniorzy");
  });
});
