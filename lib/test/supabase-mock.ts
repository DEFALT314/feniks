import type { SupabaseClient } from "@supabase/supabase-js";
import { vi } from "vitest";
import type { Database } from "@/lib/supabase/types";

// Supabase client mock for tests: rpc() resolves with the given response and records calls.
export function mockRpcClient(response: { data?: unknown; error?: { message: string } | null }) {
  const rpc = vi
    .fn()
    .mockResolvedValue({ data: response.data ?? null, error: response.error ?? null });
  return { client: { rpc } as unknown as SupabaseClient<Database>, rpc };
}
