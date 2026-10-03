import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUser = vi.fn();
const signUp = vi.fn();
const withdraw = vi.fn();
const rate = vi.fn();
const planTest = vi.fn();
const revalidatePath = vi.fn();
const db = { fake: "db" };
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: (p: string) => revalidatePath(p) }));
vi.mock("@/lib/auth", () => ({ getCurrentUser: () => getCurrentUser() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => db }));
vi.mock("./_lib/tests", () => ({
  signUp: (...a: unknown[]) => signUp(...a),
  withdraw: (...a: unknown[]) => withdraw(...a),
  rate: (...a: unknown[]) => rate(...a),
  planTest: (...a: unknown[]) => planTest(...a),
}));

const { planIdeaTest, rateTest, signUpForTest, withdrawFromTest } = await import("./actions");

const TEST_ID = "d3000000-0000-4000-8000-000000000001";
const IDEA_ID = "d1000000-0000-4000-8000-000000000001";

describe("tester actions", () => {
  beforeEach(() => {
    getCurrentUser.mockReset().mockResolvedValue({ id: "u1", role: "mieszkaniec" });
    for (const fn of [signUp, withdraw, rate]) fn.mockReset().mockResolvedValue({ ok: true });
    planTest.mockReset().mockResolvedValue({ ok: true, id: TEST_ID });
    revalidatePath.mockReset();
  });

  it("require a signed-in user", async () => {
    getCurrentUser.mockResolvedValue(null);
    expect(await signUpForTest(TEST_ID)).toMatchObject({ ok: false });
    expect(await withdrawFromTest(TEST_ID)).toMatchObject({ ok: false });
    expect(await rateTest({ test_id: TEST_ID, ocena: 4 })).toMatchObject({ ok: false });
    expect(await planIdeaTest({ idea_id: IDEA_ID, tytul: "Test" })).toMatchObject({ ok: false });
    expect(signUp).not.toHaveBeenCalled();
    expect(withdraw).not.toHaveBeenCalled();
    expect(rate).not.toHaveBeenCalled();
    expect(planTest).not.toHaveBeenCalled();
  });

  it("sign up and withdraw with the session client and refresh the list", async () => {
    expect(await signUpForTest(TEST_ID)).toEqual({ ok: true });
    expect(signUp).toHaveBeenCalledWith(db, TEST_ID);
    expect(await withdrawFromTest(TEST_ID)).toEqual({ ok: true });
    expect(withdraw).toHaveBeenCalledWith(db, "u1", TEST_ID);
    expect(revalidatePath).toHaveBeenCalledWith("/my/tester");
  });

  it("reject a malformed test id", async () => {
    expect(await signUpForTest("1 or 1=1")).toMatchObject({ ok: false });
    expect(await withdrawFromTest("")).toMatchObject({ ok: false });
    expect(signUp).not.toHaveBeenCalled();
    expect(withdraw).not.toHaveBeenCalled();
  });

  it("pass the database refusal through and do not refresh", async () => {
    signUp.mockResolvedValue({ ok: false, error: "Brak wolnych miejsc na ten test." });
    expect(await signUpForTest(TEST_ID)).toEqual({
      ok: false,
      error: "Brak wolnych miejsc na ten test.",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("validate a rating before saving it as the signed-in user", async () => {
    expect(await rateTest({ test_id: TEST_ID, ocena: 7 })).toMatchObject({ ok: false });
    expect(rate).not.toHaveBeenCalled();
    // user_id never comes from the client
    await rateTest({ test_id: TEST_ID, ocena: 5, co_dzialalo: " Dobre ", user_id: "someone" });
    expect(rate).toHaveBeenCalledWith(db, "u1", {
      test_id: TEST_ID,
      ocena: 5,
      co_dzialalo: "Dobre",
      co_poprawic: null,
    });
  });

  it("plan a test of an idea with Polish messages for bad fields", async () => {
    expect(await planIdeaTest({ idea_id: IDEA_ID, tytul: " " })).toEqual({
      ok: false,
      error: "Wpisz nazwę testu (do 200 znaków).",
    });
    expect(await planIdeaTest({ idea_id: IDEA_ID, tytul: "Test", liczba_miejsc: 0 })).toEqual({
      ok: false,
      error: "Liczba miejsc: od 1 do 500.",
    });
    expect(await planIdeaTest({ idea_id: "x", tytul: "Test" })).toEqual({
      ok: false,
      error: "Sprawdź pola formularza i spróbuj ponownie.",
    });
    expect(
      await planIdeaTest({ idea_id: IDEA_ID, tytul: "Test", termin: "2020-01-01T10:00:00Z" }),
    ).toEqual({ ok: false, error: "Termin testu musi być w przyszłości." });
    expect(planTest).not.toHaveBeenCalled();

    expect(await planIdeaTest({ idea_id: IDEA_ID, tytul: "Próba", liczba_miejsc: 8 })).toEqual({
      ok: true,
    });
    expect(planTest).toHaveBeenCalledWith(db, {
      idea_id: IDEA_ID,
      tytul: "Próba",
      opis: null,
      miejsce: null,
      termin: null,
      liczba_miejsc: 8,
    });
    expect(revalidatePath).toHaveBeenCalledWith(`/my/creator/${IDEA_ID}/card`);
  });
});
