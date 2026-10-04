import { describe, expect, it, vi } from "vitest";
import { NUMBER_PLACEHOLDER, removeInventedNumbers } from "./guards";

vi.mock("server-only", () => ({}));

const { alternatives, applicationDraft, budgetFromCanvas, hints, CALLS } =
  await import("./creator");

function fakeLlm(...answers: object[]) {
  const calls: { role: string; content: string }[][] = [];
  return {
    calls,
    client: {
      model: "fake",
      async complete(messages: { role: "system" | "user" | "assistant"; content: string }[]) {
        calls.push(messages);
        return JSON.stringify(answers.shift());
      },
    },
  };
}

const idea = {
  title: "Sąsiedzki dyżur po wypisie",
  description: "Wolontariusze odwiedzają seniorów przez 2 tygodnie po powrocie ze szpitala.",
};

describe("removeInventedNumbers", () => {
  it("keeps numbers the user wrote and replaces invented ones", () => {
    const out = removeInventedNumbers(
      "Przez 2 tygodnie wspieramy 40 seniorów za 15 000 zł.",
      idea.description,
    );
    expect(out.text).toBe(
      `Przez 2 tygodnie wspieramy ${NUMBER_PLACEHOLDER} seniorów za ${NUMBER_PLACEHOLDER} zł.`,
    );
    expect(out.replaced).toBe(true);
  });

  it("leaves text without numbers untouched", () => {
    expect(removeInventedNumbers("Rekrutacja wolontariuszy.", "")).toEqual({
      text: "Rekrutacja wolontariuszy.",
      replaced: false,
    });
  });
});

describe("hints", () => {
  it("returns only requested fields, once each, without invented numbers", async () => {
    const { client } = fakeLlm({
      hints: [
        {
          field: "audience",
          text: "Seniorzy po wypisie, około 50 osób.",
          why: "Brakowało odbiorców.",
        },
        { field: "audience", text: "duplikat", why: null },
        { field: "title", text: "Nieproszona zmiana", why: null },
      ],
    });
    const out = await hints({ idea, fields: ["audience"] }, { client });
    expect(out.hints).toEqual([
      {
        field: "audience",
        text: `Seniorzy po wypisie, około ${NUMBER_PLACEHOLDER} osób.`,
        why: "Brakowało odbiorców.",
      },
    ]);
  });
});

describe("hints: no noise", () => {
  it("drops a hint that repeats the field and keeps the essence to one sentence", async () => {
    const { client } = fakeLlm({
      hints: [
        { field: "title", text: "Sąsiedzki dyżur po wypisie.", why: "Tytuł jest dobry." },
        {
          field: "essence",
          text: "Nikt nie zostaje sam po szpitalu. Wolontariusze pomagają w domu.",
          why: null,
        },
      ],
    });
    const out = await hints({ idea, fields: ["title", "essence"] }, { client });
    expect(out.hints).toEqual([
      { field: "essence", text: "Nikt nie zostaje sam po szpitalu.", why: null },
    ]);
  });
});

describe("applicationDraft", () => {
  it("orders sections, adds titles and marks the ones the user must complete", async () => {
    const { client, calls } = fakeLlm({
      sections: [
        { key: "results", text: "Wsparcie dla 40 seniorów." },
        { key: "goal", text: "Wsparcie seniorów przez 2 tygodnie po szpitalu." },
        { key: "budget", text: "Koszty: [koszt szkoleń]." },
      ],
    });
    const out = await applicationDraft({ idea, call_id: CALLS[0].id }, { client });
    expect(out?.sections.map((s) => [s.key, s.title, s.needs_user_input])).toEqual([
      ["goal", "Cel projektu", false],
      ["results", "Rezultaty", true],
      ["budget", "Budżet", true],
    ]);
    expect(out?.sections[1].text).toBe(`Wsparcie dla ${NUMBER_PLACEHOLDER} seniorów.`);
    expect(calls[0][1].content).toContain(CALLS[0].goal);
  });

  it("grounds the draft in the canvas: budget from the ticked costs, sources, fit and what is missing", async () => {
    const answers = {
      "koszty-stale": {
        choices: ["koordynacja projektu", "inne"],
        other: "ubezpieczenie wolontariuszy",
      },
      "koszty-zmienne": { choices: ["materiały dla uczestników"] },
      partnerzy: { partners: [{ name: "GOPS", axis: "dotarcie", status: "potwierdzony" }] },
    };
    const { client, calls } = fakeLlm({
      sections: [
        {
          key: "activities",
          text: "Wolontariusze odwiedzają seniorów, a GOPS informuje o wypisie.",
          sources: ["Fiszka: Opis", "Kanwa: Partnerzy", "Kanwa: Coś zmyślonego"],
        },
        { key: "budget", text: "Model nie powinien tu nic pisać." },
      ],
      fit: { level: "dobra", note: "Nabór finansuje wsparcie seniorów w domu." },
      missing: ["Ilu seniorom pomożecie", "", "Kto koordynuje wolontariuszy"],
    });
    const out = await applicationDraft({ idea, call_id: CALLS[0].id }, { client }, CALLS, answers);
    const activities = out!.sections.find((x) => x.key === "activities")!;
    expect(activities.sources).toEqual(["Fiszka: Opis", "Kanwa: Partnerzy"]);
    const budget = out!.sections.find((x) => x.key === "budget")!;
    expect(budget.text).toBe(
      "Koszty stałe:\n- koordynacja projektu: [kwota]\n- ubezpieczenie wolontariuszy: [kwota]\nKoszty zmienne:\n- materiały dla uczestników: [kwota]",
    );
    expect(budget).toMatchObject({
      needs_user_input: true,
      sources: ["Kanwa: Koszty stałe", "Kanwa: Koszty zmienne"],
    });
    expect(out!.fit).toEqual({ level: "dobra", note: "Nabór finansuje wsparcie seniorów w domu." });
    expect(out!.missing).toEqual(["Ilu seniorom pomożecie", "Kto koordynuje wolontariuszy"]);
    // the model sees the canvas and is not asked for a budget it would only guess
    expect(calls[0][1].content).toContain("Partnerzy: GOPS");
    expect(calls[0][0].content).not.toContain("budget (only cost categories");
  });

  it("budgetFromCanvas is empty without cost answers", () => {
    expect(budgetFromCanvas({})).toBeNull();
  });

  it("returns null for an unknown call without asking the model", async () => {
    const { client, calls } = fakeLlm();
    expect(await applicationDraft({ idea, call_id: "nie-ma" }, { client })).toBeNull();
    expect(calls).toHaveLength(0);
  });
});

describe("alternatives", () => {
  it("returns at most 3 approaches, trimmed, without invented numbers", async () => {
    const { client, calls } = fakeLlm({
      alternatives: [
        {
          title: " Uczniowie ",
          text: "Dyżur pełni 30 uczniów.",
          why: "Szkoły szukają wolontariatu.",
        },
        { title: "Telefon", text: "Codzienny telefon przez 2 tygodnie.", why: null },
        { title: "", text: "puste", why: null },
        { title: "Apteka", text: "Farmaceuta daje ulotkę.", why: "Spotyka seniora po wypisie." },
        { title: "Czwarta", text: "Za dużo.", why: null },
      ],
    });
    const out = await alternatives({ idea }, { client });
    expect(out.alternatives).toEqual([
      {
        title: "Uczniowie",
        text: `Dyżur pełni ${NUMBER_PLACEHOLDER} uczniów.`,
        why: "Szkoły szukają wolontariatu.",
      },
      // "2 tygodnie" is in the user's description, so it stays
      { title: "Telefon", text: "Codzienny telefon przez 2 tygodnie.", why: null },
      { title: "Apteka", text: "Farmaceuta daje ulotkę.", why: "Spotyka seniora po wypisie." },
    ]);
    expect(calls[0][0].content).toContain("unusual");
    expect(calls[0][1].content).toContain(idea.title);
  });
});
