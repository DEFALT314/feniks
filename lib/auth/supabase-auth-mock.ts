import type { SupabaseClient } from "@supabase/supabase-js";
import { vi } from "vitest";
import type { Database } from "@/lib/supabase/types";

type Result = { data?: unknown; error?: unknown };

// Minimal Supabase client mock for auth tests: auth methods plus a chainable profiles query.
export function mockAuthClient(opts: {
  user?: { id: string; email?: string } | null;
  getUserError?: unknown;
  profile?: Record<string, unknown> | null;
  signInWithOtp?: Result;
  verifyOtp?: Result;
}) {
  const query = {
    select: vi.fn(() => query),
    update: vi.fn(() => query),
    eq: vi.fn(() => query),
    is: vi.fn(() => Promise.resolve({ error: null })),
    maybeSingle: vi.fn(() => Promise.resolve({ data: opts.profile ?? null, error: null })),
  };
  const auth = {
    getUser: vi.fn(() =>
      Promise.resolve({ data: { user: opts.user ?? null }, error: opts.getUserError ?? null }),
    ),
    signInWithOtp: vi.fn(() => Promise.resolve({ data: {}, error: null, ...opts.signInWithOtp })),
    verifyOtp: vi.fn(() =>
      Promise.resolve({ data: { user: null }, error: null, ...opts.verifyOtp }),
    ),
  };
  const from = vi.fn(() => query);
  return { client: { auth, from } as unknown as SupabaseClient<Database>, auth, from, query };
}
