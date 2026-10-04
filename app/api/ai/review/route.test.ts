import { beforeEach, describe, expect, it, vi } from "vitest";
import { innovationsFromFiles } from "@/app/library/_lib/from-files";
import { ReviewResponse } from "@/lib/contracts/ai";

vi.mock("server-only", () => ({}));

const generate = vi.fn();
vi.mock("@/lib/ai/llm", async (original) => ({
  ...(await original<typeof import("@/lib/ai/llm")>()),
  generateJson: (...args: unknown[]) => generate(...args),
}));
vi.mock("@/lib/ai/usage", async (original) => ({
  ...(await original<typeof import("@/lib/ai/usage")>()),
  dailyQuotaForCurrentUser: async () => ({ ok: true, left: null }),
}));
const currentUser = vi.fn();
vi.mock("@/lib/auth", () => ({ getCurrentUser: () => currentUser() }));

// idea_canvas rows as RLS returns them for the author; one row no longer fits its field
const canvasRows = vi.fn();
const eq = vi.fn(async () => canvasRows());
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ from: () => ({ select: () => ({ eq }) }), rpc: vi.fn() }),
}));
// The Library search on files, keywords only (no vectors in unit tests)
vi.mock("@/lib/ai/matching/server", () => ({
  searchDeps: async () => ({
    innovations: innovationsFromFiles(),
    areas: [],
    embedQuery: async () => null,
    vectorSearch: async () => [],
  }),
}));

const { POST } = await import("./route");

const idea = {
  title: "Ćwiczenia z bankomatem dla seniorów",
  description:
    "Seniorzy boją się korzystać z bankomatu i płacić kartą. Uczymy ich na makiecie bankomatu w klubie seniora.",
};
let ip = 0;
const post = (body: unknown) =>
  new Request("http://app/api/ai/review", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": `10.2.0.${++ip}` },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  currentUser.mockReset().mockResolvedValue({ id: "u1", role: "mieszkaniec" });
  canvasRows.mockReset().mockReturnValue({
    data: [
      { pole_id: "glowny-dochod", odpowiedz: { choice: "Nie wiemy jeszcze", text: "" } },
      { pole_id: "intensywnosc", odpowiedz: { choice: "To nie jest opcja" } },
    ],
    error: null,
  });
  generate.mockReset().mockResolvedValue({ checks: [] });
  eq.mockClear();
  vi.stubEnv("LLM_BASE_URL", "http://llm");
  vi.stubEnv("LLM_MODEL", "m");
  vi.stubEnv("LLM_API_KEY", "k");
});

describe("POST /api/ai/review", () => {
  it("reads the canvas of the idea, finds similar innovations and answers with the contract", async () => {
    const res = await POST(post({ idea, idea_id: "30cfff84-f3d1-4750-bf7a-9e4951bdd378" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(ReviewResponse.safeParse(body).success).toBe(true);
    expect(eq).toHaveBeenCalledWith("idea_id", "30cfff84-f3d1-4750-bf7a-9e4951bdd378");
    // the valid answer is used, the stale one is skipped
    expect(body.progress.canvas_answered).toBe(1);
    expect(body.checks.map((c: { id: string }) => c.id)).toContain("kto-zaplaci");
    expect(body.similar.map((s: { id: string }) => s.id)).toContain("merkury");
    // the model got the similar innovation to compare with
    expect(JSON.stringify(generate.mock.calls[0][1])).toContain('\\"id\\":\\"merkury\\"');
  });

  it("works for an unsaved card (no canvas)", async () => {
    const body = await (await POST(post({ idea }))).json();
    expect(eq).not.toHaveBeenCalled();
    expect(body.progress.canvas_answered).toBe(0);
  });

  it("is for signed-in users only", async () => {
    currentUser.mockResolvedValue(null);
    const res = await POST(post({ idea }));
    expect(res.status).toBe(401);
    expect(generate).not.toHaveBeenCalled();
  });

  it("answers in plain Polish when the model fails", async () => {
    const { LlmError } = await import("@/lib/ai/llm");
    generate.mockRejectedValue(new LlmError("down", "request"));
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const res = await POST(post({ idea }));
    expect(res.status).toBe(503);
    expect((await res.json()).error).toMatch(/nie odpowiada/);
  });
});
