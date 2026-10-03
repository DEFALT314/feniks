// GET /api/messages/[threadId] – one conversation with its messages (#8).
import { NextResponse } from "next/server";
import { messagingDeps } from "@/app/my/messages/_lib/deps";
import { loadThread } from "@/lib/messaging";

export async function GET(_request: Request, { params }: RouteContext<"/api/messages/[threadId]">) {
  const deps = await messagingDeps();
  if (!deps) return NextResponse.json({ error: "Zaloguj się." }, { status: 401 });
  const thread = await loadThread(deps.supabase, (await params).threadId, deps.me.id);
  if (!thread) return NextResponse.json({ error: "Nie znaleziono rozmowy." }, { status: 404 });
  return NextResponse.json(thread);
}
