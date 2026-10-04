import { beforeEach, describe, expect, it, vi } from "vitest";

const listPublishedCalls = vi.fn();
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }));
vi.mock("@/lib/calls", async (orig) => ({
  ...(await orig<typeof import("@/lib/calls")>()),
  listPublishedCalls: (...a: unknown[]) => listPublishedCalls(...a),
}));

const { GET, OPTIONS } = await import("./route");
const CALL = {
  id: "nabor-demo-seniorzy-2026",
  nazwa: "Wsparcie seniorów",
  organizator: "ROPS",
  cel: null,
  url: null,
  termin_od: null,
  termin_do: "2026-11-30",
  obszary: ["seniorzy"],
  opublikowany: true,
  demo: true,
};

describe("GET /api/calls", () => {
  beforeEach(() => listPublishedCalls.mockReset().mockResolvedValue([CALL]));

  it("returns published calls as JSON with CORS and caching headers", async () => {
    const res = await GET(new Request("http://x/api/calls?area=seniorzy"));
    expect(res.status).toBe(200);
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
    expect(res.headers.get("cache-control")).toContain("s-maxage");
    const body = await res.json();
    expect(body).toMatchObject({ count: 1, calls: [{ id: CALL.id }] });
    expect(listPublishedCalls).toHaveBeenCalledWith({}, { area: "seniorzy", status: "open" });
  });

  it("returns CSV on request", async () => {
    const res = await GET(new Request("http://x/api/calls?format=csv&status=all"));
    expect(res.headers.get("content-type")).toContain("text/csv");
    expect(await res.text()).toContain("nabor-demo-seniorzy-2026;Wsparcie seniorów");
    expect(listPublishedCalls).toHaveBeenCalledWith({}, { area: undefined, status: "all" });
  });

  it("rejects unknown parameter values and answers preflight", async () => {
    expect((await GET(new Request("http://x/api/calls?status=drafts"))).status).toBe(400);
    expect(OPTIONS().status).toBe(204);
  });
});
