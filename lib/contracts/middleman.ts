// Contract for module VII, Middleman (P3): a "service card" that translates an innovation into
// a service a municipality can order and fund.
//   POST  /api/ai/middleman            draft a card for an innovation and an institution (signed in)
//   PATCH /api/ai/middleman/[id]       edit the draft (new version)
//   POST  /api/ai/middleman/[id]/send  send it to ROPS for consultation (notifies ROPS staff)
// The /my/middleman page (P3) uses it; the innovation card links to it with ?innovation=<id>.
// Sample data: lib/contracts/fixtures/middleman.json. After 17:00, changes only by adding fields.
//
// AI never gives costs or numbers: cost.estimate stays null for the institution to fill in.
import { z } from "zod";
import fixture from "./fixtures/middleman.json";
import { InnovationSummary } from "./knowledge-base";

export const InstitutionType = z.enum([
  "gops",
  "mops",
  "pcpr",
  "urzad_gminy",
  "dps",
  "ngo",
  "inna",
]);
export type InstitutionType = z.infer<typeof InstitutionType>;

export const MunicipalityKind = z.enum(["wiejska", "miejsko-wiejska", "miejska", "powiat"]);
export type MunicipalityKind = z.infer<typeof MunicipalityKind>;

export const InstitutionProfile = z.object({
  type: InstitutionType,
  name: z.string().trim().min(2).max(200), // e.g. "GOPS w Przykładowej Woli"
  municipality_kind: MunicipalityKind,
  staff: z.string().trim().max(500).optional(), // who could run it, in the user's words
  constraints: z.string().trim().max(500).optional(), // budget, premises, transport…
});
export type InstitutionProfile = z.infer<typeof InstitutionProfile>;

export const ServiceCardRequest = z.object({
  innovation_id: z.string(),
  institution: InstitutionProfile,
});
export type ServiceCardRequest = z.infer<typeof ServiceCardRequest>;

// Computed from data, not by AI: does this institution type appear among the innovation's implementers?
export const InstitutionFit = z.object({
  level: z.enum(["dobra", "czesciowa", "do_sprawdzenia"]),
  note: z.string(), // plain Polish, e.g. "Innowację wdrażają m.in. GOPS i OPS."
});
export type InstitutionFit = z.infer<typeof InstitutionFit>;

export const Material = z.object({ label: z.string(), url: z.string() });
export type Material = z.infer<typeof Material>;

export const ServiceCard = z.object({
  id: z.string(), // middleman_cards.id
  version: z.number().int().min(1), // "szkic 1"
  title: z.string(),
  for_whom: z.string(), // "Dla kogo w gminie"
  how_it_works: z.array(z.string()), // "Jak to działa w praktyce", steps
  who_delivers: z.string(), // "Kto realizuje"
  cost: z.object({
    estimate: z.string().nullable(), // always null from AI: "uzupełnia GOPS"
    funding_hint: z.string(), // e.g. "sprawdź aktualne nabory w HubMI"
  }),
  risks: z.string(), // "Na co uważać"
  first_steps: z.array(z.string()), // "Pierwsze trzy kroki"
  based_on: InnovationSummary, // "Na podstawie"
  institution: InstitutionProfile,
  status: z.enum(["szkic", "wyslana_do_rops"]),
  created_at: z.iso.datetime(),
  // Added after 17:00 (optional): computed from data, shown next to the AI draft.
  fit: InstitutionFit.optional(),
  materials: z.array(Material).optional(), // PDF, film, package, the ROPS card
  updated_at: z.iso.datetime().optional(),
});
export type ServiceCard = z.infer<typeof ServiceCard>;

// PATCH body: the parts of the draft the user may change; cost.estimate is filled by the institution.
export const ServiceCardEdit = z
  .object({
    title: z.string().trim().min(3).max(200),
    for_whom: z.string().trim().min(3).max(1500),
    how_it_works: z.array(z.string().trim().min(3).max(500)).min(1).max(10),
    who_delivers: z.string().trim().min(3).max(1500),
    cost_estimate: z.string().trim().max(500).nullable(),
    risks: z.string().trim().min(3).max(1500),
    first_steps: z.array(z.string().trim().min(3).max(500)).min(1).max(6),
  })
  .partial()
  .strict();
export type ServiceCardEdit = z.infer<typeof ServiceCardEdit>;

// Sample data checked against the schemas: a mistake in fixtures shows up immediately.
export const middlemanFixtures = {
  request: ServiceCardRequest.parse(fixture.request),
  card: ServiceCard.parse(fixture.card),
  edit: ServiceCardEdit.parse(fixture.edit),
};
