// Builds lib/contracts/fixtures/knowledge-base.json from real data/rops records (contract: lib/contracts/knowledge-base.ts).
// Run: npx tsx scripts/seed/build_fixtures.ts
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { innovationFromRecord } from "../../app/biblioteka/_lib/from-files";
import { toSummary, search } from "../../app/biblioteka/_lib/search";

const ROOT = join(__dirname, "..", "..");
const DATA = join(ROOT, "data", "rops");
const OUT = join(ROOT, "lib", "contracts", "fixtures", "knowledge-base.json");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SourceRecord = Record<string, any>;
const readData = (file: string): SourceRecord => JSON.parse(readFileSync(join(DATA, file), "utf8"));

const library = readData("biblioteka.json");
const outsideLibrary = readData("biblioteka_spoza.json");
const map = readData("mapa_wyzwan.json");
const resources = readData("raporty_i_publikacje.json");

const categories = [...library.kategorie, { id: "inne", nazwa: "Inne", url: null }].map((k: SourceRecord) => ({
  id: k.id,
  nazwa: k.nazwa,
  url: k.url,
}));

const card = (i: SourceRecord, isOutsideLibrary: boolean) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ({ ...innovationFromRecord(i as any, isOutsideLibrary), updated_at: "2026-10-03T12:00:00.000Z" });

// Samples: checked with a film, a regular Library one, a complete outside one and an outside one with an incomplete description
const fromLibrary = library.innowacje as SourceRecord[];
const fromOutside = outsideLibrary.innowacje as SourceRecord[];
const selected = [
  card(fromLibrary.find((i) => i.id === "bawita")!, false),
  card(fromLibrary.find((i) => i.etykieta === null && i.kategoria === "dla-seniorow")!, false),
  card(fromLibrary.find((i) => i.etykieta && i.kategoria === "dla-osob-z-niepelnosprawnoscia-sensoryczna")!, false),
  card(fromOutside.find((i) => i.pewnosc === "pewne")!, true),
  card(fromOutside.find((i) => i.pewnosc === "prawdopodobne")!, true),
];

const area = (o: SourceRecord) => ({
  id: o.id,
  nr: o.nr,
  nazwa: o.nazwa,
  definicja: o.definicja,
  dane: o.dane,
  slowa_kluczowe: o.slowa_kluczowe,
  kategorie_biblioteki: o.kategorie_biblioteki,
  zrodlo_url: map.zrodlo,
});

const seniors = (map.obszary as SourceRecord[]).find((o) => o.id === "seniorzy")!;
const personas = [seniors.persona].flat().map((p: SourceRecord) => ({
  id: "persona-seniorzy",
  obszar_id: "seniorzy",
  imie: p.imie,
  opis: p.opis,
  cele: p.cele,
  wyzwania: p.wyzwania,
  motywacje: p.motywacje,
}));

const fixtures = {
  categories,
  innovation_list: search(
    selected,
    { kategoria: [], sprawdzona: false, film: false, pdf: false, strona: 1 },
    {
      kategorie: categories,
      grupy: [...new Set(selected.flatMap((k) => k.dla_kogo))].sort(),
      etykiety: ["IWS", "Inkubator Dostępności", "MIIS", "MIWS"],
    },
  ),
  innovation: selected[0],
  innovations: selected,
  challenge_areas: (map.obszary as SourceRecord[]).map(area),
  challenge_area_details: {
    ...area(seniors),
    wyzwania: (seniors.kluczowe_wyzwania as SourceRecord[]).map((w) => ({ id: w.id, obszar_id: "seniorzy", tekst: w.tekst })),
    persony: personas,
    innowacje: selected.filter((k) => k.kategoria_id === "dla-seniorow").map(toSummary),
  },
  resources: [
    ...(resources.raporty as SourceRecord[]).slice(0, 3).map((r) => ({
      id: r.id, typ: "raport", rok: r.rok, tytul: r.tytul, opis: null, tagi: r.tagi, url: r.url,
    })),
    ...(resources.publikacje as SourceRecord[]).slice(0, 2).map((p) => ({
      id: p.id, typ: "publikacja", rok: p.rok, tytul: p.tytul, opis: p.opis ?? null, tagi: [], url: p.url,
    })),
  ],
  innovation_edit: { opis_krotki: "Poprawiony opis z panelu ROPS.", sprawdzona_przez_rops: true },
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(fixtures, null, 2) + "\n", "utf8");
console.log(`fixtures: ${selected.length} innowacji, ${fixtures.challenge_areas.length} obszarów, ${fixtures.resources.length} zasobów`);
