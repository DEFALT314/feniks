import { describe, expect, it, vi } from "vitest";
import { innovationsFromFiles } from "@/app/library/_lib/from-files";
import { ReviewResponse } from "@/lib/contracts/ai";

vi.mock("server-only", () => ({}));

const { reviewIdea, reviewSearchText } = await import("./review");

const organizer = innovationsFromFiles().find(
  (i) => i.id === "organizator-kompleksowej-opieki-w-miejscu-zamieszkania",
)!;
const idea = {
  title: "Sąsiedzki dyżur po wypisie",
  description:
    "Wolontariusze odwiedzają seniorów przez dwa tygodnie po wypisie ze szpitala: zakupy, leki, rozmowa.",
};
const answers = {
  "glowny-dochod": { choice: "Nie wiemy jeszcze", text: "" },
  "klient-platnik": { choices: ["grantodawca"] },
  intensywnosc: { choice: "Bardzo poważny problem" },
};

// A fake model answering with the given JSON and recording the prompt.
function fakeLlm(answer: object) {
  const calls: { role: string; content: string }[][] = [];
  return {
    calls,
    llm: {
      client: {
        model: "fake",
        async complete(messages: { role: "system" | "user" | "assistant"; content: string }[]) {
          calls.push(messages);
          return JSON.stringify(answer);
        },
      },
    },
  };
}

const quote = organizer.opis_krotki!.slice(0, 40);

describe("reviewIdea", () => {
  it("combines the canvas rules with AI points backed by a Library quote, contract-valid", async () => {
    const { llm, calls } = fakeLlm({
      checks: [
        {
          kind: "do_przemyslenia",
          title: "Skąd dowiecie się o wypisie ze szpitala?",
          detail: "W podobnej innowacji jedna osoba łączy rodzinę i ośrodek pomocy.",
          field: "description",
          source: "biblioteka",
          innovation_id: organizer.id,
          step: null,
          quote: `„${quote}”`,
          suggestion: "O wypisie informuje nas ośrodek pomocy społecznej.",
        },
      ],
    });
    const out = await reviewIdea(idea, { answers, similar: [organizer], llm });
    expect(ReviewResponse.safeParse(out).success).toBe(true);
    const ai = out.checks.find((c) => c.ai)!;
    expect(ai.source).toEqual({
      kind: "biblioteka",
      innovation_id: organizer.id,
      name: organizer.nazwa,
      quote,
    });
    expect(ai.suggestion).toBe("O wypisie informuje nas ośrodek pomocy społecznej.");
    expect(out.checks.map((c) => c.id)).toEqual(
      expect.arrayContaining(["kto-zaplaci", "pusty-dla-kogo", "mocny-problem"]),
    );
    expect(out.checks.at(-1)?.kind).toBe("mocna_strona");
    expect(out.progress).toEqual({
      card_filled: 2,
      card_total: 4,
      canvas_answered: 3,
      canvas_total: 22,
    });
    expect(out.similar[0].id).toBe(organizer.id);
    // the model sees the canvas answers, the similar innovation and what the rules already found
    const prompt = calls[0][1].content;
    expect(prompt).toContain("glowny-dochod | Główny dochód: Nie wiemy jeszcze");
    expect(prompt).toContain(`"id":"${organizer.id}"`);
    expect(prompt).toContain("- Nie wiadomo, kto zapłaci");
  });

  it("drops points without evidence, invented quotes, invented numbers and repeats", async () => {
    const { llm } = fakeLlm({
      checks: [
        {
          kind: "brakuje",
          title: "Dodaj więcej szczegółów",
          detail: "Ogólnie.",
          field: null,
          source: "kanwa",
          step: null,
        },
        {
          kind: "do_przemyslenia",
          title: "Kto organizuje wolontariuszy?",
          detail: "W podobnej innowacji jest koordynator.",
          field: "description",
          source: "biblioteka",
          innovation_id: organizer.id,
          quote: "cytat, którego nie ma w karcie",
          suggestion: "Koordynator prowadzi 15 wolontariuszy.",
        },
        {
          kind: "brakuje",
          title: "Nie wiadomo, kto zapłaci.",
          detail: "Powtórzenie punktu z kanwy.",
          field: "audience",
          source: "fiszka",
        },
      ],
    });
    const out = await reviewIdea(idea, { answers, similar: [organizer], llm });
    const ai = out.checks.filter((c) => c.ai);
    expect(ai.map((c) => c.title)).toEqual(["Kto organizuje wolontariuszy?"]);
    expect(ai[0].source).toMatchObject({ kind: "biblioteka", quote: null });
    expect(ai[0].suggestion).toBeNull();
  });

  it("rejects an innovation the model was not given (retry, then error)", async () => {
    const { llm, calls } = fakeLlm({
      checks: [
        {
          kind: "brakuje",
          title: "x y z",
          detail: "x y z",
          source: "biblioteka",
          innovation_id: "wymyslona",
        },
      ],
    });
    await expect(reviewIdea(idea, { answers, similar: [organizer], llm })).rejects.toThrow();
    expect(calls).toHaveLength(2);
  });

  it("without the model gives the rules only", async () => {
    const out = await reviewIdea(idea, { answers, similar: [], llm: null });
    expect(out.checks.length).toBeGreaterThan(0);
    expect(out.checks.every((c) => !c.ai)).toBe(true);
  });

  it("searches similar innovations with the whole card", () => {
    expect(
      reviewSearchText({ ...idea, essence: "Nikt nie zostaje sam.", audience: "Seniorzy" }),
    ).toBe(
      "Sąsiedzki dyżur po wypisie. Wolontariusze odwiedzają seniorów przez dwa tygodnie po wypisie ze szpitala: zakupy, leki, rozmowa. Nikt nie zostaje sam. Seniorzy",
    );
  });
});
