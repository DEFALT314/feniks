// Contract for module VII, Middleman (P3): a "service card" that translates an innovation into
// a service a municipality can order and fund.
//   POST /api/ai/middleman   draft a card for an innovation and an institution
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
});
export type ServiceCard = z.infer<typeof ServiceCard>;

// Sample data checked against the schemas: a mistake in fixtures shows up immediately.
export const middlemanFixtures = {
  request: ServiceCardRequest.parse(fixture.request),
  card: ServiceCard.parse(fixture.card),
};
