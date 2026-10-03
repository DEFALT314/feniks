"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { saveDisplayName, type ProfileFormState } from "./_lib/profile";

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/my/profile");
  return user;
}

export async function updateDisplayName(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const user = await requireUser();
  const state = await saveDisplayName(await createClient(), user.id, Object.fromEntries(formData));
  if (state.status === "saved") revalidatePath("/", "layout");
  return state;
}
