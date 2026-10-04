import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));

const { opinionsForPrompt, summarizeFeedback } = await import("./feedback-summary");

const opinions = [
  { ocena: 5, co_dzialalo: "Proste", co_poprawic: "Tablet", created_at: "2026-10-04T08:00:00Z" },
  { ocena: 3, co_dzialalo: null, co_poprawic: "Instrukcja", created_at: "2026-10-04T09:00:00Z" },
];

describe("summarizeFeedback", () => {
  it("needs at least two opinions and does not call the model otherwise", async () => {
    const complete = vi.fn();
    expect(
      await summarizeFeedback("Merkury", opinions.slice(0, 1), {
        client: { model: "m", complete },
      }),
    ).toBeNull();
    expect(complete).not.toHaveBeenCalled();
  });

  it("returns the validated summary from the model", async () => {
    const complete = vi.fn(async () =>
      JSON.stringify({
        co_dziala: "Prosta obsługa.",
        co_poprawic: "Wersja na tablet.",
        nastepny_krok: "Zapytać autorów.",
      }),
    );
    const s = await summarizeFeedback("Merkury", opinions, {
      client: { model: "m", complete },
      replay: { mode: "off" } as never,
    });
    expect(s).toEqual({
      co_dziala: "Prosta obsługa.",
      co_poprawic: "Wersja na tablet.",
      nastepny_krok: "Zapytać autorów.",
    });
    const prompt = (complete.mock.calls[0] as unknown as [{ content: string }[]])[0]
      .map((m) => m.content)
      .join("\n");
    expect(prompt).toContain("Ocena 5/5. Działa: Proste Poprawić: Tablet");
  });

  it("sends scores and texts only", () => {
    expect(opinionsForPrompt(opinions)).toBe(
      "1. Ocena 5/5. Działa: Proste Poprawić: Tablet\n2. Ocena 3/5. Poprawić: Instrukcja",
    );
  });
});
