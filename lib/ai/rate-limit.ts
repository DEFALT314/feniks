// Sliding-window request limit per key (IP). Kept in memory, so it is per server instance:
// enough to stop a script hammering the AI from one machine; the daily per-user limits are #20.

export type RateLimiter = (key: string, now?: number) => { ok: boolean; retryAfterSeconds: number };

export function createRateLimiter(limit: number, windowMs: number, maxKeys = 10_000): RateLimiter {
  const hits = new Map<string, number[]>();
  return (key, now = Date.now()) => {
    const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
    if (recent.length >= limit) {
      hits.set(key, recent);
      return { ok: false, retryAfterSeconds: Math.ceil((recent[0] + windowMs - now) / 1000) };
    }
    recent.push(now);
    hits.delete(key); // re-insert to keep the map ordered by last use
    hits.set(key, recent);
    if (hits.size > maxKeys) hits.delete(hits.keys().next().value!);
    return { ok: true, retryAfterSeconds: 0 };
  };
}

export function clientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown"
  );
}
