import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

// Public catalog data (areas, challenges, personas, categories, published innovations) is the same
// for every visitor, so it is cached across requests instead of read on every page render
export const CATALOG_TAG = "catalog";
export const CATALOG_REVALIDATE_SECONDS = 60;

// A database that does not answer must not hang the page: give up and fall back to data/rops
const DB_TIMEOUT_MS = 5000;

export const isDatabaseConfigured = () =>
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const fetchWithTimeout: typeof fetch = (input, init) => {
  const timeout = AbortSignal.timeout(DB_TIMEOUT_MS);
  const signal = init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
  return fetch(input, { ...init, signal });
};

// Client without cookies, so it can run inside unstable_cache; RLS gives it what an anonymous
// visitor may see
export function createPublicClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: fetchWithTimeout },
    },
  );
}
