import type { Role } from "@/lib/contracts/shared";

/**
 * Whether match results offer "Przygotuj kartę usługi" (Middleman): municipalities, organisations and
 * ROPS staff can use it; visitors see it and are asked to sign in. Residents and experts have no
 * institution to prepare a service for, so the button would lead to an empty form.
 */
export function offersServiceCard(role: Role | null): boolean {
  return (
    role === null ||
    role === "jst" ||
    role === "ngo" ||
    role === "rops_redaktor" ||
    role === "rops_admin"
  );
}
