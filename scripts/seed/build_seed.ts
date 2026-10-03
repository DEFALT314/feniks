// Buduje supabase/seed.sql z plików data/rops/*.json (tabele Zasobnika, moduł II).
// Uruchomienie: npx tsx scripts/seed/build_seed.ts
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

const ROOT = join(__dirname, "..", "..");
const DATA = join(ROOT, "data", "rops");
const OUT = join(ROOT, "supabase", "seed.sql");

type Materialy = {
  opis_pdf: string | null;
  film: string | null;
  pakiet_zip: string | null;
  zasady_wykorzystania: string | null;
  inne: string[];
};

type Innowacja = {
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
  materialy: Materialy;
  url: string;
  slowa_kluczowe: string[];
  przyklady_zapytan: string[];
  spoza_biblioteki?: boolean;
  do_matchmakingu?: boolean;
  program?: string;
  zrodlo?: string;
  pewnosc?: "pewne" | "prawdopodobne";
};

type Persona = { imie: string; opis: string; cele: string[]; wyzwania: string[]; motywacje: string[] };

type Obszar = {
  id: string;
  nr: number;
  nazwa: string;
  strony?: string;
  kategorie_biblioteki: string[];
  definicja: string;
  dane: string[];
  kluczowe_wyzwania: { id: string; tekst: string }[];
  persona: Persona | Persona[]; // zdrowie-psychiczne ma dwie persony

  slowa_kluczowe: string[];
};

// Rekordy spoza Biblioteki idą do Matchmakingu tylko z pełnym opisem: pewnosc = "pewne" (9 z 43,
// patrz biblioteka_spoza_notatki.md, „Jakość opisów”). Pole do_matchmakingu w pliku ma pierwszeństwo.
const doMatchmakingu = (i: Innowacja & { spoza_biblioteki: boolean }): boolean =>
  !i.spoza_biblioteki || (i.do_matchmakingu ?? i.pewnosc === "pewne");

const persony = (o: Obszar): Persona[] => (o.persona ? [o.persona].flat() : []);

const czytaj = <T>(plik: string): T => JSON.parse(readFileSync(join(DATA, plik), "utf8")) as T;

// --- SQL ---
const lit = (v: string | null | undefined): string =>
  v === null || v === undefined ? "null" : `'${v.replace(/'/g, "''")}'`;
const num = (v: number | null | undefined): string => (v === null || v === undefined ? "null" : String(v));
const bool = (v: boolean): string => (v ? "true" : "false");
const arr = (v: string[] | null | undefined): string =>
  !v || v.length === 0 ? "'{}'::text[]" : `array[${v.map(lit).join(", ")}]::text[]`;
const json = (v: unknown): string => `${lit(JSON.stringify(v))}::jsonb`;

function insert(tabela: string, kolumny: string[], wiersze: string[][]): string {
  if (wiersze.length === 0) return "";
  const values = wiersze.map((w) => `  (${w.join(", ")})`).join(",\n");
  return `insert into public.${tabela} (${kolumny.join(", ")}) values\n${values};\n`;
}

// --- Dane ---
const biblioteka = czytaj<{ kategorie: { id: string; nazwa: string; url: string }[]; innowacje: Innowacja[] }>(
  "biblioteka.json",
);
const spoza = czytaj<{ innowacje: Innowacja[] }>("biblioteka_spoza.json");
const mapa = czytaj<{ zrodlo: string; obszary: Obszar[] }>("mapa_wyzwan.json");
const zasoby = czytaj<{
  raporty: { id: string; rok: number; tytul: string; tagi: string[]; priorytet_dla_demo?: number; url: string }[];
  publikacje: { id: string; rok: number; tytul: string; opis?: string; url: string; moduly?: string[] }[];
}>("raporty_i_publikacje.json");

// --- Kontrola spójności ---
const bledy: string[] = [];
// 6 rekordów spoza Biblioteki ma kategorię „inne”, której nie ma w Bibliotece online
const kategorie: { id: string; nazwa: string; url: string | null }[] = [
  ...biblioteka.kategorie,
  { id: "inne", nazwa: "Inne", url: null },
];
const kategorieIds = new Set(kategorie.map((k) => k.id));
const innowacje = [
  ...biblioteka.innowacje.map((i) => ({ ...i, spoza_biblioteki: false })),
  ...spoza.innowacje.map((i) => ({ ...i, spoza_biblioteki: true })),
];
const ids = new Set<string>();
for (const i of innowacje) {
  if (ids.has(i.id)) bledy.push(`powtórzone id innowacji: ${i.id}`);
  ids.add(i.id);
  if (!kategorieIds.has(i.kategoria)) bledy.push(`nieznana kategoria ${i.kategoria} w ${i.id}`);
}
for (const o of mapa.obszary) {
  for (const k of o.kategorie_biblioteki) {
    if (!kategorieIds.has(k)) bledy.push(`obszar ${o.id}: nieznana kategoria ${k}`);
  }
}
if (bledy.length) {
  console.error(bledy.join("\n"));
  process.exit(1);
}

// --- Budowa pliku ---
const czesci: string[] = [
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

czesci.push(
  insert(
    "innovation_categories",
    ["id", "nazwa", "url", "kolejnosc"],
    kategorie.map((k, n) => [lit(k.id), lit(k.nazwa), lit(k.url), num(n + 1)]),
  ),
);

czesci.push(
  insert(
    "innovations",
    [
      "id", "nazwa", "kategoria_id", "etykieta", "sprawdzona_przez_rops", "opis_krotki", "problem",
      "dla_kogo", "kto_moze_wdrozyc", "czy_dziala", "autor_instytucja", "materialy", "url",
      "slowa_kluczowe", "przyklady_zapytan", "spoza_biblioteki", "do_matchmakingu", "program",
      "zrodlo", "pewnosc", "opublikowana",
    ],
    innowacje.map((i) => {
      return [
        lit(i.id), lit(i.nazwa), lit(i.kategoria), lit(i.etykieta),
        // „Sprawdzona przez ROPS” = wybrana do upowszechniania, tylko w Bibliotece online
        bool(!i.spoza_biblioteki && i.etykieta !== null),
        lit(i.opis_krotki), lit(i.problem), arr(i.dla_kogo), arr(i.kto_moze_wdrozyc), lit(i.czy_dziala),
        lit(i.autor_instytucja), json(i.materialy), lit(i.url), arr(i.slowa_kluczowe),
        arr(i.przyklady_zapytan), bool(i.spoza_biblioteki), bool(doMatchmakingu(i)), lit(i.program),
        lit(i.zrodlo), lit(i.pewnosc), "true",
      ];
    }),
  ),
);

czesci.push(
  insert(
    "challenge_areas",
    ["id", "nr", "nazwa", "definicja", "dane", "slowa_kluczowe", "kategorie_biblioteki", "strony", "zrodlo_url"],
    mapa.obszary.map((o) => [
      lit(o.id), num(o.nr), lit(o.nazwa), lit(o.definicja), arr(o.dane), arr(o.slowa_kluczowe),
      arr(o.kategorie_biblioteki), lit(o.strony), lit(mapa.zrodlo),
    ]),
  ),
);

czesci.push(
  insert(
    "challenges",
    ["id", "obszar_id", "tekst", "kolejnosc"],
    mapa.obszary.flatMap((o) =>
      o.kluczowe_wyzwania.map((w, n) => [lit(w.id), lit(o.id), lit(w.tekst), num(n + 1)]),
    ),
  ),
);

czesci.push(
  insert(
    "personas",
    ["id", "obszar_id", "imie", "opis", "cele", "wyzwania", "motywacje"],
    mapa.obszary.flatMap((o) =>
      persony(o).map((p, n, wszystkie) => [
        lit(wszystkie.length > 1 ? `persona-${o.id}-${n + 1}` : `persona-${o.id}`), lit(o.id), lit(p.imie),
        lit(p.opis), arr(p.cele), arr(p.wyzwania), arr(p.motywacje),
      ]),
    ),
  ),
);

czesci.push(
  insert(
    "resources",
    ["id", "typ", "rok", "tytul", "opis", "tagi", "moduly", "priorytet_dla_demo", "url"],
    [
      ...zasoby.raporty.map((r) => [
        lit(r.id), lit("raport"), num(r.rok), lit(r.tytul), "null", arr(r.tagi), "'{}'::text[]",
        num(r.priorytet_dla_demo), lit(r.url),
      ]),
      ...zasoby.publikacje.map((p) => [
        lit(p.id), lit("publikacja"), num(p.rok), lit(p.tytul), lit(p.opis), "'{}'::text[]",
        arr(p.moduly), "null", lit(p.url),
      ]),
    ],
  ),
);

czesci.push("commit;", "");

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, czesci.join("\n"), "utf8");

const doMatch = innowacje.filter(doMatchmakingu).length;
console.log(
  `seed.sql: ${kategorie.length} kategorii, ${innowacje.length} innowacji ` +
    `(${biblioteka.innowacje.length} + ${spoza.innowacje.length} spoza, ${doMatch} do Matchmakingu), ` +
    `${mapa.obszary.length} obszarów, ` +
    `${mapa.obszary.reduce((s, o) => s + o.kluczowe_wyzwania.length, 0)} wyzwań, ` +
    `${mapa.obszary.flatMap(persony).length} person, ` +
    `${zasoby.raporty.length + zasoby.publikacje.length} zasobów`,
);
