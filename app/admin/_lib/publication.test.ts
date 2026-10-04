import { describe, expect, it, vi } from "vitest";
import { setGoodPractice, type PublishDeps, type PublishResult } from "./publication";

const ID = "d1000000-0000-4000-8000-000000000004";
const AUTHOR = "00000000-0000-4000-8000-000000000101";

function deps(
  result: PublishResult,
  idea = { id: ID, tytul: "Herbatka sąsiedzka", autor_id: AUTHOR },
) {
  return {
    loadIdea: vi.fn(async () => idea),
    publish: vi.fn(async () => result),
    writeAudit: vi.fn(async () => 1),
    addNotification: vi.fn(async () => 1),
  } satisfies PublishDeps;
}

describe("setGoodPractice", () => {
  it("shows an approved idea, logs it and tells the author where to find it", async () => {
    const d = deps({ ok: true, result: "opublikowany" });
    expect(await setGoodPractice(d, ID, true)).toEqual({
      status: "saved",
      published: true,
      message: "„Herbatka sąsiedzka” jest w Bibliotece jako dobra praktyka.",
    });
    expect(d.publish).toHaveBeenCalledWith(ID, true);
    expect(d.writeAudit).toHaveBeenCalledWith({
      akcja: "pomysl.publikacja",
      obiekt: `ideas:${ID}`,
      szczegoly: { tytul: "Herbatka sąsiedzka" },
    });
    expect(d.addNotification).toHaveBeenCalledWith({
      userIds: [AUTHOR],
      typ: "pomysl_opublikowany",
      tytul: "ROPS pokazuje Twój pomysł „Herbatka sąsiedzka” w Bibliotece jako dobrą praktykę.",
      link: `/library/good-practices/${ID}`,
    });
  });

  it("stops showing it and tells the author", async () => {
    const d = deps({ ok: true, result: "ukryty" });
    expect(await setGoodPractice(d, ID, false)).toEqual({
      status: "saved",
      published: false,
      message: "„Herbatka sąsiedzka” nie jest już pokazywany w Bibliotece.",
    });
    expect(d.writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({ akcja: "pomysl.publikacja_wycofana" }),
    );
    expect(d.addNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        typ: "pomysl_ukryty",
        tytul: "ROPS przestał pokazywać Twój pomysł „Herbatka sąsiedzka” w Bibliotece.",
        link: `/my/creator/${ID}/card`,
      }),
    );
  });

  it("does nothing more when nothing changed (a double click)", async () => {
    const d = deps({ ok: true, result: "bez_zmian" });
    expect(await setGoodPractice(d, ID, true)).toEqual({
      status: "saved",
      published: true,
      message: "„Herbatka sąsiedzka” jest w Bibliotece jako dobra praktyka.",
    });
    expect(d.writeAudit).not.toHaveBeenCalled();
    expect(d.addNotification).not.toHaveBeenCalled();
  });

  it.each([
    ["no-consent", "Autor nie zgodził się na pokazanie tego pomysłu innym."],
    ["not-approved", "Najpierw zatwierdź pomysł. Pokazać można tylko zatwierdzony pomysł."],
    ["not-rops", "Tylko pracownicy ROPS mogą pokazywać dobre praktyki."],
    ["not-found", "Nie znaleziono tego pomysłu."],
    ["failed", "Nie udało się zapisać zmiany. Spróbuj ponownie."],
  ] as const)("explains the refusal %s", async (reason, message) => {
    const d = deps({ ok: false, reason });
    expect(await setGoodPractice(d, ID, true)).toEqual({ status: "error", message });
    expect(d.writeAudit).not.toHaveBeenCalled();
    expect(d.addNotification).not.toHaveBeenCalled();
  });

  it("refuses an idea that is not in the ROPS queue before calling the database", async () => {
    const d = deps({ ok: true, result: "opublikowany" });
    d.loadIdea.mockResolvedValue(null as never);
    expect(await setGoodPractice(d, ID, true)).toEqual({
      status: "error",
      message: "Nie znaleziono tego pomysłu.",
    });
    expect(d.publish).not.toHaveBeenCalled();
  });

  it("keeps the change when the follow-ups fail", async () => {
    const d = deps({ ok: true, result: "opublikowany" });
    d.addNotification.mockRejectedValue(new Error("down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await setGoodPractice(d, ID, true)).status).toBe("saved");
  });
});
