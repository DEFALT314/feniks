// POST /api/ai/application – draft of a grant application for an open call (#18). Contract: lib/contracts/ai.ts.
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { applicationDraft } from "@/lib/ai/creator/creator";
import { aiFailure, jsonError, readAiRequest } from "@/lib/ai/http";
import { ApplicationRequest } from "@/lib/contracts/ai";

// The creator lives under /my, so only signed-in users call this; a guest must not spend AI budget.
export async function POST(request: Request) {
  if (!(await getCurrentUser())) {
    return jsonError("Zaloguj się, aby skorzystać z asystenta AI.", 401);
  }
  const read = await readAiRequest(request, ApplicationRequest);
  if ("response" in read) return read.response;
  try {
    const draft = await applicationDraft(read.data);
    return draft
      ? NextResponse.json(draft)
      : jsonError("Nie ma takiego naboru. Wybierz nabór z listy.", 404);
  } catch (e) {
    return aiFailure(e);
  }
}
