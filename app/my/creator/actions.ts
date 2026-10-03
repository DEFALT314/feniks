"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import type { CanvasAnswer, IdeaCardInput } from "@/lib/contracts/idea-creator";
import { addNotification } from "@/lib/notifications";
import { createClient } from "@/lib/supabase/server";
import { fields } from "./_lib/canvas";
import {
  createIdea,
  getMyIdea,
  sendIdea,
  saveAnswer,
  saveCard,
  type SaveResult,
} from "./_lib/ideas";
import { submitIdea, type SubmitState } from "./_lib/submit";

// Server actions are public endpoints: each one checks the session itself. RLS limits every query
// to the author's own ideas as a second line of defence.
const SIGN_IN = { ok: false, error: "Zaloguj się ponownie, żeby zapisać zmiany." } as const;

export type NewIdeaState = { error?: string; title?: string };

export async function startIdea(_prev: NewIdeaState, formData: FormData): Promise<NewIdeaState> {
  const title = String(formData.get("title") ?? "");
  if (!(await getCurrentUser())) return { error: SIGN_IN.error, title };
  const result = await createIdea(await createClient(), title);
  if (!result.ok) return { error: result.error, title };
  revalidatePath("/my/creator");
  redirect(`/my/creator/${result.id}?step=${fields[0].id}`);
}

export async function saveCanvasAnswer(
  ideaId: string,
  fieldId: string,
  answer: CanvasAnswer | null,
): Promise<SaveResult> {
  const user = await getCurrentUser();
  if (!user) return SIGN_IN;
  return saveAnswer(await createClient(), user.id, ideaId, fieldId, answer);
}

export async function saveIdeaCard(ideaId: string, input: IdeaCardInput): Promise<SaveResult> {
  const user = await getCurrentUser();
  if (!user) return SIGN_IN;
  return saveCard(await createClient(), user.id, ideaId, input);
}

export async function sendToRops(ideaId: string): Promise<SubmitState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: SIGN_IN.error };
  const db = await createClient();
  const state = await submitIdea(
    {
      loadIdea: (id) => getMyIdea(db, user.id, id),
      send: (id) => sendIdea(db, id),
      addNotification: (n) => addNotification(n, db),
      writeAudit: (e) => writeAudit(e, db),
    },
    ideaId,
  );
  if (state.status !== "sent") return state;
  revalidatePath("/my/creator");
  // Reload the card with the new status; ?sent= keeps the confirmation on screen
  redirect(`/my/creator/${ideaId}/card?sent=${state.resent ? "again" : "first"}`);
}
