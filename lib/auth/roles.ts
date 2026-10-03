import type { Role } from "@/lib/contracts/shared";

export const ROPS_ROLES: readonly Role[] = ["rops_redaktor", "rops_admin"];

export function isRopsRole(role: Role | null | undefined): boolean {
  return role != null && ROPS_ROLES.includes(role);
}

export function hasRole(user: { role: Role } | null, roles: readonly Role[]): boolean {
  return user != null && roles.includes(user.role);
}

export type AdminAccess = "allowed" | "sign-in" | "forbidden";

// Decision for the /admin layout: anonymous → sign in, signed in without a ROPS role → forbidden.
export function adminAccess(user: { role: Role } | null): AdminAccess {
  if (!user) return "sign-in";
  return isRopsRole(user.role) ? "allowed" : "forbidden";
}
