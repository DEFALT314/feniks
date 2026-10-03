import { describe, expect, it, vi } from "vitest";
import { createCard, NewCardInput, newCardId, newCardRow, type NewCardDeps } from "./new-card";

describe("new innovation card", () => {
  it("builds a readable, unique id from the name", () => {
    expect(newCardId("Babcia w sieci! Łączy pokolenia", "k3x9")).toBe(
      "babcia-w-sieci-laczy-pokolenia-k3x9",
    );
    expect(newCardId("???", "ab12")).toBe("innowacja-ab12");
  });

  it("starts hidden from the Library and from matching", () => {
    const row = newCardRow({ nazwa: "Sąsiedzka pomoc", kategoria_id: "dla-seniorow" }, "zz99");
    expect(row).toMatchObject({
      id: "sasiedzka-pomoc-zz99",
      opublikowana: false,
      do_matchmakingu: false,
      sprawdzona_przez_rops: false,
    });
  });

  it("asks for a name and a category in plain words", () => {
    const r = NewCardInput.safeParse({ nazwa: " a ", kategoria_id: "" });
    expect(r.success).toBe(false);
    const messages = r.error!.issues.map((i) => i.message);
    expect(messages).toContain("Wpisz nazwę innowacji (co najmniej 3 znaki).");
    expect(messages).toContain("Wybierz kategorię.");
  });
});

describe("createCard", () => {
  const deps = (over: Partial<NewCardDeps> = {}): NewCardDeps => ({
    isRops: true,
    insert: vi.fn(async () => ({ error: null })),
    audit: vi.fn(async () => 1),
    suffix: () => "ab12",
    ...over,
  });
  const input = { nazwa: "Sąsiedzka pomoc", kategoria_id: "dla-seniorow" };

  it("inserts a hidden card and logs it", async () => {
    const d = deps();
    expect(await createCard(d, input)).toEqual({ id: "sasiedzka-pomoc-ab12" });
    expect(d.insert).toHaveBeenCalledWith(expect.objectContaining({ opublikowana: false }));
    expect(d.audit).toHaveBeenCalledWith("sasiedzka-pomoc-ab12");
  });

  it("refuses other roles before touching the database", async () => {
    const d = deps({ isRops: false });
    expect(await createCard(d, input)).toEqual({
      message: "Karty mogą dodawać tylko redakcja i administracja ROPS.",
    });
    expect(d.insert).not.toHaveBeenCalled();
  });

  it("explains an unknown category and a failed save", async () => {
    expect(
      await createCard(deps({ insert: async () => ({ error: { code: "23503" } }) }), input),
    ).toEqual({ message: "Nie ma takiej kategorii." });
    expect(
      await createCard(deps({ insert: async () => ({ error: { code: "x" } }) }), input),
    ).toEqual({ message: "Nie udało się dodać karty. Spróbuj ponownie." });
  });

  it("a failed log entry does not undo the new card", async () => {
    const d = deps({ audit: async () => Promise.reject(new Error("down")) });
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await createCard(d, input)).toEqual({ id: "sasiedzka-pomoc-ab12" });
  });
});
