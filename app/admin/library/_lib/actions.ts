"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser, isRopsRole } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { createClient } from "@/lib/supabase/server";
import { createCard, type NewCardState } from "./new-card";

// "Dodaj kartę" in /admin/library. Server actions are public endpoints: the role is checked here
// again, and RLS allows inserts only for ROPS roles anyway.
export async function addCard(_prev: NewCardState, formData: FormData): Promise<NewCardState> {
  const user = await getCurrentUser();
  const supabase = await createClient();
  const result = await createCard(
    {
      isRops: Boolean(user && isRopsRole(user.role)),
      insert: async (row) => await supabase.from("innovations").insert(row),
      audit: (id) => writeAudit({ akcja: "innowacja.nowa", obiekt: `innovations:${id}` }, supabase),
      suffix: () => randomBytes(3).toString("hex"),
    },
    Object.fromEntries(formData),
  );
  if ("message" in result) {
    const text = (key: string) => String(formData.get(key) ?? "");
    return {
      status: "error",
      message: result.message,
      nazwa: text("nazwa"),
      kategoria_id: text("kategoria_id"),
    };
  }
  revalidatePath("/admin/library");
  redirect(`/admin/library/${result.id}?new=1`);
}
