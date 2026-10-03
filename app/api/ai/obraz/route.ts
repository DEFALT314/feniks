// POST /api/ai/obraz – a simple illustration of the idea (#18). Contract: lib/contracts/ai.ts.
// Drawn as SVG by the language model (free) and sanitized; returned as a data URL with alt text.
import { NextResponse } from "next/server";
import { visualisation } from "@/lib/ai/creator/creator";
import { aiFailure, readAiRequest } from "@/lib/ai/http";
import { ImageRequest } from "@/lib/contracts/ai";

export async function POST(request: Request) {
  const read = await readAiRequest(request, ImageRequest);
  if ("response" in read) return read.response;
  try {
    return NextResponse.json(await visualisation(read.data.idea));
  } catch (e) {
    return aiFailure(e);
  }
}
