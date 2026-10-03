import { z } from "zod";

// Shared contract types (P4). Values match the database (migration *_wspolne.sql).
export const Role = z.enum(["mieszkaniec", "ngo", "jst", "ekspert", "rops_redaktor", "rops_admin"]);
export type Role = z.infer<typeof Role>;

export const ROPS_ROLES = ["rops_redaktor", "rops_admin"] as const satisfies readonly Role[];

export const InstitutionType = z.enum(["gmina", "OPS", "PCPR", "NGO", "inna"]);
export type InstitutionType = z.infer<typeof InstitutionType>;

export const Institution = z.object({
  id: z.uuid(),
  nazwa: z.string(),
  typ: InstitutionType,
  teryt: z.string().nullable(),
  zweryfikowana: z.boolean(),
});
export type Institution = z.infer<typeof Institution>;
