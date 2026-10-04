// POST /api/ai/alternatives – unusual ways to solve the idea's problem (#103). Contract: lib/contracts/ai.ts.
import { NextResponse } from "next/server";
import { alternatives } from "@/lib/ai/creator/creator";
import { aiFailure, readAiRequest } from "@/lib/ai/http";
import { AlternativesRequest } from "@/lib/contracts/ai";

export async function POST(request: Request) {
  const read = await readAiRequest(request, AlternativesRequest);
  if ("response" in read) return read.response;
  try {
    return NextResponse.json(await alternatives(read.data));
  } catch (e) {
    return aiFailure(e);
  }
}
