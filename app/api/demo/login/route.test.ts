import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const signInAsDemo = vi.fn();
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/demo-login", () => ({ signInAsDemo: (...a: unknown[]) => signInAsDemo(...a) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn(async () => ({})) }));
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: vi.fn(() => ({})) }));

const { POST } = await import("./route");

const json = (body: unknown) =>
  new Request("http://localhost/api/demo/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

const form = (konto: string) =>
  new Request("http://localhost/api/demo/login", {
    method: "POST",
    body: new URLSearchParams({ konto }),
  });

describe("POST /api/demo/login", () => {
  beforeEach(() => {
    signInAsDemo.mockReset().mockResolvedValue(undefined);
    vi.stubEnv("DEMO_MODE", "true");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("does not exist outside demo mode", async () => {
    vi.stubEnv("DEMO_MODE", "false");
    const res = await POST(json({ konto: "rops" }));
    expect(res.status).toBe(404);
    expect(signInAsDemo).not.toHaveBeenCalled();
  });

  it("rejects an unknown account", async () => {
    const res = await POST(json({ konto: "superadmin" }));
    expect(res.status).toBe(400);
    expect(signInAsDemo).not.toHaveBeenCalled();
  });

  it("signs in from JSON and returns the start page", async () => {
    const res = await POST(json({ konto: "rops" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, next: "/admin" });
    expect(signInAsDemo).toHaveBeenCalledWith(
      {},
      {},
      expect.objectContaining({ email: "demo.rops@example.org" }),
    );
  });

  it("redirects a plain form submit to the account's start page", async () => {
    const res = await POST(form("mieszkaniec"));
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("http://localhost/match");
  });

  it("sends a failed form submit back to /login with an error", async () => {
    signInAsDemo.mockRejectedValue(new Error("boom"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await POST(form("ngo"));
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("http://localhost/login?error=demo");
  });
});
