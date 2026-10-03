import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { edytujInnowacje, type KlientEdycji } from "./edycja";

// PATCH /api/zasoby/innowacje/[id]: edycja karty z panelu ROPS (kontrakt: EdycjaInnowacji → Innowacja)
export async function PATCH(request: Request, ctx: RouteContext<"/api/zasoby/innowacje/[id]">) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.json({ blad: "Baza danych nie jest skonfigurowana." }, { status: 503 });
  }
  const { id } = await ctx.params;
  let dane: unknown;
  try {
    dane = await request.json();
  } catch {
    return NextResponse.json({ blad: "Treść żądania musi być w formacie JSON." }, { status: 400 });
  }
  const klient = (await createClient()) as unknown as KlientEdycji;
  const wynik = await edytujInnowacje(klient, id, dane);
  // Dziennik zmian: zapiszAudit z lib/audit.ts (P4), gdy będzie gotowe
  return NextResponse.json(wynik.body, { status: wynik.status });
}
