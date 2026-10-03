// Cache of AI responses (CLAUDE.md issue #13: table ai_cache).
// Keys are HMAC-SHA256 of the request with a server secret, so a client holding the public
// Supabase key can neither guess a key to read someone's cached answer nor plant a fake answer
// for a real request. The table is reachable only through two RPC functions (see the migration).
import "server-only";
import { createHmac } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface AiCache {
  get(key: string): Promise<unknown | null>;
  set(key: string, value: unknown): Promise<void>;
}

export function cacheKey(secret: string, request: unknown): string {
  return createHmac("sha256", secret).update(JSON.stringify(request)).digest("hex");
}

// Per-instance cache: for tests, scripts and as a fallback when the database is unavailable.
export function memoryCache(maxEntries = 500): AiCache {
  const entries = new Map<string, unknown>();
  return {
    async get(key) {
      return entries.has(key) ? entries.get(key)! : null;
    },
    async set(key, value) {
      if (entries.size >= maxEntries) entries.delete(entries.keys().next().value!);
      entries.set(key, value);
    },
  };
}

// Cache in Supabase through the session client (CLAUDE.md, rule 3). Errors never break an AI call.
export function supabaseCache(client: SupabaseClient): AiCache {
  return {
    async get(key) {
      const { data, error } = await client.rpc("ai_cache_get", { p_key: key });
      return error ? null : (data ?? null);
    },
    async set(key, value) {
      await client.rpc("ai_cache_put", { p_key: key, p_value: value });
    },
  };
}
