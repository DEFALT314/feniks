import { describe, expect, it, vi } from "vitest";
import { NUMBER_PLACEHOLDER, removeInventedNumbers } from "./guards";

vi.mock("server-only", () => ({}));

const { applicationDraft, hints, CALLS } = await import("./creator");

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

  it("returns null for an unknown call without asking the model", async () => {
    const { client, calls } = fakeLlm();
    expect(await applicationDraft({ idea, call_id: "nie-ma" }, { client })).toBeNull();
    expect(calls).toHaveLength(0);
  });
});
