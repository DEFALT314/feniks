// Wiring of the Middleman endpoints: signed-in user, session client, P1's catalog, P4's notifications.
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getInnovationById } from "@/app/library/_lib/data";
import { getCurrentUser } from "@/lib/auth";
import type { Deps, Result } from "@/lib/ai/middleman/service";
import { addNotification } from "@/lib/notifications";
import { createClient } from "@/lib/supabase/server";

export async function signedInDeps(): Promise<Deps | null> {
  if (!(await getCurrentUser())) return null;
  // middleman_cards is in the generated types, but the cards module works on plain rows.
  const db = (await createClient()) as unknown as SupabaseClient;
  return {
    db,
    findInnovation: getInnovationById,
    notifyRops: async (cardId, title) => {
      await addNotification({
        role: ["rops_redaktor", "rops_admin"],
        typ: "karta_uslugi",
        tytul: `Karta usługi do konsultacji: ${title}`,
        link: `/admin?karta=${cardId}`,
      });
    },
  };
}

export const SIGN_IN = NextResponse.json(
  { error: "Zaloguj się, aby przygotować kartę usługi dla swojej instytucji." },
  { status: 401 },
);

export function respond(result: Result) {
  return result.ok
    ? NextResponse.json(result.card)
    : NextResponse.json({ error: result.error }, { status: result.status });
}
