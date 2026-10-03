// PATCH /api/ai/middleman/[id] – edit a draft service card; every save is a new version (#19).
import { NextResponse } from "next/server";
import { editCard } from "@/lib/ai/middleman/service";
import { ServiceCardEdit } from "@/lib/contracts/middleman";
import { respond, SIGN_IN, signedInDeps } from "../deps";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const deps = await signedInDeps();
  if (!deps) return SIGN_IN.clone();
  const parsed = ServiceCardEdit.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Sprawdź pola karty: żadne nie może być puste." },
      { status: 400 },
    );
  }
  return respond(await editCard((await params).id, parsed.data, deps));
}
