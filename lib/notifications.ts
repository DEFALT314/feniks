import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NewNotification } from "@/lib/contracts/notifications";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

/**
 * Adds a notification (header bell, Realtime). Call it from endpoints and Server Actions.
 * Recipients: `userIds` and/or everyone with `role`. The database checks permissions
 * (public.dodaj_powiadomienie): a regular user may notify themselves, ROPS and experts;
 * ROPS and experts may notify anyone. Returns the number of notifications created.
 *
 * @example
 * await addNotification({ role: ["rops_redaktor", "rops_admin"], typ: "pomysl_wyslany",
 *   tytul: "Nowy pomysł do oceny", link: `/admin/pomysly/${id}` });
 */
export async function addNotification(
  input: NewNotification,
  client?: SupabaseClient<Database>,
): Promise<number> {
  const n = NewNotification.parse(input);
  const supabase = client ?? (await createClient());

  const { data, error } = await supabase.rpc("dodaj_powiadomienie", {
    p_typ: n.typ,
    p_tytul: n.tytul,
    p_link: n.link,
    p_user_ids: n.userIds,
    p_role: n.role,
  });

  if (error) throw new Error(`Failed to add notification: ${error.message}`);
  return data as number;
}
