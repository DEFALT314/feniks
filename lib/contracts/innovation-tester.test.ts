import { describe, expect, it } from "vitest";
import { NewTestInput, RatingInput, TestSubject, testerFixture } from "./innovation-tester";

const TEST_ID = "d3000000-0000-4000-8000-000000000001";

describe("innovation tester contract", () => {
  it("accepts the sample tests and feedback", () => {
    expect(testerFixture.testy).toHaveLength(3);
    expect(testerFixture.opinie[0].srednia).toBe(4.5);
  });

  it("accepts a rating from 1 to 5 and nothing else", () => {
    expect(RatingInput.safeParse({ test_id: TEST_ID, ocena: 1 }).success).toBe(true);
    expect(RatingInput.safeParse({ test_id: TEST_ID, ocena: 5 }).success).toBe(true);
    expect(RatingInput.safeParse({ test_id: TEST_ID, ocena: 0 }).success).toBe(false);
    expect(RatingInput.safeParse({ test_id: TEST_ID, ocena: 6 }).success).toBe(false);
    expect(RatingInput.safeParse({ test_id: TEST_ID, ocena: 3.5 }).success).toBe(false);
    expect(RatingInput.safeParse({ test_id: "abc", ocena: 3 }).success).toBe(false);
  });

  it("stores blank comments as null and trims the rest", () => {
    const rating = RatingInput.parse({
      test_id: TEST_ID,
      ocena: 4,
      co_dzialalo: "   ",
      co_poprawic: "  Większe litery. ",
    });
    expect(rating.co_dzialalo).toBeNull();
    expect(rating.co_poprawic).toBe("Większe litery.");
  });

  it("limits comments to 2000 characters", () => {
    const long = "a".repeat(2001);
    expect(RatingInput.safeParse({ test_id: TEST_ID, ocena: 4, co_dzialalo: long }).success).toBe(
      false,
    );
  });

  it("requires a test name and a sensible number of seats", () => {
    const base = { idea_id: TEST_ID, tytul: "Próba w klubie seniora" };
    expect(NewTestInput.parse(base)).toMatchObject({ liczba_miejsc: null, termin: null });
    expect(NewTestInput.safeParse({ ...base, tytul: "  " }).success).toBe(false);
    expect(NewTestInput.safeParse({ ...base, liczba_miejsc: 0 }).success).toBe(false);
    expect(NewTestInput.safeParse({ ...base, liczba_miejsc: 501 }).success).toBe(false);
  });

  it("knows two kinds of subject", () => {
    expect(TestSubject.safeParse({ typ: "pomysl", idea_id: TEST_ID }).success).toBe(true);
    expect(
      TestSubject.safeParse({ typ: "innowacja", innowacja_id: "merkury", nazwa: "Merkury" })
        .success,
    ).toBe(true);
    expect(TestSubject.safeParse({ typ: "inne", idea_id: TEST_ID }).success).toBe(false);
  });
});
