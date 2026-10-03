import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { cacheKey, memoryCache, supabaseCache } = await import("./cache");

describe("cacheKey", () => {
  it("is stable for the same request and depends on the server secret", () => {
    const request = { model: "m", messages: [{ role: "user", content: "a" }] };
    expect(cacheKey("s1", request)).toBe(cacheKey("s1", request));
    expect(cacheKey("s1", request)).not.toBe(cacheKey("s2", request));
    expect(cacheKey("s1", request)).not.toBe(cacheKey("s1", { ...request, model: "n" }));
    expect(cacheKey("s1", request)).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("memoryCache", () => {
  it("returns stored values and null for missing keys", async () => {
    const cache = memoryCache();
    await cache.set("k", { a: 1 });
    expect(await cache.get("k")).toEqual({ a: 1 });
    expect(await cache.get("missing")).toBeNull();
  });

  it("drops the oldest entry when full", async () => {
    const cache = memoryCache(2);
    await cache.set("a", 1);
    await cache.set("b", 2);
    await cache.set("c", 3);
    expect(await cache.get("a")).toBeNull();
    expect(await cache.get("c")).toBe(3);
  });
});

describe("supabaseCache", () => {
  it("goes through the RPC functions, not the table", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { a: 1 }, error: null });
    const cache = supabaseCache({ rpc } as never);
    expect(await cache.get("k")).toEqual({ a: 1 });
    await cache.set("k", { a: 2 });
    expect(rpc).toHaveBeenNthCalledWith(1, "ai_cache_get", { p_key: "k" });
    expect(rpc).toHaveBeenNthCalledWith(2, "ai_cache_put", { p_key: "k", p_value: { a: 2 } });
  });

  it("treats a database error as a cache miss", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { message: "boom" } });
    expect(await supabaseCache({ rpc } as never).get("k")).toBeNull();
  });
});
