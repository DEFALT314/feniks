// /api/messages – conversations with ROPS (#8). Contract: lib/contracts/messages.ts. Owner: P4.
// GET → the user's threads; POST NewMessageInput → reply (thread_id) or new thread (temat).
import { NextResponse } from "next/server";
import { messagingDeps } from "@/app/my/messages/_lib/deps";
import { NewMessageInput } from "@/lib/contracts/messages";
import { loadThreads, sendReply, startConversation } from "@/lib/messaging";

const SIGN_IN = { error: "Zaloguj się, żeby korzystać z wiadomości." };

export async function GET() {
  const deps = await messagingDeps();
  if (!deps) return NextResponse.json(SIGN_IN, { status: 401 });
  return NextResponse.json(await loadThreads(deps.supabase, deps.me.id));
}

export async function POST(request: Request) {
  const deps = await messagingDeps();
  if (!deps) return NextResponse.json(SIGN_IN, { status: 401 });
  const parsed = NewMessageInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Podaj rozmowę albo temat i treść wiadomości." },
      { status: 400 },
    );
  }
  const m = parsed.data;
  const result = m.thread_id
    ? await sendReply(deps, m.thread_id, m.tresc)
    : await startConversation(deps, { temat: m.temat, tresc: m.tresc, ideaId: m.idea_id ?? null });
  if (!result.ok) return NextResponse.json({ error: result.message }, { status: 400 });
  return NextResponse.json({ ok: true, thread_id: result.threadId });
}
