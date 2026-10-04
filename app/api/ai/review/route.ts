// POST /api/ai/review – "Sprawdź fiszkę": what to change on the idea card, each point with evidence
// (lib/ai/creator/review.ts). Contract: lib/contracts/ai.ts (ReviewRequest, ReviewResponse).
// The canvas answers are read with the author's session, so RLS returns them only for their own
// idea (or to ROPS and experts); the similar innovations come from the same search as /match.
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { supabaseCache } from "@/lib/ai/cache";
import { canvasAnswers } from "@/lib/ai/creator/canvas-store";
import { reviewIdea, reviewSearchText } from "@/lib/ai/creator/review";
import { aiFailure, jsonError, readAiRequest } from "@/lib/ai/http";
import { runMatch } from "@/lib/ai/matching/pipeline";
import { searchDeps } from "@/lib/ai/matching/server";
import { ReviewRequest } from "@/lib/contracts/ai";
import type { Innovation } from "@/lib/contracts/knowledge-base";
import { createClient } from "@/lib/supabase/server";

// Up to 3 innovations from the Library that the search finds clearly similar (ranking only).
async function similarInnovations(db: SupabaseClient, text: string): Promise<Innovation[]> {
  if (text.length < 10) return [];
  const deps = await searchDeps(db);
  const { response } = await runMatch({ description: text, ai: false }, deps);
  if (response.match_quality === "weak") return [];
  const byId = new Map(deps.innovations.map((i) => [i.id, i]));
  return response.innovations.flatMap((m) => byId.get(m.innovation.id) ?? []).slice(0, 3);
}

export async function POST(request: Request) {
  if (!(await getCurrentUser())) {
    return jsonError("Zaloguj się, aby skorzystać z asystenta AI.", 401);
  }
  const read = await readAiRequest(request, ReviewRequest);
  if ("response" in read) return read.response;
  const db = (await createClient()) as unknown as SupabaseClient;
  try {
    const [answers, similar] = await Promise.all([
      canvasAnswers(db, read.data.idea_id),
      similarInnovations(db, reviewSearchText(read.data.idea)).catch((e) => {
        console.error("review: similar search failed:", (e as Error).message);
        return [];
      }),
    ]);
    return NextResponse.json(
      await reviewIdea(read.data.idea, { answers, similar, llm: { cache: supabaseCache(db) } }),
    );
  } catch (e) {
    return aiFailure(e);
  }
}
