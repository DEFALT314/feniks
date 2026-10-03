import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/lib/supabase/types";

export const REQUESTABLE_ROLES = ["ngo", "jst", "ekspert"] as const;
export type RequestableRole = (typeof REQUESTABLE_ROLES)[number];

export const REQUESTABLE_ROLE_LABELS: Record<RequestableRole, string> = {
  ngo: "Organizacja pozarządowa",
  jst: "Gmina lub instytucja publiczna",
  ekspert: "Ekspertka lub ekspert",
};

export const DisplayNameInput = z.object({
  name: z
    .string()
    .trim()
    .min(2, { message: "Wpisz co najmniej 2 znaki." })
    .max(60, { message: "Najwyżej 60 znaków." }),
});

export const RoleRequestInput = z.object({
  role: z.enum(REQUESTABLE_ROLES, { message: "Wybierz jedną z ról." }),
});

export type ProfileFormState = {
  status: "idle" | "saved" | "error";
  message?: string;
  fieldError?: string;
};

type Fields = Record<string, FormDataEntryValue | null>;
const text = (v: FormDataEntryValue | null | undefined) => (typeof v === "string" ? v : "");

/** Save the name shown in the header. RLS lets users edit only their own profile. */
export async function saveDisplayName(
  supabase: SupabaseClient<Database>,
  userId: string,
  fields: Fields,
): Promise<ProfileFormState> {
  const parsed = DisplayNameInput.safeParse({ name: text(fields.name) });
  if (!parsed.success) return { status: "error", fieldError: parsed.error.issues[0].message };
  const { error } = await supabase
    .from("profiles")
    .update({ nazwa_wyswietlana: parsed.data.name })
    .eq("id", userId);
  if (error) return { status: "error", message: "Nie udało się zapisać. Spróbuj ponownie." };
  return { status: "saved", message: "Zapisano." };
}

/** Ask ROPS for an extra role. ROPS approves it in the admin panel (module VI). */
export async function saveRoleRequest(
  supabase: SupabaseClient<Database>,
  userId: string,
  fields: Fields,
): Promise<ProfileFormState> {
  const parsed = RoleRequestInput.safeParse({ role: text(fields.role) });
  if (!parsed.success) return { status: "error", fieldError: parsed.error.issues[0].message };
  const { error } = await supabase
    .from("profiles")
    .update({ wnioskowana_rola: parsed.data.role })
    .eq("id", userId);
  if (error) return { status: "error", message: "Nie udało się wysłać prośby. Spróbuj ponownie." };
  return { status: "saved", message: "Prośba wysłana do ROPS." };
}

export async function clearRoleRequest(supabase: SupabaseClient<Database>, userId: string) {
  await supabase.from("profiles").update({ wnioskowana_rola: null }).eq("id", userId);
}
