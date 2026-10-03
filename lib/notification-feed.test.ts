import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import type { Database } from "@/lib/supabase/types";
import { loadNotifications, markRead, unreadCount } from "./notification-feed";

function client(opts: { rows?: unknown[]; count?: number; error?: string } = {}) {
  const calls: Record<string, unknown[]> = {};
  const q: Record<string, unknown> = {};
  for (const m of ["select", "order", "update", "eq", "in"]) {
    q[m] = vi.fn((...args: unknown[]) => {
      calls[m] = args;
      return q;
    });
  }
  q.limit = vi.fn(async () => ({
    data: opts.rows ?? [],
    error: opts.error ? { message: opts.error } : null,
  }));
  q.then = (resolve: (v: unknown) => void) =>
    resolve({ count: opts.count ?? 0, error: opts.error ? { message: opts.error } : null });
  const from = vi.fn(() => q);
  return { c: { from } as unknown as SupabaseClient<Database>, q, calls };
}

describe("notification feed", () => {
  it("returns the list and the unread count", async () => {
    const { c } = client({ rows: [{ id: "a" }], count: 3 });
    expect(await loadNotifications(c)).toEqual({ powiadomienia: [{ id: "a" }], nieprzeczytane: 3 });
  });

  it("unreadCount is 0 on errors so the header never breaks", async () => {
    expect(await unreadCount(client({ error: "boom" }).c)).toBe(0);
    expect(await unreadCount(client({ count: 5 }).c)).toBe(5);
  });

  it("marks only the given ids, or all unread ones", async () => {
    const some = client();
    await markRead(some.c, ["a", "b"]);
    expect(some.q.update).toHaveBeenCalledWith({ przeczytane: true });
    expect(some.q.in).toHaveBeenCalledWith("id", ["a", "b"]);

    const all = client();
    await markRead(all.c);
    expect(all.q.in).not.toHaveBeenCalled();
  });
});
