// GET /api/ai/calls – open calls for the application generator (#18). Contract: CallList in lib/contracts/ai.ts.
// Published calls from the calls table (ROPS edits them in /admin/calls).
// POST /api/ai/calls – the same calls ranked for the card as the author writes it (RankedCallList).
// No AI and no rate limit beyond the search: it reruns the ranking-only search of /match.
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ideaAreas, rankCalls } from "@/lib/ai/creator/call-fit";
import { openCalls } from "@/lib/ai/creator/open-calls";
import { jsonError } from "@/lib/ai/http";
import { searchDeps } from "@/lib/ai/matching/server";
import { RankCallsRequest } from "@/lib/contracts/ai";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  return NextResponse.json({ calls: await openCalls() });
}

export async function POST(request: Request) {
  if (!(await getCurrentUser())) return jsonError("Zaloguj się.", 401);
  const parsed = RankCallsRequest.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Brak treści pomysłu.", 400);
  const { idea } = parsed.data;
  const text = [idea.title, idea.description, idea.essence, idea.audience]
    .filter(Boolean)
    .join(". ");
  const db = (await createClient()) as unknown as SupabaseClient;
  const [calls, areas] = await Promise.all([
    openCalls(),
    searchDeps(db)
      .then((deps) => ideaAreas(text.slice(0, 2000), deps, idea.area_id))
      .catch(() => []),
  ]);
  return NextResponse.json({ calls: rankCalls(calls, areas), idea_areas: areas });
}
