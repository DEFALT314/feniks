"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser, headerName } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import type { CanvasAnswer, IdeaCardInput } from "@/lib/contracts/idea-creator";
import { addNotification, notifyIdeaSent } from "@/lib/notifications";
import { createClient } from "@/lib/supabase/server";
import { fields } from "./_lib/canvas";
import {
  createIdea,
  getMyIdea,
  sendIdea,
  saveAnswer,
  saveCard,
  setPublicationConsent,
  type SaveResult,
} from "./_lib/ideas";
import { changeConsent, type ConsentDeps, type ConsentState } from "./_lib/publication";
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

// Consent to show an idea as a good practice (#104). ROPS hears about it only when the withdrawal
// took a practice down from the Library.
function consentDeps(db: Awaited<ReturnType<typeof createClient>>): ConsentDeps {
  return {
    setConsent: (id, agree) => setPublicationConsent(db, id, agree),
    notifyRops: ({ id, tytul }) =>
      addNotification(
        {
          role: ["rops_redaktor", "rops_admin"],
          typ: "pomysl_zgoda_wycofana",
          tytul: `Autor wycofał zgodę: „${tytul}” zniknął z Biblioteki.`,
          link: `/admin?status=zatwierdzony&idea=${id}`,
        },
        db,
      ),
    writeAudit: (e) => writeAudit(e, db),
  };
}

export async function setIdeaConsent(ideaId: string, agree: boolean): Promise<ConsentState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: SIGN_IN.error };
  // Arguments of a server action come from the client as they are: accept only a real boolean
  if (typeof agree !== "boolean") return { status: "error", message: "Nie rozumiemy tej zmiany." };
  const db = await createClient();
  const idea = await getMyIdea(db, user.id, ideaId);
  if (!idea) return { status: "error", message: "Nie ma takiego pomysłu albo nie jest Twój." };
  const state = await changeConsent(consentDeps(db), idea, agree);
  if (state.status === "saved") {
    revalidatePath("/my/creator");
    revalidatePath(`/my/creator/${ideaId}/card`);
    revalidatePath("/library/good-practices");
  }
  return state;
}

/** `consent`: the "show it to others" box in the send form; undefined leaves the choice as it is. */
export async function sendToRops(ideaId: string, consent?: boolean): Promise<SubmitState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: SIGN_IN.error };
  const db = await createClient();
  const state = await submitIdea(
    {
      loadIdea: (id) => getMyIdea(db, user.id, id),
      send: (id) => sendIdea(db, id),
      notifyRops: ({ ideaId, tytul }) =>
        notifyIdeaSent({ ideaId, tytul, autorNazwa: headerName(user) }, db),
      writeAudit: (e) => writeAudit(e, db),
      changeConsent: (idea, agree) => changeConsent(consentDeps(db), idea, agree),
    },
    ideaId,
    typeof consent === "boolean" ? consent : undefined,
  );
  if (state.status !== "sent") return state;
  revalidatePath("/my/creator");
  // Reload the card with the new status; ?sent= keeps the confirmation on screen
  redirect(`/my/creator/${ideaId}/card?sent=${state.resent ? "again" : "first"}`);
}
