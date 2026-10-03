"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { addNotification } from "@/lib/notifications";
import { createClient } from "@/lib/supabase/server";
import { decideRoleRequest, type PendingRequest } from "../_lib/role-requests";

// Approve or reject a role request; the result is shown on /admin/roles through ?msg=
export async function decideRole(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin/roles");
  const supabase = await createClient();

  const result = await decideRoleRequest(
    {
      getRequest: async (userId) => {
        const { data } = await supabase
          .from("profiles")
          .select("id, role, wnioskowana_rola, nazwa_wyswietlana")
          .eq("id", userId)
          .not("wnioskowana_rola", "is", null)
          .maybeSingle();
        if (!data?.wnioskowana_rola) return null;
        return {
          user_id: data.id,
          obecna_rola: data.role,
          wnioskowana_rola: data.wnioskowana_rola,
          nazwa_wyswietlana: data.nazwa_wyswietlana,
        } as PendingRequest;
      },
      approve: async (userId, role) =>
        await supabase.from("profiles").update({ role, wnioskowana_rola: null }).eq("id", userId),
      reject: async (userId) =>
        await supabase.from("profiles").update({ wnioskowana_rola: null }).eq("id", userId),
      audit: (entry) => writeAudit(entry, supabase),
      notifyUser: (userId, title) =>
        addNotification(
          { userIds: [userId], typ: "rola_decyzja", tytul: title, link: "/my/profile" },
          supabase,
        ),
    },
    user.role,
    { user_id: formData.get("user_id"), zatwierdz: formData.get("decision") === "approve" },
  );

  revalidatePath("/admin/roles");
  const params = new URLSearchParams({ msg: result.message, ok: result.ok ? "1" : "0" });
  redirect(`/admin/roles?${params}`);
}
