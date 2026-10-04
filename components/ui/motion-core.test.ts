import { describe, expect, it } from "vitest";
import {
  countAt,
  entranceDelay,
  hasReached,
  parseCount,
  parseKinds,
  revealDelay,
} from "./motion-core";

describe("parseKinds", () => {
  it("reads every known motion and ignores the rest", () => {
    expect(parseKinds("wejscie  zakresl tok")).toEqual(["wejscie", "zakresl"]);
    expect(parseKinds(null)).toEqual([]);
  });
});

describe("delays", () => {
  it("staggers containers and their children like the mockups", () => {
    expect(entranceDelay(0, 0)).toBe(50);
    expect(entranceDelay(1, 2)).toBe(50 + 120 + 140);
    expect(revealDelay(3)).toBe(180);
  });
});

describe("hasReached", () => {
  it("starts above 88% of the screen, also for elements already scrolled past", () => {
    expect(hasReached(700, 1000)).toBe(true);
    expect(hasReached(-2000, 1000)).toBe(true);
    expect(hasReached(880, 1000)).toBe(false);
    expect(hasReached(1500, 1000)).toBe(false);
  });
});

describe("parseCount", () => {
  it.each([
    ["115", 115],
    ["1 234", 1234],
    ["1 234", 1234],
    [" 9 ", 9],
    ["12%", null],
    ["", null],
    [null, null],
  ])("%s → %s", (text, expected) => {
    expect(parseCount(text)).toBe(expected);
  });
});

describe("countAt", () => {
  it("starts at zero, ends exactly at the target and never goes past it", () => {
    expect(countAt(115, 0)).toBe(0);
    expect(countAt(115, 1)).toBe(115);
    expect(countAt(115, 2)).toBe(115);
    expect(countAt(115, -1)).toBe(0);
  });

  it("eases out: more than half of the way at half of the time", () => {
    expect(countAt(100, 0.5)).toBe(75);
  });
});
