import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { GoodPractice } from "@/lib/contracts/idea-creator";
import type { Database } from "@/lib/supabase/types";

// Good practices (#104) through public.dobre_praktyki(): published ideas only, card fields only.
// Works for visitors who are not signed in (the function is granted to anon).
type Db = SupabaseClient<Database>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// A row that does not fit the contract is skipped and logged, never shown half-broken
function parseRows(rows: unknown[]): GoodPractice[] {
  return rows.flatMap((row) => {
    const parsed = GoodPractice.safeParse(row);
    if (parsed.success) return [parsed.data];
    console.error("Skipping a good practice that does not fit the contract", parsed.error.issues);
    return [];
  });
}

/** Published practices, newest first. An error gives an empty list: the page says so calmly. */
export async function getGoodPractices(db: Db): Promise<GoodPractice[]> {
  const { data, error } = await db.rpc("dobre_praktyki", {});
  if (error) {
    console.error("Failed to load good practices:", error.message);
    return [];
  }
  return parseRows(data ?? []);
}

export async function getGoodPractice(db: Db, id: string): Promise<GoodPractice | null> {
  if (!UUID.test(id)) return null;
  const { data, error } = await db.rpc("dobre_praktyki", { p_id: id });
  if (error) {
    console.error("Failed to load a good practice:", error.message);
    return null;
  }
  return parseRows(data ?? [])[0] ?? null;
}
