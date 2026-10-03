import { describe, expect, it } from "vitest";
import { LibraryFilters } from "@/lib/contracts/knowledge-base";
import { askRopsUrl, filterSummary, formatResultCount, libraryTitle } from "./format";

const categories = [
  { id: "dla-seniorow", nazwa: "Dla seniorów", url: null },
  { id: "dla-dzieci", nazwa: "Dla dzieci", url: null },
];
const f = (p: Record<string, unknown> = {}) => LibraryFilters.parse(p);

describe("formatResultCount", () => {
  it("uses Polish plural forms", () => {
    expect(formatResultCount(1)).toBe("1 innowacja");
    expect(formatResultCount(3)).toBe("3 innowacje");
    expect(formatResultCount(12)).toBe("12 innowacji");
    expect(formatResultCount(22)).toBe("22 innowacje");
    expect(formatResultCount(0)).toBe("0 innowacji");
  });
});

describe("filterSummary", () => {
  it("is empty without filters", () => {
    expect(filterSummary(f(), categories)).toBe("");
  });

  it("names categories, the search and the extra filters", () => {
    expect(
      filterSummary(f({ category: "dla-seniorow", q: "pamięć", video: "1" }), categories),
    ).toBe("Dla seniorów · „pamięć” · z filmem");
  });
});

describe("libraryTitle", () => {
  it("stays the plain title for the whole catalog", () => {
    expect(libraryTitle({ summary: "", count: 158, page: 1 })).toBe(
      "Biblioteka innowacji – HubMI.pl",
    );
  });

  it("reflects the search, a zero result and the page", () => {
    expect(libraryTitle({ summary: "„zzz”", count: 0, page: 1 })).toBe(
      "„zzz”: 0 innowacji – Biblioteka innowacji – HubMI.pl",
    );
    expect(libraryTitle({ summary: "Dla seniorów", count: 30, page: 2 })).toBe(
      "Dla seniorów: 30 innowacji – strona 2 – Biblioteka innowacji – HubMI.pl",
    );
  });
});

describe("askRopsUrl", () => {
  it("opens a new message about the innovation", () => {
    const url = new URL(askRopsUrl("bawita", "BaWita"), "http://x");
    expect(url.pathname).toBe("/my/messages/new");
    expect(url.searchParams.get("innovation")).toBe("bawita");
    expect(url.searchParams.get("topic")).toBe("Pytanie o innowację: BaWita");
  });
});
