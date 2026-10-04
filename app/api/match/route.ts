// POST /api/match – Matchmaking (module I). Contract: lib/contracts/match.ts. Owner: P3.
// Pipeline: lib/ai/matching/pipeline.ts. Uses the session client (RLS), never the service key.
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { supabaseCache } from "@/lib/ai/cache";
import { retrievalHeader, runMatch, type MatchDeps } from "@/lib/ai/matching/pipeline";
import { rerank } from "@/lib/ai/matching/rerank";
import { searchDeps } from "@/lib/ai/matching/server";
import { clientIp, createRateLimiter } from "@/lib/ai/rate-limit";
import { dailyQuotaForCurrentUser } from "@/lib/ai/usage";
import { MatchRequest } from "@/lib/contracts/match";
import { createClient } from "@/lib/supabase/server";

// 20 AI queries per hour per IP (#15). The /match page first asks with ai: false (ranking only,
// no LLM cost) and then with AI, so ranking-only requests get their own, looser limit.
const aiLimiter = createRateLimiter(20, 60 * 60 * 1000);
const searchLimiter = createRateLimiter(120, 60 * 60 * 1000);

const databaseConfigured = () =>
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const llmConfigured = () =>
  Boolean(process.env.LLM_BASE_URL && process.env.LLM_MODEL && process.env.LLM_API_KEY);

export async function POST(request: Request) {
  const parsed = MatchRequest.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Opisz problem własnymi słowami: od 10 do 2000 znaków." },
      { status: 400 },
    );
  }
  const withAi = parsed.data.ai !== false;

  const limit = (withAi ? aiLimiter : searchLimiter)(clientIp(request.headers));
  if (!limit.ok) {
    const minutes = Math.ceil(limit.retryAfterSeconds / 60);
    return NextResponse.json(
      { error: `Za dużo zapytań. Spróbuj ponownie za ${minutes} min.` },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  // Over the daily per-user limit the search still works, only without the AI picks and reasons.
  const aiAllowed = withAi && llmConfigured() && (await dailyQuotaForCurrentUser()).ok;

  const supabase = databaseConfigured() ? await createClient() : null;
  // match_embeddings and match_queries come from 202610031900_ai_tables.sql, which is not in the
  // generated lib/supabase/types.ts yet (P4 regenerates it); untyped until then.
  const db = supabase as unknown as SupabaseClient | null;
  const deps: MatchDeps = {
    ...(await searchDeps(db)),
    rerank: aiAllowed
      ? (description, candidates, challenges) =>
          rerank(description, candidates, db ? { cache: supabaseCache(db) } : {}, challenges)
      : undefined,
  };

  const { response, stats, retrieval } = await runMatch(parsed.data, deps);
  if (retrieval.mode === "keywords") {
    console.warn(`match: keywords only (${retrieval.reason}), vectors not used`);
  }

  // Statistics for trends: area, challenge and quality only; the description is never stored.
  // Once per search: the ranking-only request that precedes the AI request is not counted.
  if (supabase && withAi) {
    const { error } = await db!.from("match_queries").insert(stats);
    if (error) console.error("match_queries insert failed:", error.message);
  }
  return NextResponse.json(response, {
    headers: { "X-Match-Retrieval": retrievalHeader(retrieval) },
  });
}
