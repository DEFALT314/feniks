import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { editInnovation, type EditClient } from "./edit";

// PATCH /api/innovations/[id]: editing a card from the ROPS panel (contract: InnovationEdit → Innovation)
export async function PATCH(request: Request, ctx: RouteContext<"/api/innovations/[id]">) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.json({ error: "Baza danych nie jest skonfigurowana." }, { status: 503 });
  }
  const { id } = await ctx.params;
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: "Treść żądania musi być w formacie JSON." }, { status: 400 });
  }
  const client = (await createClient()) as unknown as EditClient;
  const result = await editInnovation(client, id, input);
  // Change log: zapiszAudit from lib/audit.ts (P4), once it is ready
  return NextResponse.json(result.body, { status: result.status });
}
