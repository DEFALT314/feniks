import { describe, expect, it } from "vitest";
import { clientIp, createRateLimiter } from "./rate-limit";

describe("createRateLimiter", () => {
  it("allows up to the limit per window, then reports when to retry", () => {
    const limit = createRateLimiter(2, 60_000);
    expect(limit("ip", 0).ok).toBe(true);
    expect(limit("ip", 1_000).ok).toBe(true);
    expect(limit("ip", 2_000)).toEqual({ ok: false, retryAfterSeconds: 58 });
    expect(limit("other", 2_000).ok).toBe(true);
    expect(limit("ip", 60_001).ok).toBe(true); // the first hit left the window
  });

  it("forgets the least recently used keys when full", () => {
    const limit = createRateLimiter(1, 60_000, 2);
    limit("a", 0);
    limit("b", 0);
    limit("c", 0);
    expect(limit("a", 1).ok).toBe(true); // "a" was evicted
  });
});

describe("clientIp", () => {
  it("takes the first address from x-forwarded-for", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "1.2.3.4, 10.0.0.1" }))).toBe("1.2.3.4");
    expect(clientIp(new Headers())).toBe("unknown");
  });
});
