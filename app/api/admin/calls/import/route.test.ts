import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUser = vi.fn();
const importCalls = vi.fn();
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({
  getCurrentUser: () => getCurrentUser(),
  isRopsRole: (r: string) => r === "rops_admin" || r === "rops_redaktor",
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }));
vi.mock("@/lib/audit", () => ({ writeAudit: vi.fn() }));
vi.mock("@/lib/calls", () => ({ importCalls: (...a: unknown[]) => importCalls(...a) }));

const { POST } = await import("./route");
const post = (body: unknown) =>
  new Request("http://x/api/admin/calls/import", { method: "POST", body: JSON.stringify(body) });

describe("POST /api/admin/calls/import", () => {
  beforeEach(() => {
    getCurrentUser.mockReset().mockResolvedValue({ id: "u1", role: "rops_admin" });
    importCalls.mockReset().mockResolvedValue({ created: 1, updated: 0, errors: [] });
  });

  it("is for ROPS only", async () => {
    getCurrentUser.mockResolvedValue(null);
    expect((await POST(post({ calls: [{ id: "a", nazwa: "b" }] }))).status).toBe(401);
    getCurrentUser.mockResolvedValue({ id: "u2", role: "ngo" });
    expect((await POST(post({ calls: [{ id: "a", nazwa: "b" }] }))).status).toBe(403);
    expect(importCalls).not.toHaveBeenCalled();
  });

  it("validates the body and returns the import result", async () => {
    expect((await POST(post({ calls: [] }))).status).toBe(400);
    const res = await POST(post({ calls: [{ id: "nabor-nowy-2027", nazwa: "Nowy" }] }));
    expect(await res.json()).toEqual({ created: 1, updated: 0, errors: [] });
  });
});
