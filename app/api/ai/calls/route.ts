// GET /api/ai/calls – open calls for the application generator (#18). Contract: CallList in lib/contracts/ai.ts.
// Demo calls from data/derived/demo-calls.json until P4 adds a calls table.
import { NextResponse } from "next/server";
import { CALLS } from "@/lib/ai/creator/creator";

export function GET() {
  return NextResponse.json({ calls: CALLS });
}
