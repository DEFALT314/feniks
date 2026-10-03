// POST /api/ai/middleman/[id]/send – send the card to ROPS for consultation; notifies ROPS staff (#19).
import { sendCard } from "@/lib/ai/middleman/service";
import { respond, SIGN_IN, signedInDeps } from "../../deps";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const deps = await signedInDeps();
  if (!deps) return SIGN_IN.clone();
  return respond(await sendCard((await params).id, deps));
}
