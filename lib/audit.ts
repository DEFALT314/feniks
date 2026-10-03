import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/lib/supabase/types";

export const AuditEntry = z.object({
  akcja: z.string().min(1).max(100), // e.g. "pomysl.ocena", "profil.rola", "innowacja.edycja"
  obiekt: z.string().min(1).max(200), // e.g. "ideas:123", "profiles:<uuid>"
  szczegoly: z.record(z.string(), z.unknown()).optional(),
});
export type AuditEntry = z.infer<typeof AuditEntry>;

/**
 * Writes an entry to the audit log (ROPS panel). The actor is always the signed-in user
 * (set by the database in public.zapisz_audit). Returns the entry id.
 *
 * @example
 * await writeAudit({ akcja: "pomysl.ocena", obiekt: `ideas:${id}`, szczegoly: { status } });
 */
export async function writeAudit(
  entry: AuditEntry,
  client?: SupabaseClient<Database>,
): Promise<number> {
  const e = AuditEntry.parse(entry);
  const supabase = client ?? (await createClient());

  const { data, error } = await supabase.rpc("zapisz_audit", {
    p_akcja: e.akcja,
    p_obiekt: e.obiekt,
    p_szczegoly: (e.szczegoly ?? {}) as Json,
  });

  if (error) throw new Error(`Failed to write audit log: ${error.message}`);
  return data as number;
}
