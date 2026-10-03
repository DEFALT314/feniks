import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApplicationResponse, CallList, HintResponse, ImageResponse } from "@/lib/contracts/ai";

vi.mock("server-only", () => ({}));

const generate = vi.fn();
vi.mock("@/lib/ai/llm", async (original) => ({
  ...(await original<typeof import("@/lib/ai/llm")>()),
  generateJson: (...args: unknown[]) => generate(...args),
}));

const { POST: hintsRoute } = await import("./hints/route");
const { POST: applicationRoute } = await import("./application/route");
const { POST: imageRoute } = await import("./image/route");
const { GET: callsRoute } = await import("./calls/route");
const { LlmError } = await import("@/lib/ai/llm");

const idea = {
  title: "Sąsiedzki dyżur",
  description: "Wolontariusze odwiedzają seniorów po szpitalu.",
};
let ip = 0;
const post = (body: unknown, fixedIp?: string) =>
  new Request("http://app/api/ai/x", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": fixedIp ?? `10.1.0.${++ip}` },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  generate.mockReset();
  vi.stubEnv("LLM_BASE_URL", "http://llm");
  vi.stubEnv("LLM_MODEL", "m");
  vi.stubEnv("LLM_API_KEY", "k");
});

describe("AI creator endpoints", () => {
  it("GET /api/ai/calls lists the demo calls", async () => {
    const body = await callsRoute().json();
    expect(CallList.safeParse(body).success).toBe(true);
    expect(body.calls.every((c: { demo: boolean }) => c.demo)).toBe(true);
  });

  it("hints answer with the contract shape", async () => {
    generate.mockResolvedValue({
      hints: [{ field: "audience", text: "Seniorzy po wypisie.", why: null }],
    });
    const res = await hintsRoute(post({ idea, fields: ["audience"] }));
    expect(HintResponse.safeParse(await res.json()).success).toBe(true);
  });

  it("application draft for an existing call; 404 for an unknown one", async () => {
    generate.mockResolvedValue({ sections: [{ key: "goal", text: "Wsparcie seniorów." }] });
    const ok = await applicationRoute(post({ idea, call_id: "nabor-demo-seniorzy-2026" }));
    expect(ApplicationResponse.safeParse(await ok.json()).success).toBe(true);
    const missing = await applicationRoute(post({ idea, call_id: "nie-ma" }));
    expect(missing.status).toBe(404);
  });

  it("image answers with a data URL and alt text", async () => {
    generate.mockResolvedValue({
      svg: '<svg viewBox="0 0 2 2"><rect width="2" height="2"/></svg>',
      alt_text: "Prostokąt.",
    });
    const body = await (await imageRoute(post({ idea }))).json();
    expect(ImageResponse.safeParse(body).success).toBe(true);
    expect(body.image_url).toMatch(/^data:image\/svg\+xml;base64,/);
  });

  it("rejects an invalid body in plain Polish", async () => {
    const res = await hintsRoute(post({ idea: { title: "" } }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/tytuł i opis/);
  });

  it("says the assistant is unavailable when no LLM is configured", async () => {
    vi.stubEnv("LLM_API_KEY", "");
    const res = await hintsRoute(post({ idea }));
    expect(res.status).toBe(503);
    expect(generate).not.toHaveBeenCalled();
  });

  it("maps model failures to a friendly message without internal details", async () => {
    generate.mockRejectedValue(new LlmError("LLM request failed: 402 balance", "request"));
    const res = await hintsRoute(post({ idea }));
    expect(res.status).toBe(503);
    expect(JSON.stringify(await res.json())).not.toContain("402");
  });

  it("limits AI requests per IP across the creator endpoints", async () => {
    generate.mockResolvedValue({ hints: [] });
    for (let n = 0; n < 30; n++) await hintsRoute(post({ idea }, "172.16.0.1"));
    const res = await imageRoute(post({ idea }, "172.16.0.1"));
    expect(res.status).toBe(429);
  });
});
