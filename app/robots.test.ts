import { describe, expect, it } from "vitest";
import robots from "./robots";

describe("robots", () => {
  it("keeps every crawler off every page", () => {
    expect(robots().rules).toEqual({ userAgent: "*", disallow: "/" });
  });

  it("lists no sitemap, so crawlers get no catalog of pages to walk", () => {
    expect(robots().sitemap).toBeUndefined();
  });
});
