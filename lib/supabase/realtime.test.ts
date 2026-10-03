import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { authorizeRealtime } from "./realtime";

function client(token: string | null) {
  let listener: ((e: string, s: { access_token: string } | null) => void) | undefined;
  const unsubscribe = vi.fn();
  const c = {
    auth: {
      getSession: vi.fn(async () => ({
        data: { session: token ? { access_token: token } : null },
      })),
      onAuthStateChange: vi.fn((cb: typeof listener) => {
        listener = cb;
        return { data: { subscription: { unsubscribe } } };
      }),
    },
    realtime: { setAuth: vi.fn(async () => {}) },
  };
  return {
    c: c as unknown as Pick<SupabaseClient, "auth" | "realtime">,
    raw: c,
    emit: (t: string) => listener?.("TOKEN_REFRESHED", { access_token: t }),
    unsubscribe,
  };
}

describe("authorizeRealtime", () => {
  it("passes the session token to Realtime before subscribing", async () => {
    const { c, raw } = client("jwt-1");
    await authorizeRealtime(c);
    expect(raw.realtime.setAuth).toHaveBeenCalledWith("jwt-1");
  });

  it("updates the token when the session refreshes and cleans up", async () => {
    const { c, raw, emit, unsubscribe } = client("jwt-1");
    const cleanup = await authorizeRealtime(c);
    emit("jwt-2");
    expect(raw.realtime.setAuth).toHaveBeenLastCalledWith("jwt-2");
    cleanup();
    expect(unsubscribe).toHaveBeenCalled();
  });

  it("does nothing for a guest", async () => {
    const { c, raw } = client(null);
    await authorizeRealtime(c);
    expect(raw.realtime.setAuth).not.toHaveBeenCalled();
  });
});
