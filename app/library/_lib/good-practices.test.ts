import { describe, expect, it, vi } from "vitest";
import {
  askAboutPracticeUrl,
  practiceCountLabel,
  practicesTitle,
  publishedOn,
  ratingSummary,
  stageLabel,
} from "./good-practices-format";
import fixtures from "@/lib/contracts/fixtures/idea-creator.json";
import { getGoodPractice, getGoodPractices } from "./good-practices";

vi.mock("server-only", () => ({}));

describe("stageLabel", () => {
  it("says in plain words how far the idea got", () => {
    expect(stageLabel("pomysl")).toBe("Na etapie pomysłu");
    expect(stageLabel("prototyp")).toBe("Prototyp");
    expect(stageLabel("przetestowane")).toBe("Przetestowane w małej skali");
    expect(stageLabel("gotowe")).toBe("Gotowe do wdrożenia");
    expect(stageLabel(null)).toBeNull();
  });
});

describe("ratingSummary", () => {
  it("is empty before any resident rated it", () => {
    expect(ratingSummary(0, null)).toBeNull();
  });

  it("gives only the count while there are fewer than three ratings", () => {
    expect(ratingSummary(1, null)).toBe("1 ocena mieszkańców");
    expect(ratingSummary(2, null)).toBe("2 oceny mieszkańców");
  });

  it("adds the average with a Polish decimal comma", () => {
    expect(ratingSummary(9, 4.6)).toBe("9 ocen mieszkańców, średnio 4,6 na 5");
    expect(ratingSummary(22, 4)).toBe("22 oceny mieszkańców, średnio 4,0 na 5");
    expect(ratingSummary(12, 3.5)).toBe("12 ocen mieszkańców, średnio 3,5 na 5");
  });
});

describe("practiceCountLabel", () => {
  it("uses the Polish plural", () => {
    expect(practiceCountLabel(1)).toBe("1 dobra praktyka");
    expect(practiceCountLabel(3)).toBe("3 dobre praktyki");
    expect(practiceCountLabel(5)).toBe("5 dobrych praktyk");
    expect(practiceCountLabel(14)).toBe("14 dobrych praktyk");
    expect(practiceCountLabel(24)).toBe("24 dobre praktyki");
  });
});

describe("publishedOn", () => {
  it("gives the day in Polish, in the Warsaw time zone", () => {
    expect(publishedOn("2026-10-04T09:30:00+02:00")).toBe("4 października 2026");
    // 23:30 UTC is already the next day in Poland
    expect(publishedOn("2026-10-04T23:30:00Z")).toBe("5 października 2026");
  });
});

describe("practicesTitle", () => {
  it("names the section and the site", () => {
    expect(practicesTitle()).toBe("Dobre praktyki mieszkańców – Biblioteka innowacji – HubMI.pl");
    expect(practicesTitle("Herbatka sąsiedzka")).toBe(
      "Herbatka sąsiedzka – Dobre praktyki mieszkańców – HubMI.pl",
    );
  });
});

describe("askAboutPracticeUrl", () => {
  it("opens a new message to ROPS with the topic filled in, without linking the author's idea", () => {
    const url = askAboutPracticeUrl("Herbatka sąsiedzka");
    expect(url.startsWith("/my/messages/new?")).toBe(true);
    const params = new URLSearchParams(url.split("?")[1]);
    expect(params.get("topic")).toBe("Pytanie o dobrą praktykę: Herbatka sąsiedzka");
    // ?idea= would open the author's own conversation with ROPS
    expect(params.has("idea")).toBe(false);
  });
});

describe("good practice loader", () => {
  function fakeDb(result: { data: unknown[] | null; error: { message: string } | null }) {
    const rpc = vi.fn(async () => result);
    return { db: { rpc } as never, rpc };
  }

  it("returns the published practices from the public function", async () => {
    const { db, rpc } = fakeDb({ data: fixtures.good_practices, error: null });
    const list = await getGoodPractices(db);
    expect(rpc).toHaveBeenCalledWith("dobre_praktyki", {});
    expect(list.map((p) => p.tytul)).toEqual([
      "Herbatka sąsiedzka na klatce schodowej",
      "Wspólne odrabianie lekcji w świetlicy wiejskiej",
    ]);
  });

  it("skips a row that does not fit the contract instead of breaking the page", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { db } = fakeDb({
      data: [{ ...fixtures.good_practices[0], etap: "nieznany" }, fixtures.good_practices[1]],
      error: null,
    });
    expect((await getGoodPractices(db)).length).toBe(1);
  });

  it("shows an empty list when the database fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { db } = fakeDb({ data: null, error: { message: "down" } });
    expect(await getGoodPractices(db)).toEqual([]);
  });

  it("finds one practice by id and does not ask the database for a malformed id", async () => {
    const { db, rpc } = fakeDb({ data: [fixtures.good_practices[0]], error: null });
    expect((await getGoodPractice(db, fixtures.good_practices[0].id))?.tytul).toBe(
      "Herbatka sąsiedzka na klatce schodowej",
    );
    expect(rpc).toHaveBeenCalledWith("dobre_praktyki", { p_id: fixtures.good_practices[0].id });
    rpc.mockClear();
    expect(await getGoodPractice(db, "nie-ma")).toBeNull();
    expect(rpc).not.toHaveBeenCalled();
  });
});
