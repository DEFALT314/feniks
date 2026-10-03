"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser, isRopsRole } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { sendEmail, siteUrl } from "@/lib/email";
import { addNotification } from "@/lib/notifications";
import { createClient } from "@/lib/supabase/server";
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
