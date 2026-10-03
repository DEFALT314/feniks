import { describe, expect, it, vi } from "vitest";
import { NUMBER_PLACEHOLDER, removeInventedNumbers } from "./guards";
import { sanitizeSvg, svgDataUrl } from "./svg";

vi.mock("server-only", () => ({}));

const { applicationDraft, hints, visualisation, CALLS } = await import("./creator");

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

describe("sanitizeSvg", () => {
  const ok =
    '<svg viewBox="0 0 10 10"><rect x="1" y="1" width="8" height="8" fill="#1f3a8a"/></svg>';

  it("keeps drawing elements and adds the namespace", () => {
    expect(sanitizeSvg(ok)).toBe(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect x="1" y="1" width="8" height="8" fill="#1f3a8a"/></svg>',
    );
  });

  it.each([
    ['<svg><script>alert(1)</script><circle r="2"/></svg>', "script"],
    ['<svg><circle r="2" onclick="alert(1)"/></svg>', "onclick"],
    ['<svg><a href="javascript:alert(1)"><circle r="2"/></a></svg>', "javascript"],
    ['<svg><image href="https://evil.example/x.png"/></svg>', "evil"],
    ["<svg><foreignObject><div>x</div></foreignObject></svg>", "div"],
    ['<svg><rect fill="url(https://evil.example/p)"/></svg>', "evil"],
    ["<svg><style>*{background:url(x)}</style></svg>", "style"],
  ])("removes dangerous content: %s", (input, forbidden) => {
    expect(sanitizeSvg(input) ?? "").not.toContain(forbidden);
  });

  it("keeps internal gradient references", () => {
    expect(sanitizeSvg('<svg><rect fill="url(#g)"/></svg>')).toContain('fill="url(#g)"');
  });

  it("rejects input that is not an SVG", () => {
    expect(sanitizeSvg("Here is your picture!")).toBeNull();
  });

  it("encodes as a data URL", () => {
    expect(svgDataUrl("<svg/>")).toBe(
      `data:image/svg+xml;base64,${Buffer.from("<svg/>").toString("base64")}`,
    );
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

describe("visualisation", () => {
  it("returns a sanitized SVG data URL with Polish alt text", async () => {
    const { client } = fakeLlm({
      svg: '<svg viewBox="0 0 640 400"><circle cx="5" cy="5" r="4" onload="x()"/></svg>',
      alt_text: "Wolontariuszka przynosi zakupy seniorowi.",
    });
    const out = await visualisation(idea, { client });
    expect(out.alt_text).toBe("Wolontariuszka przynosi zakupy seniorowi.");
    const svg = Buffer.from(out.image_url.split(",")[1], "base64").toString();
    expect(svg).toContain("<circle");
    expect(svg).not.toContain("onload");
  });

  it("fails clearly when the model returns no SVG", async () => {
    const { client } = fakeLlm({
      svg: "Nie umiem rysować, przepraszam.",
      alt_text: "Brak obrazu.",
    });
    await expect(visualisation(idea, { client })).rejects.toThrow(/SVG/);
  });
});
