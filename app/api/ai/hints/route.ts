// POST /api/ai/hints – hints for the idea card fields (#18). Contract: lib/contracts/ai.ts.
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { hints } from "@/lib/ai/creator/creator";
import { aiFailure, jsonError, readAiRequest } from "@/lib/ai/http";
import { HintRequest } from "@/lib/contracts/ai";

// The creator lives under /my, so only signed-in users call this; a guest must not spend AI budget.
export async function POST(request: Request) {
  if (!(await getCurrentUser())) {
    return jsonError("Zaloguj się, aby skorzystać z asystenta AI.", 401);
  }
  const read = await readAiRequest(request, HintRequest);
  if ("response" in read) return read.response;
  try {
    return NextResponse.json(await hints(read.data));
  } catch (e) {
    return aiFailure(e);
  }
}
