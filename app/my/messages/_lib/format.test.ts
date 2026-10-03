import { describe, expect, it } from "vitest";
import { day, historyLine, newMessageHref, recipientOptions, stamp } from "./format";

const now = new Date("2026-10-04T10:00:00Z"); // 12:00 in Warsaw

describe("stamp", () => {
  it("adds the day to the time, so older messages are not just an hour", () => {
    expect(stamp("2026-10-04T07:05:00Z", now)).toBe("dziś, 09:05");
    expect(stamp("2026-10-03T14:42:00Z", now)).toBe("wczoraj, 16:42");
    expect(stamp("2026-09-28T07:12:00Z", now)).toBe("28 września, 09:12");
  });

  it("adds the year for an earlier year", () => {
    expect(day("2025-12-30T10:00:00Z", now)).toBe("30 grudnia 2025");
  });
});

describe("historyLine", () => {
  it("names the day on the first step and when it changes", () => {
    expect(
      historyLine(
        [
          { status: "wyslany", at: "2026-10-03T14:42:00Z" },
          { status: "w_weryfikacji", at: "2026-10-03T14:50:00Z" },
          { status: "do_poprawy", at: "2026-10-04T07:05:00Z" },
        ],
        now,
      ),
    ).toBe("wysłany wczoraj, 16:42 → w weryfikacji 16:50 → do poprawy dziś, 09:05");
  });
});

describe("newMessageHref", () => {
  it("sends prefill links to the new-message form", () => {
    expect(newMessageHref({ innovation: "bawita" })).toBe("/my/messages/new?innovation=bawita");
    expect(newMessageHref({ topic: "Pytanie", text: "Treść" })).toBe(
      "/my/messages/new?topic=Pytanie&text=Tre%C5%9B%C4%87",
    );
  });

  it("keeps the conversation list for a thread or no parameters", () => {
    expect(newMessageHref({})).toBeNull();
    expect(newMessageHref({ thread: "t1", innovation: "bawita" })).toBeNull();
  });
});

describe("recipientOptions", () => {
  it("puts ROPS first and names the role of each contact", () => {
    expect(
      recipientOptions([
        { id: "e1", nazwa: "Ewa", rola: "ekspert" },
        { id: "n1", nazwa: "Fundacja Dobry Start", rola: "ngo" },
        { id: "g1", nazwa: "GOPS", rola: "jst" },
        { id: "x", nazwa: "Stanisław", rola: "mieszkaniec" },
      ]),
    ).toEqual([
      { value: "", label: "Zespół ROPS" },
      { value: "e1", label: "Ewa (ekspert, mentor)" },
      { value: "n1", label: "Fundacja Dobry Start (organizacja)" },
      { value: "g1", label: "GOPS (gmina)" },
    ]);
  });
});
