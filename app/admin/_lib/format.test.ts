import { describe, expect, it } from "vitest";
import { describeAudit, filterSummary, formatSentAt, plural } from "./format";

describe("plural", () => {
  it("picks the Polish form for the count", () => {
    const p = (n: number) => plural(n, "pomysł", "pomysły", "pomysłów");
    expect([0, 1, 2, 4, 5, 12, 14, 22, 25].map(p)).toEqual([
      "pomysłów",
      "pomysł",
      "pomysły",
      "pomysły",
      "pomysłów",
      "pomysłów",
      "pomysłów",
      "pomysły",
      "pomysłów",
    ]);
  });
});

describe("filterSummary", () => {
  it("names the filter and the number of ideas", () => {
    expect(filterSummary("Do poprawy", 3)).toBe("Do poprawy: 3 pomysły");
    expect(filterSummary("Wszystkie", 1)).toBe("Wszystkie: 1 pomysł");
  });
});

describe("formatSentAt", () => {
  const now = new Date("2026-10-04T12:00:00Z");
  it("gives the day for older entries, so the audit log is not just an hour", () => {
    expect(formatSentAt("2026-10-04T08:05:00Z", now)).toBe("dziś 10:05");
    expect(formatSentAt("2026-10-03T08:05:00Z", now)).toBe("wczoraj 10:05");
    expect(formatSentAt("2026-09-28T08:05:00Z", now)).toBe("28 września");
  });
});

describe("describeAudit", () => {
  it("names good-practice changes in plain words with the idea title (#104)", () => {
    const d = { tytul: "Herbatka sąsiedzka" };
    expect(describeAudit("pomysl.publikacja", d)).toBe(
      "pokazano jako dobrą praktykę: Herbatka sąsiedzka",
    );
    expect(describeAudit("pomysl.publikacja_wycofana", d)).toBe(
      "przestano pokazywać jako dobrą praktykę: Herbatka sąsiedzka",
    );
    expect(describeAudit("pomysl.zgoda_publikacji", d)).toBe(
      "zgoda na pokazanie pomysłu: Herbatka sąsiedzka",
    );
    expect(describeAudit("pomysl.zgoda_wycofana", d)).toBe(
      "wycofano zgodę na pokazanie: Herbatka sąsiedzka",
    );
  });
});
