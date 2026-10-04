import { InnovationEdit, type Innovation } from "@/lib/contracts/knowledge-base";
import { innovationFromRow } from "@/app/library/_lib/row";

export const ROPS_ROLES = ["rops_redaktor", "rops_admin"] as const;

type EditResult = { status: number; body: Innovation | { error: string; details?: unknown } };

// The minimal shape of the Supabase client we use (easy to replace in tests)
export type EditClient = {
  auth: { getUser(): Promise<{ data: { user: { id: string } | null } }> };
  rpc(fn: "moja_rola"): PromiseLike<{ data: unknown; error: unknown }>;
  from(table: "innovations"): {
    update(changes: Record<string, unknown>): {
      eq(
        column: "id",
        value: string,
      ): {
        select(): {
          maybeSingle(): PromiseLike<{
            data: unknown;
            error: { code?: string; message: string } | null;
          }>;
        };
      };
    };
  };
};

// Editing an innovation card from the ROPS panel. RLS in the database blocks writes by other roles anyway;
// here we return readable errors.
export async function editInnovation(
  client: EditClient,
  id: string,
  input: unknown,
  onSaved?: (changedFields: string[]) => Promise<unknown>,
): Promise<EditResult> {
  const { data: auth } = await client.auth.getUser();
  if (!auth.user) return { status: 401, body: { error: "Zaloguj się, aby edytować kartę." } };

  const { data: role } = await client.rpc("moja_rola");
  if (!ROPS_ROLES.includes(role as (typeof ROPS_ROLES)[number])) {
    return {
      status: 403,
      body: { error: "Kartę mogą edytować tylko redakcja i administracja ROPS." },
    };
  }

  const changes = InnovationEdit.safeParse(input);
  if (!changes.success) {
    return {
      status: 400,
      body: {
        error: "Nie zapisano zmian. Sprawdź wypełnione pola.",
        details: changes.error.issues,
      },
    };
  }
  if (Object.keys(changes.data).length === 0)
    return { status: 400, body: { error: "Nie ma zmian do zapisania." } };

  const { data, error } = await client
    .from("innovations")
    .update(changes.data)
    .eq("id", id)
    .select()
    .maybeSingle();
  if (error?.code === "23503") return { status: 400, body: { error: "Nie ma takiej kategorii." } };
  if (error) return { status: 500, body: { error: "Nie udało się zapisać zmian." } };
  if (!data) return { status: 404, body: { error: "Nie ma takiej innowacji." } };
  // The change log must not undo a saved edit, so a failed log entry is only reported
  try {
    await onSaved?.(Object.keys(changes.data));
  } catch (e) {
    console.error("Innovation edit: audit log failed", e);
  }
  return { status: 200, body: innovationFromRow(data) };
}
