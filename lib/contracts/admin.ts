import { z } from "zod";
import fixture from "./fixtures/admin.json";
import { Role } from "./shared";

// Module VI: ROPS admin panel (P4). The panel uses server actions, not HTTP endpoints:
// - idea queue and review: app/admin/page.tsx, app/admin/_lib/actions.ts (submitReview)
// - role requests: app/admin/roles (P1)
// - calls for proposals: app/admin/calls; the generator reads them with listOpenCalls() (lib/calls.ts)
// - service cards from the Middleman: app/admin/cards (read only)
// These schemas describe the data those screens exchange.

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

// Calls for proposals (grants): table public.calls (#10). The id is a text slug.
export const Call = z.object({
  id: z.string(),
  nazwa: z.string(),
  url: z.url().nullable(),
  termin_od: z.iso.date().nullable(),
  termin_do: z.iso.date().nullable(),
  obszary: z.array(z.string()), // challenge area ids from the Challenge map
  organizator: z.string().optional(),
  cel: z.string().nullable().optional(), // what the call funds, plain Polish
  opublikowany: z.boolean().optional(), // "włączanie naborów": only published calls are public
  demo: z.boolean().optional(),
});
export type Call = z.infer<typeof Call>;

// Form in /admin/calls (messages shown to ROPS staff, in Polish).
export const CallInput = z
  .object({
    id: z
      .string()
      .trim()
      .regex(/^[a-z0-9][a-z0-9-]{2,80}$/, {
        message: "Identyfikator: małe litery, cyfry i myślniki.",
      }),
    nazwa: z.string().trim().min(3, { message: "Wpisz nazwę naboru." }).max(200),
    organizator: z.string().trim().min(2).max(200),
    cel: z.string().trim().max(1000).optional(),
    url: z.url({ message: "Wpisz pełny adres strony, np. https://…" }).optional(),
    termin_od: z.iso.date().optional(),
    termin_do: z.iso.date().optional(),
    obszary: z.array(z.string()).default([]),
    opublikowany: z.boolean().default(false),
  })
  .refine((c) => !c.termin_od || !c.termin_do || c.termin_od <= c.termin_do, {
    message: "Koniec naboru nie może być przed początkiem.",
    path: ["termin_do"],
  });
export type CallInput = z.infer<typeof CallInput>;

export const AdminFixtures = z.object({
  kolejka: z.array(IdeaQueueItem),
  ocena: IdeaReview,
  prosby_o_role: z.array(RoleRequest),
  nabory: z.array(Call),
});

export const adminFixtures = AdminFixtures.parse(fixture);
