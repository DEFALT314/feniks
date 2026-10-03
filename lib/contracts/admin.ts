import { z } from "zod";
import fixture from "./fixtures/admin.json";
import { Role } from "./shared";

// Module VI: ROPS admin panel (P4).
// GET  /api/admin/pomysly?status=nowy        → IdeaQueue
// POST /api/admin/pomysly/[id]/ocena          ReviewIdeaInput → IdeaReview
// GET  /api/admin/role                        → RoleRequest[]
// POST /api/admin/role                        RoleDecisionInput → { ok: true }
// GET  /api/admin/nabory                      → Call[] (P3 also reads it for the grant application generator)

// Idea status shown to the author (P2 reads it from idea_reviews; no review = "nowy").
// "w_weryfikacji" = passed to an expert, no decision yet (design/makiety/Admin.dc.html).
export const IdeaStatus = z.enum([
  "nowy",
  "w_weryfikacji",
  "zatwierdzony",
  "do_poprawy",
  "odrzucony",
]);
export type IdeaStatus = z.infer<typeof IdeaStatus>;

export const ReviewIdeaInput = z
  .object({
    status: IdeaStatus.exclude(["nowy"]),
    komentarz: z.string().trim().max(2000).optional(), // for the author
    ekspert_id: z.uuid().optional(),
  })
  // Messages are shown to ROPS staff in the panel, so they are in Polish.
  .refine((r) => !["do_poprawy", "odrzucony"].includes(r.status) || Boolean(r.komentarz), {
    message: "Napisz autorowi, co poprawić albo dlaczego odrzucacie pomysł.",
    path: ["komentarz"],
  })
  .refine((r) => r.status !== "w_weryfikacji" || Boolean(r.ekspert_id), {
    message: "Wybierz eksperta, któremu przekazujecie pomysł.",
    path: ["ekspert_id"],
  });
export type ReviewIdeaInput = z.infer<typeof ReviewIdeaInput>;

export const IdeaReview = z.object({
  id: z.uuid(),
  idea_id: z.uuid(),
  status: IdeaStatus,
  komentarz: z.string().nullable(),
  reviewer_id: z.uuid(),
  ekspert_id: z.uuid().nullable(),
  created_at: z.iso.datetime({ offset: true }),
});
export type IdeaReview = z.infer<typeof IdeaReview>;

export const IdeaQueueItem = z.object({
  idea_id: z.uuid(),
  tytul: z.string(),
  istota: z.string().nullable(),
  autor_nazwa: z.string().nullable(),
  obszar_id: z.string().nullable(),
  wyslany_at: z.iso.datetime({ offset: true }),
  status: IdeaStatus,
});
export type IdeaQueueItem = z.infer<typeof IdeaQueueItem>;

export const RoleRequest = z.object({
  user_id: z.uuid(),
  nazwa_wyswietlana: z.string().nullable(),
  obecna_rola: Role,
  wnioskowana_rola: z.enum(["ngo", "jst", "ekspert"]),
  instytucja_id: z.uuid().nullable(),
  instytucja_nazwa: z.string().nullable(),
});
export type RoleRequest = z.infer<typeof RoleRequest>;

export const RoleDecisionInput = z.object({
  user_id: z.uuid(),
  zatwierdz: z.boolean(),
  instytucja_id: z.uuid().optional(),
});
export type RoleDecisionInput = z.infer<typeof RoleDecisionInput>;

// Calls for proposals (grants): table public.calls
export const Call = z.object({
  id: z.uuid(),
  nazwa: z.string(),
  url: z.url(),
  termin_od: z.iso.date().nullable(),
  termin_do: z.iso.date().nullable(),
  obszary: z.array(z.string()), // challenge area ids from the Challenge map
});
export type Call = z.infer<typeof Call>;

export const AdminFixtures = z.object({
  kolejka: z.array(IdeaQueueItem),
  ocena: IdeaReview,
  prosby_o_role: z.array(RoleRequest),
  nabory: z.array(Call),
});

export const adminFixtures = AdminFixtures.parse(fixture);
