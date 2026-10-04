import { describe, expect, it, vi } from "vitest";
import type { MyIdea, SendResult } from "./ideas";
import { submitIdea, type SubmitDeps } from "./submit";

const IDEA: MyIdea = {
  id: "3f6d2c1e-8b7a-4e5f-9c1d-2a3b4c5d6e7f",
  tytul: "Sąsiedzki dyżur po wypisie",
  opis: "Wolontariusze odwiedzają seniorów po szpitalu.",
  istota: "Nikt nie zostaje sam.",
  dla_kogo: "Seniorzy",
  etap: "pomysl",
  obszar_id: null,
  wyslany_at: null,
  created_at: "2026-10-03T18:00:00+02:00",
  updated_at: "2026-10-03T18:00:00+02:00",
  answers: {},
  status: null,
  komentarz: null,
};

function deps(idea: MyIdea | null = IDEA, sent: SendResult = { ok: true, resent: false }) {
  return {
    loadIdea: vi.fn(async () => idea),
    send: vi.fn(async () => sent),
    notifyRops: vi.fn(async () => ({ notified: 1, emailSent: true })),
    writeAudit: vi.fn(async () => 1),
    changeConsent: vi.fn(async (_idea: { id: string; tytul: string }, consent: boolean) => ({
      status: "saved" as const,
      consent,
      message: "",
    })),
  } satisfies SubmitDeps;
}

describe("submitIdea", () => {
  it("sends a complete draft, notifies ROPS with a link to the queue and writes the audit log", async () => {
    const d = deps();
    expect(await submitIdea(d, IDEA.id)).toEqual({ status: "sent", resent: false });
    expect(d.send).toHaveBeenCalledWith(IDEA.id);
    expect(d.notifyRops).toHaveBeenCalledWith({
      ideaId: IDEA.id,
      tytul: "Sąsiedzki dyżur po wypisie",
    });
    expect(d.writeAudit).toHaveBeenCalledWith({
      akcja: "pomysl.wyslanie",
      obiekt: `ideas:${IDEA.id}`,
      // The ROPS panel's change log shows the title, not just the id
      szczegoly: { tytul: "Sąsiedzki dyżur po wypisie" },
    });
  });

  it("refuses an incomplete card and says what is missing", async () => {
    const d = deps({ ...IDEA, istota: null, dla_kogo: " " });
    expect(await submitIdea(d, IDEA.id)).toEqual({
      status: "error",
      message: "Uzupełnij fiszkę przed wysłaniem.",
      missing: ["Istota", "Dla kogo"],
    });
    expect(d.send).not.toHaveBeenCalled();
  });

  it("does not send twice while ROPS has the idea", async () => {
    const d = deps({ ...IDEA, wyslany_at: "2026-10-03T19:00:00+02:00", status: "w_weryfikacji" });
    expect((await submitIdea(d, IDEA.id)).status).toBe("error");
    expect(d.send).not.toHaveBeenCalled();
    expect(d.notifyRops).not.toHaveBeenCalled();
  });

  it("sends a corrected version after 'do poprawy'", async () => {
    const d = deps(
      { ...IDEA, wyslany_at: "2026-10-03T19:00:00+02:00", status: "do_poprawy" },
      { ok: true, resent: true },
    );
    expect(await submitIdea(d, IDEA.id)).toEqual({ status: "sent", resent: true });
    expect(d.notifyRops).toHaveBeenCalledWith(
      expect.objectContaining({ tytul: "Sąsiedzki dyżur po wypisie (poprawiona wersja)" }),
    );
    expect(d.writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({ akcja: "pomysl.ponowne_wyslanie" }),
    );
  });

  it("reports an idea that is not the user's", async () => {
    expect((await submitIdea(deps(null), IDEA.id)).status).toBe("error");
  });

  it("reports a failed send and does not notify", async () => {
    const d = deps(IDEA, { ok: false, reason: "failed" });
    expect((await submitIdea(d, IDEA.id)).status).toBe("error");
    expect(d.notifyRops).not.toHaveBeenCalled();
  });

  it("does not notify twice when a parallel request already sent it", async () => {
    // The database refuses the second send under its row lock (HM409)
    const d = deps(IDEA, { ok: false, reason: "with-rops" });
    expect(await submitIdea(d, IDEA.id)).toEqual({
      status: "error",
      message: "Ten pomysł jest już w ROPS. Poczekaj na odpowiedź.",
    });
    expect(d.notifyRops).not.toHaveBeenCalled();
    expect(d.writeAudit).not.toHaveBeenCalled();
  });

  it("keeps the submission when the notification fails", async () => {
    const d = deps();
    d.notifyRops.mockRejectedValue(new Error("rpc down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await submitIdea(d, IDEA.id)).toEqual({ status: "sent", resent: false });
    expect(d.writeAudit).toHaveBeenCalled();
  });

  describe("consent to show the idea as a good practice (#104)", () => {
    it("saves the ticked consent before sending", async () => {
      const d = deps();
      expect(await submitIdea(d, IDEA.id, true)).toEqual({ status: "sent", resent: false });
      expect(d.changeConsent).toHaveBeenCalledWith(
        { id: IDEA.id, tytul: "Sąsiedzki dyżur po wypisie" },
        true,
      );
      expect(d.changeConsent.mock.invocationCallOrder[0]).toBeLessThan(
        d.send.mock.invocationCallOrder[0],
      );
    });

    it("leaves consent alone when the choice did not change", async () => {
      const d = deps();
      await submitIdea(d, IDEA.id, false);
      await submitIdea(d, IDEA.id);
      expect(d.changeConsent).not.toHaveBeenCalled();
      const agreed = deps({ ...IDEA, zgoda_publikacji_at: "2026-10-04T09:00:00+02:00" });
      await submitIdea(agreed, IDEA.id, true);
      expect(agreed.changeConsent).not.toHaveBeenCalled();
    });

    it("withdraws consent when the box is unticked on a corrected version", async () => {
      const d = deps(
        {
          ...IDEA,
          wyslany_at: "2026-10-03T19:00:00+02:00",
          status: "do_poprawy",
          zgoda_publikacji_at: "2026-10-03T19:00:00+02:00",
        },
        { ok: true, resent: true },
      );
      await submitIdea(d, IDEA.id, false);
      expect(d.changeConsent).toHaveBeenCalledWith(expect.anything(), false);
    });

    it("does not send when the consent could not be saved", async () => {
      const d = deps();
      d.changeConsent.mockResolvedValue({
        status: "error",
        message: "Nie udało się zapisać zgody. Spróbuj ponownie.",
      } as never);
      expect(await submitIdea(d, IDEA.id, true)).toEqual({
        status: "error",
        message: "Nie udało się zapisać zgody. Spróbuj ponownie.",
      });
      expect(d.send).not.toHaveBeenCalled();
    });
  });
});
