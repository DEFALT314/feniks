import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/lib/supabase/types";

export const DisplayNameInput = z.object({
  name: z
    .string()
    .trim()
    .min(2, { message: "Wpisz co najmniej 2 znaki." })
    .max(60, { message: "Najwyżej 60 znaków." }),
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
