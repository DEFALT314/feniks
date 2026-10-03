import type { SupabaseClient } from "@supabase/supabase-js";
import { Role } from "@/lib/contracts/shared";
import type { Database } from "@/lib/supabase/types";

export type CurrentUser = {
  id: string;
  email: string | null;
  role: Role;
  displayName: string | null;
  institutionId: string | null;
  consentAt: string | null;
};

/**
 * Reads the signed-in user and their profile. Returns null when nobody is signed in.
 * getUser() validates the session with Supabase Auth, so a forged cookie is not trusted.
 */
export async function loadCurrentUser(
  supabase: SupabaseClient<Database>,
): Promise<CurrentUser | null> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, nazwa_wyswietlana, instytucja_id, zgoda_rodo_at")
    .eq("id", user.id)
    .maybeSingle();

  // A profile is created by a trigger on sign-up; until it exists the user has the lowest role.
  const role = Role.safeParse(profile?.role);
  return {
    id: user.id,
    email: user.email ?? null,
    role: role.success ? role.data : "mieszkaniec",
    displayName: profile?.nazwa_wyswietlana ?? null,
    institutionId: profile?.instytucja_id ?? null,
    consentAt: profile?.zgoda_rodo_at ?? null,
  };
}

// Name shown in the header: display name, then the part of the e-mail before "@".
export function headerName(user: CurrentUser): string {
  return user.displayName || user.email?.split("@")[0] || "Użytkownik";
}
