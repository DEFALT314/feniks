import { describe, expect, it } from "vitest";
import { describeAudit, formatSentAt } from "./format";
import { parseStatusFilter, STATUS_LABELS } from "./status";

describe("parseStatusFilter", () => {
  it("defaults to the open queue and accepts known statuses", () => {
    expect(parseStatusFilter(undefined)).toBe("open");
    expect(parseStatusFilter("all")).toBe("all");
    expect(parseStatusFilter("do_poprawy")).toBe("do_poprawy");
    expect(parseStatusFilter("hacked")).toBe("open");
  });

  it("has a Polish label for every status", () => {
    expect(STATUS_LABELS.w_weryfikacji).toBe("W weryfikacji");
  });
});

describe("format", () => {
  const now = new Date("2026-10-03T18:00:00Z");

  it("shows today, yesterday or the date", () => {
    expect(formatSentAt("2026-10-03T14:42:00Z", now)).toBe("dziś 16:42");
    expect(formatSentAt("2026-10-02T14:42:00Z", now)).toBe("wczoraj 16:42");
    expect(formatSentAt("2026-09-20T10:00:00Z", now)).toBe("20 września");
  });

  it("describes review entries in the audit log", () => {
    expect(describeAudit("pomysl.ocena", { status: "do_poprawy", tytul: "Kawiarenka" })).toBe(
      "„Kawiarenka”: do poprawy",
    );
  });

  it("never shows raw audit codes to staff", () => {
    expect(describeAudit("innowacja.edycja", {})).toBe("zmieniono kartę innowacji");
    expect(describeAudit("nabor.wlaczenie", null)).toBe("włączono nabór");
    expect(describeAudit("nabor.dodanie", { nazwa: "Wsparcie seniorów" })).toBe(
      "dodano nabór: Wsparcie seniorów",
    );
    expect(describeAudit("profil.rola.zatwierdzona", { z: "mieszkaniec", o: "ngo" })).toBe(
      "zatwierdzono rolę",
    );
    expect(describeAudit("cos.nowego", {})).toBe("inna zmiana");
    // The most common entry: an author sent an idea (title saved since the demo audit)
    expect(describeAudit("pomysl.wyslanie", { tytul: "Wspólne obiady" })).toBe(
      "nowy pomysł: Wspólne obiady",
    );
    expect(describeAudit("pomysl.wyslanie", {})).toBe("nowy pomysł");
  });
});
