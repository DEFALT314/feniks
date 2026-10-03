// Daily AI limit per signed-in user (#20), counted in the database by ai_usage_take()
// (migration 202610032130_ai_usage.sql), so it holds across server instances.
// Anonymous visitors have only the per-IP hourly limit (lib/ai/rate-limit.ts).
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Enough for a working day of real use (a search with AI, hints, an application draft, a few
// service cards), low enough that one account cannot burn the model budget.
export const AI_DAILY_LIMIT = 100;

export type DailyQuota = { ok: true; left: number | null } | { ok: false };

// Counts one AI request. A database error never blocks the user (the IP limit still applies).
export async function takeDailyQuota(
  db: SupabaseClient,
  limit = AI_DAILY_LIMIT,
): Promise<DailyQuota> {
  const { data, error } = await db.rpc("ai_usage_take", { p_limit: limit });
  if (error || typeof data !== "number") {
    console.error("ai_usage_take failed, not counted:", error?.message ?? "no number");
    return { ok: true, left: null };
  }
  return data < 0 ? { ok: false } : { ok: true, left: data };
}

// For the current request: signed-in users are counted, anonymous ones pass.
export async function dailyQuotaForCurrentUser(): Promise<DailyQuota> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return { ok: true, left: null };
  const user = await getCurrentUser();
  if (!user) return { ok: true, left: null };
  // ai_usage_take is not in the generated types yet (P4 regenerates lib/supabase/types.ts).
  return takeDailyQuota((await createClient()) as unknown as SupabaseClient);
}

export const DAILY_LIMIT_MESSAGE = `Na dziś wykorzystano limit ${AI_DAILY_LIMIT} próśb do asystenta AI. Spróbuj jutro.`;
