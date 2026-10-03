// Contract for module II, the knowledge base ("Zasobnik wiedzy", P1).
// The /library, /challenge-map and /resources pages read the knowledge base tables through the session client (RLS).
// Others: P3 (Matchmaking, Middleman) uses the Innovation and ChallengeArea types; P4 (ROPS panel) calls
// PATCH /api/innovations/[id]. Sample data: lib/contracts/fixtures/knowledge-base.json.
// After 17:00, changes only by adding fields.
import { z } from "zod";

// --- Innovation library ---

export const Category = z.object({
  id: z.string(), // e.g. "dla-seniorow"; "inne" for records from outside the Library
  nazwa: z.string(),
  url: z.string().nullable(),
});
export type Category = z.infer<typeof Category>;

export const Materials = z.object({
  opis_pdf: z.string().nullable(),
  film: z.string().nullable(), // YouTube
  pakiet_zip: z.string().nullable(),
  zasady_wykorzystania: z.string().nullable(),
  inne: z.array(z.string()),
});
export type Materials = z.infer<typeof Materials>;

export const Confidence = z.enum(["pewne", "prawdopodobne"]);

// An item on the /library list
export const InnovationSummary = z.object({
  id: z.string(), // slug from data/rops, shared across the whole app
  nazwa: z.string(),
  kategoria_id: z.string(),
  etykieta: z.string().nullable(), // program: IWS, MIIS, MIWS, Inkubator Dostępności
  sprawdzona_przez_rops: z.boolean(), // "Sprawdzona przez ROPS" badge
  opis_krotki: z.string().nullable(),
  dla_kogo: z.array(z.string()),
  slowa_kluczowe: z.array(z.string()),
  spoza_biblioteki: z.boolean(),
  opis_niepelny: z.boolean(), // outside the Library and pewnosc = "prawdopodobne" → "opis niepełny" note
  ma_film: z.boolean(),
  ma_pdf: z.boolean(),
  kto_moze_wdrozyc: z.array(z.string()),
});
export type InnovationSummary = z.infer<typeof InnovationSummary>;

// The /library/[id] card. autor_instytucja is deliberately left out until ROPS approves it.
export const Innovation = InnovationSummary.extend({
  problem: z.string().nullable(),
  czy_dziala: z.string().nullable(),
  materialy: Materials,
  url: z.string(), // "Zobacz pełną kartę w ROPS"
  do_matchmakingu: z.boolean(),
  program: z.string().nullable(),
  zrodlo: z.string().nullable(),
  pewnosc: Confidence.nullable(),
  opublikowana: z.boolean(),
  updated_at: z.string(), // ISO
});
export type Innovation = z.infer<typeof Innovation>;

// Flag from the page URL: "1" or "true" = on (z.coerce.boolean() would turn "false" into true)
const flag = z.preprocess((v) => v === true || v === "1" || v === "true", z.boolean());

// A parameter that can appear in the URL several times (?category=a&category=b)
const repeatedParam = z.preprocess(
  (v) => (v === undefined || v === "" ? [] : [v].flat()),
  z.array(z.string()),
);

// List filters, kept in the page URL (searchParams)
export const LibraryFilters = z.object({
  q: z.string().trim().max(200).optional(), // name and keywords
  category: repeatedParam,
  group: z.string().optional(), // one of the dla_kogo values
  label: z.string().optional(),
  verified: flag,
  video: flag,
  pdf: flag,
  page: z.coerce.number().int().min(1).catch(1),
});
export type LibraryFilters = z.infer<typeof LibraryFilters>;

export const InnovationList = z.object({
  wyniki: z.array(InnovationSummary),
  liczba: z.number().int(), // result count after filters
  strona: z.number().int(),
  liczba_stron: z.number().int(),
  dostepne_filtry: z.object({
    kategorie: z.array(Category),
    grupy: z.array(z.string()),
    etykiety: z.array(z.string()),
  }),
  // Counts next to filters (how many items match the search in a given category, etc.)
  liczniki: z.object({
    kategorie: z.record(z.string(), z.number().int()),
    sprawdzona: z.number().int(),
    film: z.number().int(),
    pdf: z.number().int(),
  }),
});
export type InnovationList = z.infer<typeof InnovationList>;

// PATCH /api/innovations/[id] (rops_redaktor and rops_admin only); response: Innovation
export const InnovationEdit = z
  .object({
    nazwa: z.string().min(1).max(200),
    kategoria_id: z.string(),
    etykieta: z.string().nullable(),
    sprawdzona_przez_rops: z.boolean(),
    opis_krotki: z.string().max(2000).nullable(),
    problem: z.string().max(2000).nullable(),
    dla_kogo: z.array(z.string().max(200)).max(30),
    kto_moze_wdrozyc: z.array(z.string().max(200)).max(30),
    czy_dziala: z.string().max(2000).nullable(),
    materialy: Materials,
    url: z.string(),
    slowa_kluczowe: z.array(z.string().max(100)).max(30),
    do_matchmakingu: z.boolean(),
    opublikowana: z.boolean(),
  })
  .partial()
  .strict();
export type InnovationEdit = z.infer<typeof InnovationEdit>;

// --- Social Challenges Map ---

export const Challenge = z.object({
  id: z.string(), // unique across the whole map, shared with Matchmaking and trends
  obszar_id: z.string(),
  tekst: z.string(),
});
export type Challenge = z.infer<typeof Challenge>;

export const Persona = z.object({
  id: z.string(),
  obszar_id: z.string(),
  imie: z.string(), // fictional ROPS persona
  opis: z.string().nullable(),
  cele: z.array(z.string()),
  wyzwania: z.array(z.string()),
  motywacje: z.array(z.string()),
});
export type Persona = z.infer<typeof Persona>;

export const ChallengeArea = z.object({
  id: z.string(), // e.g. "seniorzy"
  nr: z.number().int(),
  nazwa: z.string(),
  definicja: z.string().nullable(),
  dane: z.array(z.string()),
  slowa_kluczowe: z.array(z.string()),
  kategorie_biblioteki: z.array(z.string()),
  zrodlo_url: z.string().nullable(),
});
export type ChallengeArea = z.infer<typeof ChallengeArea>;

// /challenge-map/[id]: an area with its challenges, personas and related innovations
export const ChallengeAreaDetails = ChallengeArea.extend({
  wyzwania: z.array(Challenge),
  persony: z.array(Persona),
  innowacje: z.array(InnovationSummary),
});
export type ChallengeAreaDetails = z.infer<typeof ChallengeAreaDetails>;

// --- Reports and publications ---

export const Resource = z.object({
  id: z.string(),
  typ: z.enum(["raport", "publikacja"]),
  rok: z.number().int().nullable(),
  tytul: z.string(),
  opis: z.string().nullable(),
  tagi: z.array(z.string()),
  url: z.string(), // always a link to the ROPS source
});
export type Resource = z.infer<typeof Resource>;

export const ResourceFilters = z.object({
  type: z.enum(["raport", "publikacja"]).optional(),
  year: z.coerce.number().int().optional(),
  tag: z.string().optional(),
});
export type ResourceFilters = z.infer<typeof ResourceFilters>;
