import { describe, expect, it, vi } from "vitest";
import type { MyIdea } from "./ideas";
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

function deps(idea: MyIdea | null = IDEA, sent = true) {
  return {
    loadIdea: vi.fn(async () => idea),
    markSent: vi.fn(async () => sent),
    addNotification: vi.fn(async () => 1),
    writeAudit: vi.fn(async () => 1),
  } satisfies SubmitDeps;
}

describe("submitIdea", () => {
  it("sends a complete draft, notifies ROPS with a link to the queue and writes the audit log", async () => {
    const d = deps();
    expect(await submitIdea(d, IDEA.id)).toEqual({ status: "sent", resent: false });
    expect(d.markSent).toHaveBeenCalledWith(IDEA.id);
    expect(d.addNotification).toHaveBeenCalledWith({
      role: ["rops_redaktor", "rops_admin"],
      typ: "pomysl_wyslany",
      tytul: "Nowy pomysł do oceny: Sąsiedzki dyżur po wypisie",
      link: `/admin?idea=${IDEA.id}`,
    });
    expect(d.writeAudit).toHaveBeenCalledWith({
      akcja: "pomysl.wyslanie",
      obiekt: `ideas:${IDEA.id}`,
    });
  });

  it("refuses an incomplete card and says what is missing", async () => {
    const d = deps({ ...IDEA, istota: null, dla_kogo: " " });
    expect(await submitIdea(d, IDEA.id)).toEqual({
      status: "error",
      message: "Uzupełnij fiszkę przed wysłaniem.",
      missing: ["Istota", "Dla kogo"],
    });
    expect(d.markSent).not.toHaveBeenCalled();
  });

  it("does not send twice while ROPS has the idea", async () => {
    const d = deps({ ...IDEA, wyslany_at: "2026-10-03T19:00:00+02:00", status: "w_weryfikacji" });
    expect((await submitIdea(d, IDEA.id)).status).toBe("error");
    expect(d.markSent).not.toHaveBeenCalled();
    expect(d.addNotification).not.toHaveBeenCalled();
  });

  it("sends a corrected version after 'do poprawy'", async () => {
    const d = deps({ ...IDEA, wyslany_at: "2026-10-03T19:00:00+02:00", status: "do_poprawy" });
    expect(await submitIdea(d, IDEA.id)).toEqual({ status: "sent", resent: true });
    expect(d.addNotification).toHaveBeenCalledWith(
      expect.objectContaining({ tytul: "Poprawiony pomysł do oceny: Sąsiedzki dyżur po wypisie" }),
    );
    expect(d.writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({ akcja: "pomysl.ponowne_wyslanie" }),
    );
  });

  it("reports an idea that is not the user's", async () => {
    expect((await submitIdea(deps(null), IDEA.id)).status).toBe("error");
  });

  it("reports a failed update and does not notify", async () => {
    const d = deps(IDEA, false);
    expect((await submitIdea(d, IDEA.id)).status).toBe("error");
    expect(d.addNotification).not.toHaveBeenCalled();
  });

  it("keeps the submission when the notification fails", async () => {
    const d = deps();
    d.addNotification.mockRejectedValue(new Error("rpc down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await submitIdea(d, IDEA.id)).toEqual({ status: "sent", resent: false });
    expect(d.writeAudit).toHaveBeenCalled();
  });

  it("keeps the notification title within the 200-character limit", async () => {
    const d = deps({ ...IDEA, tytul: "x".repeat(200) });
    await submitIdea(d, IDEA.id);
    const [notification] = d.addNotification.mock.calls[0] as unknown as [{ tytul: string }];
    expect(notification.tytul).toHaveLength(200);
  });
});
