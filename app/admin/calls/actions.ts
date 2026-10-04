"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser, isRopsRole } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { saveCall, setPublished, type CallFormState } from "@/lib/calls";
import { sendEmail, siteUrl } from "@/lib/email";
import { addNotification } from "@/lib/notifications";
import { createClient } from "@/lib/supabase/server";

async function ropsClient() {
  // Server actions are public endpoints: check the role again (the layout is not enough).
  const user = await getCurrentUser();
  return user && isRopsRole(user.role) ? await createClient() : null;
}

export async function saveCallAction(
  editingId: string | null,
  _prev: CallFormState,
  formData: FormData,
): Promise<CallFormState> {
  const supabase = await ropsClient();
  if (!supabase) return { status: "error", message: "Tylko pracownicy ROPS mogą edytować nabory." };
  const state = await saveCall(
    {
      supabase,
      writeAudit: (e) => writeAudit(e, supabase),
      addNotification: (n) => addNotification(n, supabase),
      sendEmail: (m) => sendEmail(m),
      siteUrl: siteUrl(),
    },
    formData,
    editingId,
  );
  if (state.status === "saved") revalidatePath("/admin/calls");
  return state;
}

export async function togglePublishedAction(formData: FormData) {
  const supabase = await ropsClient();
  if (!supabase) return;
  const id = String(formData.get("id") ?? "");
  await setPublished(
    {
      supabase,
      writeAudit: (e) => writeAudit(e, supabase),
      addNotification: (n) => addNotification(n, supabase),
      sendEmail: (m) => sendEmail(m),
      siteUrl: siteUrl(),
    },
    id,
    formData.get("on") === "true",
  );
  revalidatePath("/admin/calls");
}
