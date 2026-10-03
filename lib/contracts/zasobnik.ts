// Kontrakt modułu II Zasobnik wiedzy (P1).
// Strony /biblioteka, /mapa-wyzwan, /zasoby czytają tabele Zasobnika przez klienta z sesją (RLS).
// Inni: P3 (Matchmaking, Middleman) używa typów Innowacja i Obszar; P4 (panel ROPS) woła
// PATCH /api/zasoby/innowacje/[id]. Przykładowe dane: lib/contracts/fixtures/zasobnik.json.
// Po 17:00 zmiany tylko przez dodanie pól.
import { z } from "zod";

// --- Biblioteka innowacji ---

export const Kategoria = z.object({
  id: z.string(), // np. "dla-seniorow"; "inne" dla rekordów spoza Biblioteki
  nazwa: z.string(),
  url: z.string().nullable(),
});
export type Kategoria = z.infer<typeof Kategoria>;

export const Materialy = z.object({
  opis_pdf: z.string().nullable(),
  film: z.string().nullable(), // YouTube
  pakiet_zip: z.string().nullable(),
  zasady_wykorzystania: z.string().nullable(),
  inne: z.array(z.string()),
});
export type Materialy = z.infer<typeof Materialy>;

export const Pewnosc = z.enum(["pewne", "prawdopodobne"]);

// Pozycja na liście /biblioteka
export const InnowacjaSkrot = z.object({
  id: z.string(), // slug z data/rops, wspólny dla całej aplikacji
  nazwa: z.string(),
  kategoria_id: z.string(),
  etykieta: z.string().nullable(), // program: IWS, MIIS, MIWS, Inkubator Dostępności
  sprawdzona_przez_rops: z.boolean(), // etykieta „Sprawdzona przez ROPS”
  opis_krotki: z.string().nullable(),
  dla_kogo: z.array(z.string()),
  slowa_kluczowe: z.array(z.string()),
  spoza_biblioteki: z.boolean(),
  opis_niepelny: z.boolean(), // spoza Biblioteki i pewnosc = "prawdopodobne" → dopisek „opis niepełny”
  ma_film: z.boolean(),
});
export type InnowacjaSkrot = z.infer<typeof InnowacjaSkrot>;

// Karta /biblioteka/[id]. autor_instytucja celowo pominięte do zgody ROPS.
export const Innowacja = InnowacjaSkrot.extend({
  problem: z.string().nullable(),
  kto_moze_wdrozyc: z.array(z.string()),
  czy_dziala: z.string().nullable(),
  materialy: Materialy,
  url: z.string(), // „Zobacz pełną kartę w ROPS”
  do_matchmakingu: z.boolean(),
  program: z.string().nullable(),
  zrodlo: z.string().nullable(),
  pewnosc: Pewnosc.nullable(),
  opublikowana: z.boolean(),
  updated_at: z.string(), // ISO
});
export type Innowacja = z.infer<typeof Innowacja>;

// Flaga z adresu strony: "1" albo "true" = włączona (z.coerce.boolean() zamieniłby "false" na true)
const flaga = z.preprocess((v) => v === true || v === "1" || v === "true", z.boolean());

// Filtry listy, trzymane w adresie strony (searchParams)
export const FiltryBiblioteki = z.object({
  q: z.string().trim().max(200).optional(), // nazwa i słowa kluczowe
  kategoria: z.string().optional(),
  grupa: z.string().optional(), // jedna z wartości dla_kogo
  etykieta: z.string().optional(),
  sprawdzona: flaga,
  spoza: flaga, // pokaż także rekordy spoza Biblioteki online
  strona: z.coerce.number().int().min(1).default(1),
});
export type FiltryBiblioteki = z.infer<typeof FiltryBiblioteki>;

export const ListaInnowacji = z.object({
  wyniki: z.array(InnowacjaSkrot),
  liczba: z.number().int(), // licznik wyników po filtrach
  dostepne_filtry: z.object({
    kategorie: z.array(Kategoria),
    grupy: z.array(z.string()),
    etykiety: z.array(z.string()),
  }),
});
export type ListaInnowacji = z.infer<typeof ListaInnowacji>;

// PATCH /api/zasoby/innowacje/[id] (tylko rops_redaktor i rops_admin); odpowiedź: Innowacja
export const EdycjaInnowacji = z
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
    materialy: Materialy,
    url: z.string(),
    slowa_kluczowe: z.array(z.string().max(100)).max(30),
    do_matchmakingu: z.boolean(),
    opublikowana: z.boolean(),
  })
  .partial()
  .strict();
export type EdycjaInnowacji = z.infer<typeof EdycjaInnowacji>;

// --- Mapa Wyzwań Społecznych ---

export const Wyzwanie = z.object({
  id: z.string(), // unikalne w całej mapie, wspólne z Matchmakingiem i trendami
  obszar_id: z.string(),
  tekst: z.string(),
});
export type Wyzwanie = z.infer<typeof Wyzwanie>;

export const Persona = z.object({
  id: z.string(),
  obszar_id: z.string(),
  imie: z.string(), // fikcyjna persona ROPS
  opis: z.string().nullable(),
  cele: z.array(z.string()),
  wyzwania: z.array(z.string()),
  motywacje: z.array(z.string()),
});
export type Persona = z.infer<typeof Persona>;

export const Obszar = z.object({
  id: z.string(), // np. "seniorzy"
  nr: z.number().int(),
  nazwa: z.string(),
  definicja: z.string().nullable(),
  dane: z.array(z.string()),
  slowa_kluczowe: z.array(z.string()),
  kategorie_biblioteki: z.array(z.string()),
  zrodlo_url: z.string().nullable(),
});
export type Obszar = z.infer<typeof Obszar>;

// /mapa-wyzwan/[id]: obszar z wyzwaniami, personami i powiązanymi innowacjami
export const ObszarSzczegoly = Obszar.extend({
  wyzwania: z.array(Wyzwanie),
  persony: z.array(Persona),
  innowacje: z.array(InnowacjaSkrot),
});
export type ObszarSzczegoly = z.infer<typeof ObszarSzczegoly>;

// --- Raporty i publikacje ---

export const Zasob = z.object({
  id: z.string(),
  typ: z.enum(["raport", "publikacja"]),
  rok: z.number().int().nullable(),
  tytul: z.string(),
  opis: z.string().nullable(),
  tagi: z.array(z.string()),
  url: z.string(), // zawsze link do źródła ROPS
});
export type Zasob = z.infer<typeof Zasob>;

export const FiltryZasobow = z.object({
  typ: z.enum(["raport", "publikacja"]).optional(),
  rok: z.coerce.number().int().optional(),
  tag: z.string().optional(),
});
export type FiltryZasobow = z.infer<typeof FiltryZasobow>;
