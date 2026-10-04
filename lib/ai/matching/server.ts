// Wiring of the matching pipeline to the app: the Library catalog (P1), the Challenges Map and the
// vectors in Supabase, all read with the user's session (RLS). Used by /api/match and by
// "Sprawdź fiszkę" (/api/ai/review) to find similar innovations the same way.
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getChallengeAreas } from "@/app/challenge-map/_lib/data";
import { getInnovations } from "@/app/library/_lib/data";
import { embedQuery } from "../embed";
import type { MatchDeps, VectorHit } from "./pipeline";

// db = null (no database configured): keywords only, no vectors.
export async function searchDeps(db: SupabaseClient | null): Promise<MatchDeps> {
  const [innovations, areas] = await Promise.all([getInnovations(), getChallengeAreas()]);
  return {
    innovations,
    areas,
    embedQuery: (text) => (db ? embedQuery(text) : Promise.resolve(null)),
    vectorSearch: async (vector, kind, count) => {
      // match_embeddings comes from 202610031900_ai_tables.sql (not in the generated types yet).
      const { data, error } = await db!.rpc("match_embeddings", {
        query: `[${vector.join(",")}]`,
        match_kind: kind,
        match_count: count,
      });
      if (error) throw new Error(error.message);
      return (data ?? []) as VectorHit[];
    },
  };
}
