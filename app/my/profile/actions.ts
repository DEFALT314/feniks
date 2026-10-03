"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { addNotification } from "@/lib/notifications";
import { createClient } from "@/lib/supabase/server";
import {
  clearRoleRequest,
  REQUESTABLE_ROLE_LABELS,
  saveDisplayName,
  saveRoleRequest,
  type ProfileFormState,
  type RequestableRole,
} from "./_lib/profile";

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

export async function requestRole(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const user = await requireUser();
  const supabase = await createClient();
  const state = await saveRoleRequest(supabase, user.id, Object.fromEntries(formData));
  if (state.status === "saved") {
    const role = formData.get("role") as RequestableRole;
    // The bell in the ROPS panel; a failed notification must not undo the request.
    await addNotification(
      {
        role: ["rops_redaktor", "rops_admin"],
        typ: "prosba_o_role",
        tytul: `Prośba o rolę: ${REQUESTABLE_ROLE_LABELS[role].toLowerCase()}`,
        link: "/admin",
      },
      supabase,
    ).catch(() => 0);
    revalidatePath("/my/profile");
  }
  return state;
}

export async function cancelRoleRequest() {
  const user = await requireUser();
  await clearRoleRequest(await createClient(), user.id);
  revalidatePath("/my/profile");
}
