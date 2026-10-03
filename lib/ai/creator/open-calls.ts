// Open calls for the application generator: the ones ROPS published in /admin/calls (lib/calls.ts),
// so a new call shows up in the creator without a deploy. If the database can't be read, the
// demo calls from data/derived/demo-calls.json keep the generator usable.
import "server-only";
import type { CallSummary } from "@/lib/contracts/ai";
import { listOpenCalls } from "@/lib/calls";
import { createClient } from "@/lib/supabase/server";
import { CALLS } from "./creator";

export async function openCalls(
  load: () => Promise<CallSummary[]> = async () => listOpenCalls(await createClient()),
): Promise<CallSummary[]> {
  try {
    return await load();
  } catch (e) {
    console.error("Open calls: using the demo list,", (e as Error).message);
    return CALLS;
  }
}
