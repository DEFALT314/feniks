// POST /api/match – Matchmaking (module I). Contract: lib/contracts/match.ts. Owner: P3.
// Pipeline: lib/ai/matching/pipeline.ts. Uses the session client (RLS), never the service key.
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getInnovations } from "@/app/library/_lib/data";
import { getChallengeAreas } from "@/app/challenge-map/_lib/data";
import { supabaseCache } from "@/lib/ai/cache";
import { embedQuery } from "@/lib/ai/embed";
import { runMatch, type MatchDeps, type VectorHit } from "@/lib/ai/matching/pipeline";
import { rerank } from "@/lib/ai/matching/rerank";
import { clientIp, createRateLimiter } from "@/lib/ai/rate-limit";
import { MatchRequest } from "@/lib/contracts/match";
import { createClient } from "@/lib/supabase/server";

const limiter = createRateLimiter(20, 60 * 60 * 1000); // 20 queries per hour per IP (#15)

const databaseConfigured = () =>
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const llmConfigured = () =>
  Boolean(process.env.LLM_BASE_URL && process.env.LLM_MODEL && process.env.LLM_API_KEY);

export async function POST(request: Request) {
  const limit = limiter(clientIp(request.headers));
  if (!limit.ok) {
    const minutes = Math.ceil(limit.retryAfterSeconds / 60);
    return NextResponse.json(
      { error: `Za dużo zapytań. Spróbuj ponownie za ${minutes} min.` },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const parsed = MatchRequest.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Opisz problem własnymi słowami: od 10 do 2000 znaków." },
      { status: 400 },
    );
  }

  const supabase = databaseConfigured() ? await createClient() : null;
  // match_embeddings and match_queries come from 202610031900_ai_tables.sql, which is not in the
  // generated lib/supabase/types.ts yet (P4 regenerates it); untyped until then.
  const db = supabase as unknown as SupabaseClient | null;
  const [innovations, areas] = await Promise.all([getInnovations(), getChallengeAreas()]);

  const deps: MatchDeps = {
    innovations,
    areas,
    embedQuery: (text) => (supabase ? embedQuery(text) : Promise.resolve(null)),
    vectorSearch: async (vector, kind, count) => {
      const { data, error } = await db!.rpc("match_embeddings", {
        query: `[${vector.join(",")}]`,
        match_kind: kind,
        match_count: count,
      });
      if (error) throw new Error(error.message);
      return (data ?? []) as VectorHit[];
    },
    rerank:
      parsed.data.ai !== false && llmConfigured()
        ? (description, candidates) =>
            rerank(description, candidates, db ? { cache: supabaseCache(db) } : {})
        : undefined,
  };

  const { response, stats } = await runMatch(parsed.data, deps);

  // Statistics for trends: area, challenge and quality only; the description is never stored.
  if (supabase) {
    const { error } = await db!.from("match_queries").insert(stats);
    if (error) console.error("match_queries insert failed:", error.message);
  }
  return NextResponse.json(response);
}
