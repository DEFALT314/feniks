// POST /api/ai/application – draft of a grant application for an open call (#18). Contract: lib/contracts/ai.ts.
import { NextResponse } from "next/server";
import { applicationDraft } from "@/lib/ai/creator/creator";
import { openCalls } from "@/lib/ai/creator/open-calls";
import { aiFailure, jsonError, readAiRequest } from "@/lib/ai/http";
import { ApplicationRequest } from "@/lib/contracts/ai";

export async function POST(request: Request) {
  const read = await readAiRequest(request, ApplicationRequest);
  if ("response" in read) return read.response;
  try {
    const draft = await applicationDraft(read.data, {}, await openCalls());
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
