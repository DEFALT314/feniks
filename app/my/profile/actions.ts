"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser, headerName } from "@/lib/auth";
import { addNotification } from "@/lib/notifications";
import { createClient } from "@/lib/supabase/server";
import { saveDisplayName, type ProfileFormState } from "./_lib/profile";
import { submitRoleRequest, type RoleRequestState } from "./_lib/role-request";

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
  _prev: RoleRequestState,
  formData: FormData,
): Promise<RoleRequestState> {
  const user = await requireUser();
  const supabase = await createClient();
  const state = await submitRoleRequest(
    {
      saveRequest: async (role) =>
        await supabase.from("profiles").update({ wnioskowana_rola: role }).eq("id", user.id),
      notifyRops: (title) =>
        addNotification(
          {
            role: ["rops_redaktor", "rops_admin"],
            typ: "rola_prosba",
            tytul: title,
            link: "/admin/roles",
          },
          supabase,
        ),
    },
    user.role,
    user.displayName ?? headerName(user),
    formData.get("role"),
  );
  if (state.status === "sent") revalidatePath("/my/profile");
  return state;
}
