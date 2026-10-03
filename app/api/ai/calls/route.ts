// GET /api/ai/calls – open calls for the application generator (#18). Contract: CallList in lib/contracts/ai.ts.
// Published calls from the calls table (ROPS edits them in /admin/calls).
import { NextResponse } from "next/server";
import { openCalls } from "@/lib/ai/creator/open-calls";

export async function GET() {
  return NextResponse.json({ calls: await openCalls() });
}
