// ROPS decides on role requests (#6, module VI: verification of institutions and experts).
import { RoleDecisionInput, type RoleRequest } from "@/lib/contracts/admin";
import type { Role } from "@/lib/contracts/shared";

export type PendingRequest = Pick<RoleRequest, "user_id" | "obecna_rola" | "wnioskowana_rola"> & {
  nazwa_wyswietlana: string | null;
};

export type DecisionDeps = {
  getRequest(userId: string): Promise<PendingRequest | null>;
  approve(userId: string, role: PendingRequest["wnioskowana_rola"]): Promise<{ error: unknown }>;
  reject(userId: string): Promise<{ error: unknown }>;
  audit(entry: {
    akcja: string;
    obiekt: string;
    szczegoly: Record<string, unknown>;
  }): Promise<unknown>;
  notifyUser(userId: string, title: string): Promise<unknown>;
};

export type DecisionResult = { ok: true; message: string } | { ok: false; message: string };

const LABELS: Record<PendingRequest["wnioskowana_rola"], string> = {
  ngo: "organizacja pozarządowa",
  jst: "gmina lub instytucja publiczna",
  ekspert: "ekspertka lub ekspert",
};

export async function decideRoleRequest(
  deps: DecisionDeps,
  reviewerRole: Role,
  input: unknown,
): Promise<DecisionResult> {
  if (reviewerRole !== "rops_redaktor" && reviewerRole !== "rops_admin") {
    return { ok: false, message: "Decyzje o rolach podejmuje ROPS." };
  }
  const parsed = RoleDecisionInput.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      message: "Nie udało się odczytać decyzji. Odśwież stronę i spróbuj ponownie.",
    };
  const { user_id, zatwierdz } = parsed.data;

  // Matches the database guard: only rops_admin may change a role
  if (zatwierdz && reviewerRole !== "rops_admin") {
    return { ok: false, message: "Rolę może zatwierdzić tylko administrator ROPS." };
  }

  const request = await deps.getRequest(user_id);
  if (!request) return { ok: false, message: "Ta prośba została już rozpatrzona." };

  const { error } = zatwierdz
    ? await deps.approve(user_id, request.wnioskowana_rola)
    : await deps.reject(user_id);
  if (error) return { ok: false, message: "Nie udało się zapisać decyzji. Spróbuj ponownie." };

  const label = LABELS[request.wnioskowana_rola];
  const who = request.nazwa_wyswietlana ?? "użytkownik";
  // The decision is saved; the log and the notification must not undo it
  try {
    await deps.audit({
      akcja: zatwierdz ? "profil.rola.zatwierdzona" : "profil.rola.odrzucona",
      obiekt: `profiles:${user_id}`,
      szczegoly: { z: request.obecna_rola, o: request.wnioskowana_rola },
    });
    await deps.notifyUser(
      user_id,
      zatwierdz
        ? `ROPS zatwierdził Twoją rolę: ${label}.`
        : `ROPS nie zatwierdził roli: ${label}. Napisz do nas, jeśli chcesz to wyjaśnić.`,
    );
  } catch (e) {
    console.error("Role decision: audit or notification failed", e);
  }
  return {
    ok: true,
    message: zatwierdz ? `Zatwierdzono rolę „${label}” dla: ${who}.` : `Odrzucono prośbę: ${who}.`,
  };
}
