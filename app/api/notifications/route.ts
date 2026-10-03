// GET /api/notifications – the signed-in user's notifications (#7). Contract: lib/contracts/notifications.ts.
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { loadNotifications } from "@/lib/notification-feed";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  if (!(await getCurrentUser())) {
    return NextResponse.json(
      { error: "Zaloguj się, żeby zobaczyć powiadomienia." },
      { status: 401 },
    );
  }
  try {
    return NextResponse.json(await loadNotifications(await createClient()));
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Nie udało się wczytać powiadomień." }, { status: 500 });
  }
}
