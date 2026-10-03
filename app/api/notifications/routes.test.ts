import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUser = vi.fn();
const loadNotifications = vi.fn();
const markRead = vi.fn();
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({ getCurrentUser: () => getCurrentUser() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }));
vi.mock("@/lib/notification-feed", () => ({
  loadNotifications: (...a: unknown[]) => loadNotifications(...a),
  markRead: (...a: unknown[]) => markRead(...a),
}));

const list = await import("./route");
const read = await import("./read/route");
const post = (body: unknown) =>
  new Request("http://x/api/notifications/read", { method: "POST", body: JSON.stringify(body) });

describe("/api/notifications", () => {
  beforeEach(() => {
    getCurrentUser.mockReset().mockResolvedValue({ id: "u1" });
    loadNotifications.mockReset().mockResolvedValue({ powiadomienia: [], nieprzeczytane: 0 });
    markRead.mockReset().mockResolvedValue(undefined);
  });

  it("requires a signed-in user", async () => {
    getCurrentUser.mockResolvedValue(null);
    expect((await list.GET()).status).toBe(401);
    expect((await read.POST(post({}))).status).toBe(401);
    expect(loadNotifications).not.toHaveBeenCalled();
    expect(markRead).not.toHaveBeenCalled();
  });

  it("returns the user's notifications", async () => {
    const res = await list.GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ powiadomienia: [], nieprzeczytane: 0 });
  });

  it("marks given ids or all as read and validates ids", async () => {
    const id = "6f1c2b9a-0d3e-4a5b-8c7d-1e2f3a4b5c6d";
    expect((await read.POST(post({ ids: [id] }))).status).toBe(200);
    expect(markRead).toHaveBeenCalledWith({}, [id]);
    expect((await read.POST(post({}))).status).toBe(200);
    expect(markRead).toHaveBeenLastCalledWith({}, undefined);
    expect((await read.POST(post({ ids: ["nope"] }))).status).toBe(400);
  });
});
