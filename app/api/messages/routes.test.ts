import { beforeEach, describe, expect, it, vi } from "vitest";

const messagingDeps = vi.fn();
const sendReply = vi.fn();
const startConversation = vi.fn();
const loadThreads = vi.fn();
vi.mock("server-only", () => ({}));
vi.mock("@/app/my/messages/_lib/deps", () => ({ messagingDeps: () => messagingDeps() }));
vi.mock("@/lib/messaging", () => ({
  sendReply: (...a: unknown[]) => sendReply(...a),
  startConversation: (...a: unknown[]) => startConversation(...a),
  loadThreads: (...a: unknown[]) => loadThreads(...a),
  loadThread: vi.fn(async () => null),
}));

const { GET, POST } = await import("./route");
const post = (body: unknown) =>
  new Request("http://x/api/messages", { method: "POST", body: JSON.stringify(body) });
const THREAD = "d4e5f6a7-0000-4000-8000-000000000001";

describe("/api/messages", () => {
  beforeEach(() => {
    messagingDeps.mockReset().mockResolvedValue({ supabase: {}, me: { id: "u1" } });
    sendReply.mockReset().mockResolvedValue({ ok: true, threadId: THREAD });
    startConversation.mockReset().mockResolvedValue({ ok: true, threadId: "t-new" });
    loadThreads.mockReset().mockResolvedValue([]);
  });

  it("requires a signed-in user", async () => {
    messagingDeps.mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
    expect((await POST(post({ temat: "a", tresc: "b" }))).status).toBe(401);
  });

  it("replies when thread_id is given and starts a thread otherwise", async () => {
    expect(await (await POST(post({ thread_id: THREAD, tresc: "Dzięki" }))).json()).toEqual({
      ok: true,
      thread_id: THREAD,
    });
    expect(sendReply).toHaveBeenCalledWith(expect.anything(), THREAD, "Dzięki");
    expect(await (await POST(post({ temat: "Pytanie", tresc: "Kiedy?" }))).json()).toEqual({
      ok: true,
      thread_id: "t-new",
    });
  });

  it("rejects a message without a thread or a subject", async () => {
    expect((await POST(post({ tresc: "x" }))).status).toBe(400);
    expect(sendReply).not.toHaveBeenCalled();
  });
});
