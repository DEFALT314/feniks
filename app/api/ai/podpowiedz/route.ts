// POST /api/ai/podpowiedz – hints for the idea card fields (#18). Contract: lib/contracts/ai.ts.
import { NextResponse } from "next/server";
import { hints } from "@/lib/ai/creator/creator";
import { aiFailure, readAiRequest } from "@/lib/ai/http";
import { HintRequest } from "@/lib/contracts/ai";

export async function POST(request: Request) {
  const read = await readAiRequest(request, HintRequest);
  if ("response" in read) return read.response;
  try {
    return NextResponse.json(await hints(read.data));
  } catch (e) {
    return aiFailure(e);
  }
}
