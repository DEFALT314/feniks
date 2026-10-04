"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser, isRopsRole } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { sendEmail, siteUrl } from "@/lib/email";
import { addNotification } from "@/lib/notifications";
import { createClient } from "@/lib/supabase/server";
import { PUBLISH_ERRORS, setGoodPractice, type PublishState } from "./publication";
import { reviewIdea, type ReviewState } from "./review";

export async function submitReview(
  ideaId: string,
  _prev: ReviewState,
  formData: FormData,
): Promise<ReviewState> {
  // Server actions are public endpoints: check the role again, the layout is not enough.
  const user = await getCurrentUser();
  if (!user || !isRopsRole(user.role)) {
    return { status: "error", message: "Tylko pracownicy ROPS mogą oceniać pomysły." };
  }

  const supabase = await createClient();
  const state = await reviewIdea(
    {
      supabase,
      writeAudit: (e) => writeAudit(e, supabase),
      addNotification: (n) => addNotification(n, supabase),
      sendEmail: (m) => sendEmail(m),
      siteUrl: siteUrl(),
    },
    ideaId,
    Object.fromEntries(formData),
  );
  if (state.status === "saved") revalidatePath("/admin");
  return state;
}

// "Pokaż jako dobrą praktykę" (#104). The database checks the role, the approval and the author's
// consent again (public.opublikuj_pomysl).
export async function setIdeaGoodPractice(ideaId: string, publish: boolean): Promise<PublishState> {
  const user = await getCurrentUser();
  if (!user || !isRopsRole(user.role)) {
    return { status: "error", message: "Tylko pracownicy ROPS mogą pokazywać dobre praktyki." };
  }
  // Arguments of a server action come from the client as they are: accept only a real boolean
  if (typeof publish !== "boolean")
    return { status: "error", message: "Nie rozumiemy tej zmiany." };

  const supabase = await createClient();
  const state = await setGoodPractice(
    {
      loadIdea: async (id) => {
        const { data } = await supabase
          .from("ideas")
          .select("id, tytul, autor_id")
          .eq("id", id)
          .not("wyslany_at", "is", null)
          .maybeSingle();
        return data;
      },
      publish: async (id, show) => {
        const { data, error } = await supabase.rpc("opublikuj_pomysl", {
          p_idea_id: id,
          p_publikuj: show,
        });
        if (error) return { ok: false, reason: PUBLISH_ERRORS[error.code ?? ""] ?? "failed" };
        if (data !== "opublikowany" && data !== "ukryty" && data !== "bez_zmian")
          return { ok: false, reason: "failed" };
        return { ok: true, result: data };
      },
      writeAudit: (e) => writeAudit(e, supabase),
      addNotification: (n) => addNotification(n, supabase),
    },
    ideaId,
    publish,
  );
  if (state.status === "saved") {
    revalidatePath("/admin");
    revalidatePath("/library/good-practices");
    revalidatePath("/library");
  }
  return state;
}
