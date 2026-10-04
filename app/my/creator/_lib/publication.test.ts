import { describe, expect, it, vi } from "vitest";
import { changeConsent, publicationView, shortTitle, type ConsentDeps } from "./publication";

const ID = "3f6d2c1e-8b7a-4e5f-9c1d-2a3b4c5d6e7f";

describe("publicationView", () => {
  it("is published only while both consent and publication are set", () => {
    expect(
      publicationView({
        zgoda_publikacji_at: "2026-10-04T09:00:00+02:00",
        opublikowany_at: "2026-10-04T10:00:00+02:00",
      }),
    ).toEqual({ kind: "published", since: "2026-10-04T10:00:00+02:00" });
    expect(
      publicationView({ zgoda_publikacji_at: "2026-10-04T09:00:00+02:00", opublikowany_at: null }),
    ).toEqual({ kind: "consent" });
    expect(publicationView({ zgoda_publikacji_at: null, opublikowany_at: null })).toEqual({
      kind: "no-consent",
    });
    // A publication without consent never shows: the database clears it, this is the fallback
    expect(
      publicationView({ zgoda_publikacji_at: null, opublikowany_at: "2026-10-04T10:00:00+02:00" }),
    ).toEqual({ kind: "no-consent" });
  });

  it("treats missing fields (older data) as no consent", () => {
    expect(publicationView({})).toEqual({ kind: "no-consent" });
  });
});

function deps(result: Awaited<ReturnType<ConsentDeps["setConsent"]>>) {
  return {
    setConsent: vi.fn(async () => result),
    notifyRops: vi.fn(async () => 1),
    writeAudit: vi.fn(async () => 1),
  } satisfies ConsentDeps;
}

const IDEA = { id: ID, tytul: "Herbatka sąsiedzka" };

describe("changeConsent", () => {
  it("records consent in the audit log and does not bother ROPS", async () => {
    const d = deps({ ok: true, result: "zgoda" });
    expect(await changeConsent(d, IDEA, true)).toEqual({
      status: "saved",
      consent: true,
      message:
        "Zapisaliśmy zgodę. Jeśli ROPS zatwierdzi pomysł, może pokazać go w Bibliotece jako dobrą praktykę.",
    });
    expect(d.setConsent).toHaveBeenCalledWith(ID, true);
    expect(d.writeAudit).toHaveBeenCalledWith({
      akcja: "pomysl.zgoda_publikacji",
      obiekt: `ideas:${ID}`,
      szczegoly: { tytul: "Herbatka sąsiedzka" },
    });
    expect(d.notifyRops).not.toHaveBeenCalled();
  });

  it("withdraws consent quietly when nothing was shown", async () => {
    const d = deps({ ok: true, result: "brak_zgody" });
    expect(await changeConsent(d, IDEA, false)).toEqual({
      status: "saved",
      consent: false,
      message: "Wycofaliśmy zgodę. Pomysł widzą tylko ROPS i eksperci.",
    });
    expect(d.writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({ akcja: "pomysl.zgoda_wycofana" }),
    );
    expect(d.notifyRops).not.toHaveBeenCalled();
  });

  it("tells ROPS when the withdrawal took a published practice down", async () => {
    const d = deps({ ok: true, result: "ukryty" });
    expect(await changeConsent(d, IDEA, false)).toEqual({
      status: "saved",
      consent: false,
      message: "Wycofaliśmy zgodę. Pomysł zniknął z Biblioteki.",
    });
    expect(d.notifyRops).toHaveBeenCalledWith(IDEA);
  });

  it("keeps the saved choice when the follow-ups fail", async () => {
    const d = deps({ ok: true, result: "ukryty" });
    d.notifyRops.mockRejectedValue(new Error("down"));
    d.writeAudit.mockRejectedValue(new Error("down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await changeConsent(d, IDEA, false)).status).toBe("saved");
  });

  it("explains a refusal without changing anything else", async () => {
    const d = deps({ ok: false, reason: "not-found" });
    expect(await changeConsent(d, IDEA, true)).toEqual({
      status: "error",
      message: "Nie ma takiego pomysłu albo nie jest Twój.",
    });
    expect(d.writeAudit).not.toHaveBeenCalled();
  });

  it("asks to try again after an unknown failure", async () => {
    const d = deps({ ok: false, reason: "failed" });
    expect(await changeConsent(d, IDEA, true)).toEqual({
      status: "error",
      message: "Nie udało się zapisać zgody. Spróbuj ponownie.",
    });
  });
});

describe("review fixes (#104)", () => {
  it("does not read a publication as shown without a current approval", () => {
    const idea = {
      zgoda_publikacji_at: "2026-10-04T09:00:00+02:00",
      opublikowany_at: "2026-10-04T10:00:00+02:00",
    };
    expect(publicationView(idea, false)).toEqual({ kind: "consent" });
  });

  it("shortens a long title so the notification still fits", () => {
    expect(shortTitle("Krótki")).toBe("Krótki");
    const long = shortTitle("a".repeat(200));
    expect(long.length).toBe(100);
    expect(long.endsWith("…")).toBe(true);
  });
});
