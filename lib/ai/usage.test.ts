import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({ getCurrentUser: async () => null }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }));

const { takeDailyQuota, AI_DAILY_LIMIT } = await import("./usage");

const db = (result: { data: unknown; error: { message: string } | null }) => {
  const rpc = vi.fn().mockResolvedValue(result);
  return { client: { rpc } as unknown as SupabaseClient, rpc };
};

describe("takeDailyQuota", () => {
  it("counts the request with the daily limit and reports what is left", async () => {
    const { client, rpc } = db({ data: 41, error: null });
    await expect(takeDailyQuota(client)).resolves.toEqual({ ok: true, left: 41 });
    expect(rpc).toHaveBeenCalledWith("ai_usage_take", { p_limit: AI_DAILY_LIMIT });
  });

  it("refuses when the database says the limit is reached (-1)", async () => {
    const { client } = db({ data: -1, error: null });
    await expect(takeDailyQuota(client, 3)).resolves.toEqual({ ok: false });
  });

  it("never blocks the user when the database fails", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { client } = db({ data: null, error: { message: "function does not exist" } });
    await expect(takeDailyQuota(client)).resolves.toEqual({ ok: true, left: null });
    error.mockRestore();
  });
});
