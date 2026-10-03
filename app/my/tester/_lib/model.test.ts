import { describe, expect, it } from "vitest";
import {
  buildTestList,
  formatAverage,
  formatTermin,
  ratingsCount,
  ratingError,
  seatsLabel,
  signUpError,
  summarizeFeedback,
  type ListInput,
  type RatingRow,
  type TestRow,
} from "./model";

const IDEA_ID = "d1000000-0000-4000-8000-000000000001";
const NOW = new Date("2026-10-03T20:00:00+02:00");

const innovationTest: TestRow = {
  id: "d3000000-0000-4000-8000-000000000001",
  idea_id: null,
  innowacja_id: "merkury",
  tytul: "Merkury – symulator",
  opis: null,
  miejsce: "online",
  termin: null,
  liczba_miejsc: 2,
};

const ideaTest: TestRow = {
  id: "d3000000-0000-4000-8000-000000000002",
  idea_id: IDEA_ID,
  innowacja_id: null,
  tytul: "Próba w bloku",
  opis: "Opis",
  miejsce: null,
  termin: "2026-10-01T10:00:00+02:00",
  liczba_miejsc: null,
};

const rating = (testId: string, ocena: number, created_at: string): RatingRow => ({
  test_id: testId,
  ocena,
  co_dzialalo: null,
  co_poprawic: null,
  created_at,
});

function input(overrides: Partial<ListInput> = {}): ListInput {
  return {
    tests: [innovationTest, ideaTest],
    seatsTaken: new Map(),
    mySignups: new Set(),
    myRatings: new Map(),
    innovationNames: new Map([["merkury", "Merkury"]]),
    myIdeaIds: new Set(),
    isRops: false,
    now: NOW,
    ...overrides,
  };
}

describe("buildTestList", () => {
  it("names the innovation and links the idea", () => {
    const [innovation, idea] = buildTestList(input());
    expect(innovation.przedmiot).toEqual({
      typ: "innowacja",
      innowacja_id: "merkury",
      nazwa: "Merkury",
    });
    expect(idea.przedmiot).toEqual({ typ: "pomysl", idea_id: IDEA_ID });
  });

  it("closes sign-ups when the test is full or its date has passed", () => {
    const [innovation, idea] = buildTestList(
      input({ seatsTaken: new Map([[innovationTest.id, 2]]) }),
    );
    expect(innovation.zajete).toBe(2);
    expect(innovation.zapisy_otwarte).toBe(false);
    expect(idea.zapisy_otwarte).toBe(false);

    const [open] = buildTestList(input({ seatsTaken: new Map([[innovationTest.id, 1]]) }));
    expect(open.zapisy_otwarte).toBe(true);
  });

  it("marks the user's sign-up and rating", () => {
    const mine = rating(innovationTest.id, 4, "2026-10-03T19:00:00+02:00");
    const [innovation, idea] = buildTestList(
      input({
        mySignups: new Set([innovationTest.id]),
        myRatings: new Map([[innovationTest.id, mine]]),
      }),
    );
    expect(innovation.zapisany).toBe(true);
    expect(innovation.moja_ocena?.ocena).toBe(4);
    expect(idea.zapisany).toBe(false);
    expect(idea.moja_ocena).toBeNull();
  });

  it("lets the idea author manage their test and ROPS the innovation tests", () => {
    const author = buildTestList(input({ myIdeaIds: new Set([IDEA_ID]) }));
    expect(author.map((t) => t.zarzadzam)).toEqual([false, true]);
    const rops = buildTestList(input({ isRops: true }));
    expect(rops.map((t) => t.zarzadzam)).toEqual([true, false]);
  });

  it("falls back to the innovation id and skips rows without a subject", () => {
    const orphan = {
      ...innovationTest,
      id: "d3000000-0000-4000-8000-000000000009",
      innowacja_id: null,
    };
    const list = buildTestList(
      input({ tests: [innovationTest, orphan], innovationNames: new Map() }),
    );
    expect(list).toHaveLength(1);
    expect(list[0].przedmiot).toMatchObject({ nazwa: "merkury" });
  });
});

describe("summarizeFeedback", () => {
  it("averages to one decimal and puts the newest comment first", () => {
    const [feedback] = summarizeFeedback(
      [ideaTest.id],
      [
        rating(ideaTest.id, 5, "2026-10-03T18:00:00+02:00"),
        rating(ideaTest.id, 4, "2026-10-03T19:00:00+02:00"),
        rating(ideaTest.id, 4, "2026-10-03T17:00:00+02:00"),
        rating(innovationTest.id, 1, "2026-10-03T19:30:00+02:00"),
      ],
    );
    expect(feedback.liczba_ocen).toBe(3);
    expect(feedback.srednia).toBe(4.3);
    expect(feedback.uwagi[0].created_at).toBe("2026-10-03T19:00:00+02:00");
  });

  it("reports a test without ratings", () => {
    expect(summarizeFeedback([ideaTest.id], [])).toEqual([
      { test_id: ideaTest.id, liczba_ocen: 0, srednia: null, uwagi: [] },
    ]);
  });
});

describe("messages", () => {
  it("explains database refusals in plain Polish", () => {
    expect(signUpError("HM409")).toBe("Brak wolnych miejsc na ten test.");
    expect(signUpError("HM410")).toBe("Zapisy na ten test są już zamknięte.");
    expect(signUpError(undefined)).toMatch(/Spróbuj ponownie/);
    expect(ratingError("42501")).toBe("Najpierw zapisz się na test, potem go oceń.");
    expect(ratingError("XX000")).toMatch(/Spróbuj ponownie/);
  });

  it("formats the date in Warsaw time and the seats left", () => {
    expect(formatTermin(null)).toBe("Termin do ustalenia");
    expect(formatTermin("2026-10-20T08:00:00Z")).toBe("20 października 2026 10:00");
    expect(seatsLabel({ liczba_miejsc: null, zajete: 3 })).toBe("bez limitu");
    expect(seatsLabel({ liczba_miejsc: 8, zajete: 5 })).toBe("wolne: 3 z 8");
    expect(seatsLabel({ liczba_miejsc: 8, zajete: 8 })).toBe("brak wolnych (z 8)");
  });
});

describe("Polish numbers", () => {
  it("uses the right plural for ratings", () => {
    expect([0, 1, 2, 4, 5, 12, 14, 22, 25, 112].map(ratingsCount)).toEqual([
      "0 ocen",
      "1 ocena",
      "2 oceny",
      "4 oceny",
      "5 ocen",
      "12 ocen",
      "14 ocen",
      "22 oceny",
      "25 ocen",
      "112 ocen",
    ]);
  });

  it("writes the average with a decimal comma", () => {
    expect(formatAverage(4.5)).toBe("4,5");
    expect(formatAverage(4)).toBe("4");
  });
});
