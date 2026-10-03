import { beforeEach, describe, expect, it, vi } from "vitest";
import { innovationsFromFiles } from "@/app/library/_lib/from-files";
import { MatchResponse } from "@/lib/contracts/match";

vi.mock("server-only", () => ({}));

const insert = vi.fn().mockResolvedValue({ error: null });
const rpc = vi.fn(async (_name: string, args: { match_kind: string }) => ({
  data:
    args.match_kind === "innovation"
      ? [
          { ref_id: "merkury", similarity: 0.93 },
          { ref_id: "bawita", similarity: 0.85 },
        ]
      : [{ ref_id: "uslugi-dla-starzejacych", similarity: 0.9 }],
  error: null,
}));
const rerankMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ rpc, from: () => ({ insert }) }),
}));
vi.mock("@/app/library/_lib/data", () => ({ getInnovations: async () => innovationsFromFiles() }));
vi.mock("@/app/challenge-map/_lib/data", () => ({
  getChallengeAreas: async () => [
    {
      id: "seniorzy",
      nazwa: "Seniorzy",
      kategorie_biblioteki: ["dla-seniorow"],
      wyzwania: [
        { id: "uslugi-dla-starzejacych", tekst: "Usługi dla starzejącego się społeczeństwa" },
      ],
    },
  ],
}));
vi.mock("@/lib/ai/embed", () => ({ embedQuery: async () => [0.1, 0.2] }));
vi.mock("@/lib/ai/matching/rerank", async (original) => ({
  ...(await original<typeof import("@/lib/ai/matching/rerank")>()),
  rerank: (...args: unknown[]) => rerankMock(...args),
}));

const env = {
  NEXT_PUBLIC_SUPABASE_URL: "http://db",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
  LLM_BASE_URL: "http://llm",
  LLM_MODEL: "m",
  LLM_API_KEY: "k",
};

let ip = 0;
function post(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://app/api/match", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": `10.0.0.${++ip}`,
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

const quota = vi.fn();
vi.mock("@/lib/ai/usage", async (original) => ({
  ...(await original<typeof import("@/lib/ai/usage")>()),
  dailyQuotaForCurrentUser: () => quota(),
}));

const { POST } = await import("./route");

beforeEach(() => {
  quota.mockReset().mockResolvedValue({ ok: true, left: null });
  vi.clearAllMocks();
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  rerankMock.mockResolvedValue({
    picks: [{ id: "merkury", reason: "Pozwala bezpiecznie przećwiczyć bankomat.", quote: null }],
    noMatchReason: null,
  });
});

describe("POST /api/match", () => {
  it("answers with a contract-valid AI response and records area-only statistics", async () => {
    const res = await POST(post({ description: "Seniorzy boją się korzystać z bankomatu." }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(MatchResponse.safeParse(body).success).toBe(true);
    expect(body.picked_by).toBe("ai");
    expect(body.innovations[0].innovation.id).toBe("merkury");
    expect(insert).toHaveBeenCalledWith({
      area_id: "seniorzy",
      challenge_id: "uslugi-dla-starzejacych",
      match_quality: expect.any(String),
    });
    expect(JSON.stringify(insert.mock.calls)).not.toContain("bankomat");
  });

  it("tells in X-Match-Retrieval whether vectors were used", async () => {
    const hybrid = await POST(post({ description: "Seniorzy boją się korzystać z bankomatu." }));
    expect(hybrid.headers.get("X-Match-Retrieval")).toBe("hybrid");

    rpc
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: [], error: null });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const empty = await POST(post({ description: "Seniorzy boją się korzystać z bankomatu." }));
    expect(empty.headers.get("X-Match-Retrieval")).toBe("keywords; reason=no-vectors");
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("no-vectors"));
    warn.mockRestore();
  });

  it("ai: false skips the LLM and does not count as a search in the statistics", async () => {
    const res = await POST(
      post({ description: "Seniorzy boją się korzystać z bankomatu.", ai: false }),
    );
    expect((await res.json()).picked_by).toBe("search");
    expect(rerankMock).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  it("works without an LLM configured", async () => {
    vi.stubEnv("LLM_API_KEY", "");
    const body = await (
      await POST(post({ description: "Seniorzy boją się korzystać z bankomatu." }))
    ).json();
    expect(body.picked_by).toBe("search");
    expect(rerankMock).not.toHaveBeenCalled();
  });

  it("rejects a too short description in plain Polish", async () => {
    const res = await POST(post({ description: "pomoc" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/od 10 do 2000 znaków/);
  });

  it("over the daily per-user AI limit still searches, only without AI", async () => {
    quota.mockResolvedValue({ ok: false });
    const res = await POST(post({ description: "Seniorzy boją się korzystać z bankomatu." }));
    expect(res.status).toBe(200);
    expect((await res.json()).picked_by).toBe("search");
    expect(rerankMock).not.toHaveBeenCalled();
  });

  it("ranking-only requests do not use the daily AI limit", async () => {
    await POST(post({ description: "Seniorzy boją się korzystać z bankomatu.", ai: false }));
    expect(quota).not.toHaveBeenCalled();
  });

  it("limits AI queries to 20 per hour per IP, ranking-only requests separately", async () => {
    const headers = { "x-forwarded-for": "192.168.1.1" };
    for (let n = 0; n < 20; n++)
      await POST(post({ description: "Seniorzy i bankomat, opis." }, headers));
    const limited = await POST(post({ description: "Seniorzy i bankomat, opis." }, headers));
    expect(limited.status).toBe(429);
    expect(limited.headers.get("Retry-After")).toMatch(/^\d+$/);
    const searchOnly = await POST(
      post({ description: "Seniorzy i bankomat, opis.", ai: false }, headers),
    );
    expect(searchOnly.status).toBe(200);
  });
});
