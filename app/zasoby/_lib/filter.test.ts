import { describe, expect, it } from "vitest";
import { ResourceFilters, Resource } from "@/lib/contracts/knowledge-base";
import { availableValues, filterResources } from "./filter";
import { resourcesFromFiles } from "./from-files";

const resources = resourcesFromFiles();
const f = (p: Record<string, unknown> = {}) => ResourceFilters.parse(p);

describe("Resources", () => {
  it("files give 51 reports and 6 publications matching the contract", () => {
    expect(resources.filter((r) => r.typ === "raport")).toHaveLength(51);
    expect(resources.filter((r) => r.typ === "publikacja")).toHaveLength(6);
    expect(Resource.array().safeParse(resources).success).toBe(true);
  });

  it("without filters the newest are on top", () => {
    const list = filterResources(resources, f());
    expect(list).toHaveLength(57);
    expect(list[0].rok).toBe(Math.max(...resources.map((r) => r.rok ?? 0)));
  });

  it("filters by type, year and tag at once", () => {
    const list = filterResources(resources, f({ typ: "raport", tag: "seniorzy" }));
    expect(list.length).toBeGreaterThan(0);
    expect(list.every((r) => r.typ === "raport" && r.tagi.includes("seniorzy"))).toBe(true);
    const year = list[0].rok!;
    expect(filterResources(resources, f({ rok: String(year) })).every((r) => r.rok === year)).toBe(
      true,
    );
  });

  it("years descending, tags without duplicates", () => {
    const { years, tags } = availableValues(resources);
    expect([...years].sort((a, b) => b - a)).toEqual(years);
    expect(new Set(tags).size).toBe(tags.length);
  });
});
