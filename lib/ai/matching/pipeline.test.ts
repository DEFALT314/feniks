import { describe, expect, it, vi } from "vitest";
import { innovationsFromFiles } from "@/app/library/_lib/from-files";
import { MatchResponse } from "@/lib/contracts/match";

vi.mock("server-only", () => ({}));

const { retrievalHeader, runMatch } = await import("./pipeline");
const { rerank } = await import("./rerank");
type MatchDeps = import("./pipeline").MatchDeps;

const innovations = innovationsFromFiles();
const areas = [
  {
    id: "seniorzy",
    nazwa: "Seniorzy",
    kategorie_biblioteki: ["dla-seniorow"],
    wyzwania: [{ id: "uslugi-opiekuncze", tekst: "Dostęp do usług opiekuńczych w gminie" }],
  },
  {
    id: "bezdomnosc",
    nazwa: "Bezdomność",
    kategorie_biblioteki: ["dla-osob-w-kryzysie-bezdomnosci"],
    wyzwania: [{ id: "przejscie-z-placowki", tekst: "Ciągłość pomocy po opuszczeniu placówki" }],
  },
];

// A fake model answering with the given JSON and recording the prompt.
function fakeLlm(answer: object) {
  const calls: { role: string; content: string }[][] = [];
  return {
    calls,
    client: {
      model: "fake",
      async complete(messages: { role: "system" | "user" | "assistant"; content: string }[]) {
        calls.push(messages);
        return JSON.stringify(answer);
      },
    },
  };
}

function deps(overrides: Partial<MatchDeps> = {}): MatchDeps {
  return {
    innovations,
    areas,
    embedQuery: async () => [0.1, 0.2],
    vectorSearch: async (_v, kind) =>
      kind === "challenge"
        ? [
            { ref_id: "przejscie-z-placowki", similarity: 0.91 },
            { ref_id: "uslugi-opiekuncze", similarity: 0.9 },
          ]
        : [
            { ref_id: "organizator-kompleksowej-opieki-w-miejscu-zamieszkania", similarity: 0.93 },
            { ref_id: "terapeuta-przestrzeni", similarity: 0.88 },
            { ref_id: "merkury", similarity: 0.8 },
            ...innovations
              .filter(
                (i) =>
                  ![
                    "organizator-kompleksowej-opieki-w-miejscu-zamieszkania",
                    "terapeuta-przestrzeni",
                    "merkury",
                  ].includes(i.id),
              )
              .slice(0, 12)
              .map((i, n) => ({ ref_id: i.id, similarity: 0.79 - n * 0.002 })),
          ],
    ...overrides,
  };
}

const request = {
  description:
    "Tata wraca ze szpitala po udarze (tel. 600 123 456). Nie wiemy, jak zorganizować opiekę i sprzęt w domu.",
};

describe("runMatch", () => {
  it("returns a response that satisfies the contract, with AI picks, quote and challenge", async () => {
    const { client } = fakeLlm({
      picks: [
        {
          id: "organizator-kompleksowej-opieki-w-miejscu-zamieszkania",
          reason: "Pomaga zorganizować opiekę po szpitalu.",
          quote: "organizacja opieki, sprzętu",
        },
      ],
      no_match_reason: null,
    });
    const { response, stats } = await runMatch(
      request,
      deps({ rerank: (d, c) => rerank(d, c, { client }) }),
    );
    expect(MatchResponse.safeParse(response).success).toBe(true);
    expect(response.picked_by).toBe("ai");
    expect(response.innovations.map((i) => i.innovation.id)).toEqual([
      "organizator-kompleksowej-opieki-w-miejscu-zamieszkania",
    ]);
    expect(response.innovations[0].quote).toBe("organizacja opieki, sprzętu");
    expect(response.challenge).toMatchObject({
      area_id: "seniorzy",
      challenge_id: "uslugi-opiekuncze",
    });
    expect(stats).toEqual({
      area_id: "seniorzy",
      challenge_id: "uslugi-opiekuncze",
      match_quality: response.match_quality,
    });
  });

  it("takes the challenge from the area of the recommended innovation, not the plain best text match", async () => {
    const { response } = await runMatch(request, deps({ rerank: undefined }));
    expect(response.challenge?.area_id).toBe("seniorzy");
  });

  it("never shows or sends the phone number", async () => {
    const { client, calls } = fakeLlm({ picks: [], no_match_reason: "Brak." });
    const { response } = await runMatch(
      request,
      deps({ rerank: (d, c) => rerank(d, c, { client }) }),
    );
    const shown = response.description_segments.map((s) => s.text).join("");
    expect(shown).not.toContain("600");
    expect(JSON.stringify(calls)).not.toContain("600 123 456");
  });

  it("highlights the decisive words in the description and in the innovation", async () => {
    const { client } = fakeLlm({
      picks: [
        { id: "organizator-kompleksowej-opieki-w-miejscu-zamieszkania", reason: "x", quote: null },
      ],
    });
    const { response } = await runMatch(
      request,
      deps({ rerank: (d, c) => rerank(d, c, { client }) }),
    );
    const marked = response.description_segments.filter((s) => s.highlight).map((s) => s.text);
    expect(marked.join(" ")).toMatch(/szpitala/);
    expect(response.innovations[0].summary_segments.some((s) => s.highlight)).toBe(true);
  });

  it("an empty AI choice means a weak match with the model's reason", async () => {
    const { client } = fakeLlm({
      picks: [],
      no_match_reason: "W Bibliotece nie ma innowacji o żłobkach.",
    });
    const { response } = await runMatch(
      { description: "W gminie nie ma żłobka dla dzieci." },
      deps({ rerank: (d, c) => rerank(d, c, { client }) }),
    );
    expect(response.innovations).toEqual([]);
    expect(response.match_quality).toBe("weak");
    expect(response.no_match_reason).toBe("W Bibliotece nie ma innowacji o żłobkach.");
  });

  it("without the LLM falls back to the ranking with honest, keyword-based reasons", async () => {
    const { response } = await runMatch(request, deps({ rerank: undefined }));
    expect(response.picked_by).toBe("search");
    expect(response.innovations).toHaveLength(3);
    expect(response.innovations[0].innovation.id).toBe(
      "organizator-kompleksowej-opieki-w-miejscu-zamieszkania",
    );
    expect(response.innovations.every((i) => i.quote === null)).toBe(true);
  });

  it("when the LLM fails, still answers from the ranking", async () => {
    const { response } = await runMatch(
      request,
      deps({ rerank: () => Promise.reject(new Error("402")) }),
    );
    expect(response.picked_by).toBe("search");
    expect(response.innovations.length).toBeGreaterThan(0);
  });

  it("without the embedding service uses keywords only and no challenge", async () => {
    const vectorSearch = vi.fn();
    const { response } = await runMatch(
      { description: "Seniorzy nie umieją obsłużyć bankomatu i paczkomatu." },
      deps({ embedQuery: async () => null, vectorSearch, rerank: undefined }),
    );
    expect(vectorSearch).not.toHaveBeenCalled();
    expect(response.challenge).toBeNull();
    expect(response.innovations[0].innovation.id).toBe("merkury");
  });

  it("reports how the candidates were found (X-Match-Retrieval)", async () => {
    const description = "Seniorzy nie umieją obsłużyć bankomatu i paczkomatu.";
    const run = async (overrides: Partial<MatchDeps>) =>
      retrievalHeader(
        (await runMatch({ description }, deps({ rerank: undefined, ...overrides }))).retrieval,
      );
    expect(await run({})).toBe("hybrid");
    expect(await run({ embedQuery: async () => null })).toBe("keywords; reason=no-embed");
    expect(await run({ vectorSearch: async () => [] })).toBe("keywords; reason=no-vectors");
    expect(
      await run({
        vectorSearch: async () => {
          throw new Error("function match_embeddings does not exist");
        },
      }),
    ).toBe("keywords; reason=vector-error");
  });

  it("ignores vector hits for innovations that are not in the visible catalog", async () => {
    const { response } = await runMatch(
      request,
      deps({
        rerank: undefined,
        vectorSearch: async (_v, kind) =>
          kind === "challenge" ? [] : [{ ref_id: "usunieta-innowacja", similarity: 0.99 }],
      }),
    );
    const ids = [
      ...response.innovations.map((i) => i.innovation.id),
      ...response.more.map((m) => m.id),
    ];
    expect(ids).not.toContain("usunieta-innowacja");
  });
});

describe("rerank", () => {
  const candidates = innovations.filter((i) => ["merkury", "bawita"].includes(i.id));

  it("drops invented quotes, duplicate and 'none' picks", async () => {
    const { client } = fakeLlm({
      picks: [
        { id: "merkury", reason: "Ćwiczenie bankomatu.", quote: "cytat, którego nie ma" },
        { id: "merkury", reason: "duplikat", quote: null },
        { id: "none", reason: "nic", quote: null },
        { id: "bawita", reason: "Pamięć.", quote: "„Drewniana tablica manipulacyjna”" },
      ],
    });
    const out = await rerank("seniorzy", candidates, { client });
    expect(out.picks).toEqual([
      { id: "merkury", reason: "Ćwiczenie bankomatu.", quote: null },
      { id: "bawita", reason: "Pamięć.", quote: "Drewniana tablica manipulacyjna" },
    ]);
  });

  it("rejects ids outside the candidate list (retry, then error)", async () => {
    const { client, calls } = fakeLlm({ picks: [{ id: "wymyslona", reason: "x", quote: null }] });
    await expect(rerank("seniorzy", candidates, { client })).rejects.toThrow();
    expect(calls).toHaveLength(2);
  });

  it("tells the model to choose only from the list and gives it the candidates", async () => {
    const { client, calls } = fakeLlm({ picks: [] });
    await rerank("seniorzy", candidates, { client });
    expect(calls[0][0].content).toMatch(/only ids from the list/i);
    expect(calls[0][1].content).toContain('"id":"merkury"');
  });
});
