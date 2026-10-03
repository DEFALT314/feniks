// Role request from the profile page (#6): a user asks ROPS for the ngo, jst or expert role.
// The database guard (profiles_guard_update) lets only rops_admin change `role`; here the user only
// sets `wnioskowana_rola`, and ROPS decides in /admin/roles.
import { z } from "zod";
import type { Role } from "@/lib/contracts/shared";

export const RequestableRole = z.enum(["ngo", "jst", "ekspert"]);
export type RequestableRole = z.infer<typeof RequestableRole>;

export const REQUESTABLE_LABELS: Record<RequestableRole, string> = {
  ngo: "Organizacja pozarządowa",
  jst: "Gmina lub instytucja publiczna",
  ekspert: "Ekspertka lub ekspert",
};

export type RoleRequestState =
  | { status: "idle" }
  | { status: "sent"; role: RequestableRole }
  | { status: "error"; message: string };

export type RoleRequestDeps = {
  saveRequest(role: RequestableRole): Promise<{ error: unknown }>;
  notifyRops(title: string): Promise<unknown>;
};

// Why a request can't be sent, or null when it can
export function requestProblem(current: Role, requested: RequestableRole): string | null {
  if (current === "rops_redaktor" || current === "rops_admin") {
    return "Konto ROPS ma już wszystkie uprawnienia.";
  }
  if (current === requested) return "Masz już tę rolę.";
  return null;
}

export async function submitRoleRequest(
  deps: RoleRequestDeps,
  current: Role,
  displayName: string,
  input: unknown,
): Promise<RoleRequestState> {
  const parsed = RequestableRole.safeParse(input);
  if (!parsed.success) return { status: "error", message: "Wybierz rolę, o którą prosisz." };
  const problem = requestProblem(current, parsed.data);
  if (problem) return { status: "error", message: problem };

  const { error } = await deps.saveRequest(parsed.data);
  if (error) return { status: "error", message: "Nie udało się wysłać prośby. Spróbuj ponownie." };

  // The request is saved; a failed notification only means ROPS sees it in the panel without a bell
  try {
    await deps.notifyRops(
      `Prośba o rolę „${REQUESTABLE_LABELS[parsed.data]}”: ${displayName}`.slice(0, 200),
    );
  } catch (e) {
    console.error("Role request: notification failed", e);
  }
  return { status: "sent", role: parsed.data };
}
