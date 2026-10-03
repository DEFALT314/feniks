import { describe, expect, it } from "vitest";
import {
  authorStatus,
  currentReview,
  canSubmit,
  matchDescription,
  missingForSubmission,
  toIdeaDraft,
} from "./submission";

const card = {
  tytul: "Sąsiedzki dyżur",
  opis: "Wolontariusze odwiedzają seniorów po szpitalu.",
  istota: "Nikt nie zostaje sam.",
  dla_kogo: "Seniorzy mieszkający samotnie",
  etap: "pomysl" as const,
  obszar_id: "seniorzy",
};

describe("missingForSubmission", () => {
  it("is empty for a complete card", () => {
    expect(missingForSubmission(card)).toEqual([]);
  });

  it("lists empty and whitespace-only fields", () => {
    expect(missingForSubmission({ ...card, opis: null, istota: "   " })).toEqual([
      "Opis",
      "Istota",
    ]);
  });
});

describe("canSubmit", () => {
  it("allows the first submission", () => {
    expect(canSubmit(null, null)).toBe(true);
  });

  it("blocks sending again while ROPS has the idea", () => {
    expect(canSubmit("2026-10-03T18:00:00Z", null)).toBe(false);
    expect(canSubmit("2026-10-03T18:00:00Z", "w_weryfikacji")).toBe(false);
    expect(canSubmit("2026-10-03T18:00:00Z", "zatwierdzony")).toBe(false);
    expect(canSubmit("2026-10-03T18:00:00Z", "odrzucony")).toBe(false);
  });

  it("allows sending a corrected version after 'do poprawy'", () => {
    expect(canSubmit("2026-10-03T18:00:00Z", "do_poprawy")).toBe(true);
  });
});

describe("authorStatus", () => {
  it("names every state in plain Polish", () => {
    expect(authorStatus(null, null).label).toBe("Szkic");
    expect(authorStatus("2026-10-03T18:00:00Z", null).label).toBe("Wysłany do ROPS");
    expect(authorStatus("2026-10-03T18:00:00Z", "nowy").label).toBe("Wysłany do ROPS");
    expect(authorStatus("2026-10-03T18:00:00Z", "do_poprawy")).toEqual({
      label: "Do poprawy",
      badge: "danger",
    });
  });
});

describe("toIdeaDraft", () => {
  it("maps the card onto P3's IdeaDraft", () => {
    expect(toIdeaDraft(card)).toEqual({
      title: "Sąsiedzki dyżur",
      description: "Wolontariusze odwiedzają seniorów po szpitalu.",
      essence: "Nikt nie zostaje sam.",
      audience: "Seniorzy mieszkający samotnie",
      stage: "pomysl",
      area_id: "seniorzy",
    });
  });

  it("leaves out empty optional fields", () => {
    expect(
      toIdeaDraft({
        ...card,
        opis: null,
        istota: " ",
        dla_kogo: null,
        etap: null,
        obszar_id: null,
      }),
    ).toEqual({ title: "Sąsiedzki dyżur", description: "" });
  });
});

describe("matchDescription", () => {
  it("joins the card's own words", () => {
    expect(matchDescription(card)).toBe(
      "Wolontariusze odwiedzają seniorów po szpitalu. Nikt nie zostaje sam. Seniorzy mieszkający samotnie",
    );
  });
});

describe("currentReview", () => {
  const review = { status: "do_poprawy", oceniony_at: "2026-10-03T19:00:00+00:00" };

  it("applies a review made after the idea was sent", () => {
    expect(currentReview("2026-10-03T18:00:00+00:00", review)).toBe(review);
  });

  it("drops a review of an earlier version once the author sends a correction", () => {
    expect(currentReview("2026-10-03T20:00:00+00:00", review)).toBeUndefined();
  });

  it("keeps the review when nothing was sent and when there is none", () => {
    expect(currentReview(null, review)).toBe(review);
    expect(currentReview("2026-10-03T20:00:00+00:00", undefined)).toBeUndefined();
  });
});
