// POST /api/admin/calls/import – import calls from an external grant database (ROPS only, P4).
// Body: CallImportRequest { calls: [...] } (lib/contracts/admin.ts). New calls arrive switched off,
// so ROPS reviews them in /admin/calls before they become public; existing ids are updated.
import { NextResponse } from "next/server";
import { getCurrentUser, isRopsRole } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { importCalls } from "@/lib/calls";
import { CallImportRequest } from "@/lib/contracts/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Zaloguj się." }, { status: 401 });
  if (!isRopsRole(user.role)) {
    return NextResponse.json(
      { error: "Import naborów jest dostępny tylko dla ROPS." },
      { status: 403 },
    );
  }
  const parsed = CallImportRequest.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Oczekiwano { calls: [...] } z 1–200 naborami (id, nazwa, terminy, obszary)." },
      { status: 400 },
    );
  }
  const supabase = await createClient();
  const result = await importCalls(
    { supabase, writeAudit: (e) => writeAudit(e, supabase) },
    parsed.data,
  );
  return NextResponse.json(result);
}
