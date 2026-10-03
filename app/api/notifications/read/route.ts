// POST /api/notifications/read { ids?: uuid[] } – mark own notifications as read (#7).
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { MarkReadInput } from "@/lib/contracts/notifications";
import { markRead } from "@/lib/notification-feed";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  if (!(await getCurrentUser())) {
    return NextResponse.json({ error: "Zaloguj się." }, { status: 401 });
  }
  const parsed = MarkReadInput.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Złe dane." }, { status: 400 });
  try {
    await markRead(await createClient(), parsed.data.ids);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Nie udało się zapisać." }, { status: 500 });
  }
}
