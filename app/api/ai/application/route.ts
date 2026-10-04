// POST /api/ai/application – draft of a grant application for an open call (#18). Contract: lib/contracts/ai.ts.
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { canvasAnswers } from "@/lib/ai/creator/canvas-store";
import { applicationDraft } from "@/lib/ai/creator/creator";
import { openCalls } from "@/lib/ai/creator/open-calls";
import { aiFailure, jsonError, readAiRequest } from "@/lib/ai/http";
import { ApplicationRequest } from "@/lib/contracts/ai";
import { createClient } from "@/lib/supabase/server";

// The creator lives under /my, so only signed-in users call this; a guest must not spend AI budget.
export async function POST(request: Request) {
  if (!(await getCurrentUser())) {
    return jsonError("Zaloguj się, aby skorzystać z asystenta AI.", 401);
  }
  const read = await readAiRequest(request, ApplicationRequest);
  if ("response" in read) return read.response;
  try {
    // The author's canvas answers (costs, partners, audience, impact) ground the draft.
    const ideaId = read.data.idea_id;
    const [calls, answers] = await Promise.all([
      openCalls(),
      ideaId
        ? createClient().then((db) => canvasAnswers(db as unknown as SupabaseClient, ideaId))
        : {},
    ]);
    const draft = await applicationDraft(read.data, {}, calls, answers);
    return draft
      ? NextResponse.json(draft)
      : jsonError(
          "Ten nabór jest już zamknięty albo nie istnieje. Odśwież stronę i wybierz nabór z listy.",
          404,
        );
  } catch (e) {
    return aiFailure(e);
  }
}
