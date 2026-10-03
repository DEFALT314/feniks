// Builds supabase/seed.sql from data/rops/*.json files (knowledge base tables, module II).
// Run: npx tsx scripts/seed/build_seed.ts
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

const ROOT = join(__dirname, "..", "..");
const DATA = join(ROOT, "data", "rops");
const OUT = join(ROOT, "supabase", "seed.sql");

type SourceMaterials = {
  opis_pdf: string | null;
  film: string | null;
  pakiet_zip: string | null;
  zasady_wykorzystania: string | null;
  inne: string[];
};

type SourceInnovation = {
  id: string;
  nazwa: string;
  kategoria: string;
  etykieta: string | null;
  opis_krotki: string | null;
  problem: string | null;
  dla_kogo: string[];
  kto_moze_wdrozyc: string[];
  czy_dziala: string | null;
  autor_instytucja: string | null;
  materialy: SourceMaterials;
  url: string;
  slowa_kluczowe: string[];
  przyklady_zapytan: string[];
  spoza_biblioteki?: boolean;
  do_matchmakingu?: boolean;
  program?: string;
  zrodlo?: string;
  pewnosc?: "pewne" | "prawdopodobne";
};

type SourcePersona = { imie: string; opis: string; cele: string[]; wyzwania: string[]; motywacje: string[] };

type SourceArea = {
  id: string;
  nr: number;
  nazwa: string;
  strony?: string;
  kategorie_biblioteki: string[];
  definicja: string;
  dane: string[];
  kluczowe_wyzwania: { id: string; tekst: string }[];
  persona: SourcePersona | SourcePersona[]; // zdrowie-psychiczne has two personas

  slowa_kluczowe: string[];
};

// Records from outside the Library go to Matchmaking only with a complete description: pewnosc = "pewne" (9 of 43,
// see biblioteka_spoza_notatki.md, "Jakość opisów"). The do_matchmakingu field in the file takes precedence.
const isForMatchmaking = (i: SourceInnovation & { spoza_biblioteki: boolean }): boolean =>
  !i.spoza_biblioteki || (i.do_matchmakingu ?? i.pewnosc === "pewne");

const personasOf = (o: SourceArea): SourcePersona[] => (o.persona ? [o.persona].flat() : []);

const readData = <T>(file: string): T => JSON.parse(readFileSync(join(DATA, file), "utf8")) as T;

// --- SQL ---
const lit = (v: string | null | undefined): string =>
  v === null || v === undefined ? "null" : `'${v.replace(/'/g, "''")}'`;
const num = (v: number | null | undefined): string => (v === null || v === undefined ? "null" : String(v));
const bool = (v: boolean): string => (v ? "true" : "false");
const arr = (v: string[] | null | undefined): string =>
  !v || v.length === 0 ? "'{}'::text[]" : `array[${v.map(lit).join(", ")}]::text[]`;
const json = (v: unknown): string => `${lit(JSON.stringify(v))}::jsonb`;

function insert(table: string, columns: string[], rows: string[][]): string {
  if (rows.length === 0) return "";
  const values = rows.map((r) => `  (${r.join(", ")})`).join(",\n");
  return `insert into public.${table} (${columns.join(", ")}) values\n${values};\n`;
}

// --- Data ---
const library = readData<{ kategorie: { id: string; nazwa: string; url: string }[]; innowacje: SourceInnovation[] }>(
  "biblioteka.json",
);
const outsideLibrary = readData<{ innowacje: SourceInnovation[] }>("biblioteka_spoza.json");
const map = readData<{ zrodlo: string; obszary: SourceArea[] }>("mapa_wyzwan.json");
const resources = readData<{
  raporty: { id: string; rok: number; tytul: string; tagi: string[]; priorytet_dla_demo?: number; url: string }[];
  publikacje: { id: string; rok: number; tytul: string; opis?: string; url: string; moduly?: string[] }[];
}>("raporty_i_publikacje.json");

// --- Consistency check ---
const errors: string[] = [];
// 6 records from outside the Library have the "inne" category, which the online Library does not have
const categories: { id: string; nazwa: string; url: string | null }[] = [
  ...library.kategorie,
  { id: "inne", nazwa: "Inne", url: null },
];
const categoryIds = new Set(categories.map((k) => k.id));
const innovations = [
  ...library.innowacje.map((i) => ({ ...i, spoza_biblioteki: false })),
  ...outsideLibrary.innowacje.map((i) => ({ ...i, spoza_biblioteki: true })),
];
const ids = new Set<string>();
for (const i of innovations) {
  if (ids.has(i.id)) errors.push(`powtórzone id innowacji: ${i.id}`);
  ids.add(i.id);
  if (!categoryIds.has(i.kategoria)) errors.push(`nieznana kategoria ${i.kategoria} w ${i.id}`);
}
for (const o of map.obszary) {
  for (const k of o.kategorie_biblioteki) {
    if (!categoryIds.has(k)) errors.push(`obszar ${o.id}: nieznana kategoria ${k}`);
  }
}
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

// --- Building the file ---
const parts: string[] = [
  "-- PLIK GENEROWANY: npx tsx scripts/seed/build_seed.ts (nie edytuj ręcznie).",
  "-- Źródło: data/rops/*.json. Dane startowe Zasobnika (moduł II).",
  "begin;",
  "",
  "delete from public.personas;",
  "delete from public.challenges;",
  "delete from public.challenge_areas;",
  "delete from public.innovations;",
  "delete from public.innovation_categories;",
  "delete from public.resources;",
  "",
];

parts.push(
  insert(
    "innovation_categories",
    ["id", "nazwa", "url", "kolejnosc"],
    categories.map((k, n) => [lit(k.id), lit(k.nazwa), lit(k.url), num(n + 1)]),
  ),
);

parts.push(
  insert(
    "innovations",
    [
      "id", "nazwa", "kategoria_id", "etykieta", "sprawdzona_przez_rops", "opis_krotki", "problem",
      "dla_kogo", "kto_moze_wdrozyc", "czy_dziala", "autor_instytucja", "materialy", "url",
      "slowa_kluczowe", "przyklady_zapytan", "spoza_biblioteki", "do_matchmakingu", "program",
      "zrodlo", "pewnosc", "opublikowana",
    ],
    innovations.map((i) => {
      return [
        lit(i.id), lit(i.nazwa), lit(i.kategoria), lit(i.etykieta),
        // "Sprawdzona przez ROPS" = selected for dissemination, only in the online Library
        bool(!i.spoza_biblioteki && i.etykieta !== null),
        lit(i.opis_krotki), lit(i.problem), arr(i.dla_kogo), arr(i.kto_moze_wdrozyc), lit(i.czy_dziala),
        lit(i.autor_instytucja), json(i.materialy), lit(i.url), arr(i.slowa_kluczowe),
        arr(i.przyklady_zapytan), bool(i.spoza_biblioteki), bool(isForMatchmaking(i)), lit(i.program),
        lit(i.zrodlo), lit(i.pewnosc), "true",
      ];
    }),
  ),
);

parts.push(
  insert(
    "challenge_areas",
    ["id", "nr", "nazwa", "definicja", "dane", "slowa_kluczowe", "kategorie_biblioteki", "strony", "zrodlo_url"],
    map.obszary.map((o) => [
      lit(o.id), num(o.nr), lit(o.nazwa), lit(o.definicja), arr(o.dane), arr(o.slowa_kluczowe),
      arr(o.kategorie_biblioteki), lit(o.strony), lit(map.zrodlo),
    ]),
  ),
);

parts.push(
  insert(
    "challenges",
    ["id", "obszar_id", "tekst", "kolejnosc"],
    map.obszary.flatMap((o) =>
      o.kluczowe_wyzwania.map((w, n) => [lit(w.id), lit(o.id), lit(w.tekst), num(n + 1)]),
    ),
  ),
);

parts.push(
  insert(
    "personas",
    ["id", "obszar_id", "imie", "opis", "cele", "wyzwania", "motywacje"],
    map.obszary.flatMap((o) =>
      personasOf(o).map((p, n, all) => [
        lit(all.length > 1 ? `persona-${o.id}-${n + 1}` : `persona-${o.id}`), lit(o.id), lit(p.imie),
        lit(p.opis), arr(p.cele), arr(p.wyzwania), arr(p.motywacje),
      ]),
    ),
  ),
);

parts.push(
  insert(
    "resources",
    ["id", "typ", "rok", "tytul", "opis", "tagi", "moduly", "priorytet_dla_demo", "url"],
    [
      ...resources.raporty.map((r) => [
        lit(r.id), lit("raport"), num(r.rok), lit(r.tytul), "null", arr(r.tagi), "'{}'::text[]",
        num(r.priorytet_dla_demo), lit(r.url),
      ]),
      ...resources.publikacje.map((p) => [
        lit(p.id), lit("publikacja"), num(p.rok), lit(p.tytul), lit(p.opis), "'{}'::text[]",
        arr(p.moduly), "null", lit(p.url),
      ]),
    ],
  ),
);

parts.push("commit;", "");

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, parts.join("\n"), "utf8");

const forMatchmaking = innovations.filter(isForMatchmaking).length;
console.log(
  `seed.sql: ${categories.length} kategorii, ${innovations.length} innowacji ` +
    `(${library.innowacje.length} + ${outsideLibrary.innowacje.length} spoza, ${forMatchmaking} do Matchmakingu), ` +
    `${map.obszary.length} obszarów, ` +
    `${map.obszary.reduce((s, o) => s + o.kluczowe_wyzwania.length, 0)} wyzwań, ` +
    `${map.obszary.flatMap(personasOf).length} person, ` +
    `${resources.raporty.length + resources.publikacje.length} zasobów`,
);
