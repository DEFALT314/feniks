// Buduje lib/contracts/fixtures/zasobnik.json z prawdziwych rekordów data/rops (kontrakt: lib/contracts/zasobnik.ts).
// Uruchomienie: npx tsx scripts/seed/build_fixtures.ts
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { innowacjaZRekordu } from "../../app/biblioteka/_lib/z-plikow";
import { skrot, szukaj } from "../../app/biblioteka/_lib/szukaj";

const ROOT = join(__dirname, "..", "..");
const DATA = join(ROOT, "data", "rops");
const OUT = join(ROOT, "lib", "contracts", "fixtures", "zasobnik.json");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Rekord = Record<string, any>;
const czytaj = (plik: string): Rekord => JSON.parse(readFileSync(join(DATA, plik), "utf8"));

const biblioteka = czytaj("biblioteka.json");
const spoza = czytaj("biblioteka_spoza.json");
const mapa = czytaj("mapa_wyzwan.json");
const zasoby = czytaj("raporty_i_publikacje.json");

const kategorie = [...biblioteka.kategorie, { id: "inne", nazwa: "Inne", url: null }].map((k: Rekord) => ({
  id: k.id,
  nazwa: k.nazwa,
  url: k.url,
}));

const karta = (i: Rekord, spozaBiblioteki: boolean) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ({ ...innowacjaZRekordu(i as any, spozaBiblioteki), updated_at: "2026-10-03T12:00:00.000Z" });

// Przykłady: sprawdzona z filmem, zwykła z Biblioteki, spoza pełna i spoza z niepełnym opisem
const zBiblioteki = biblioteka.innowacje as Rekord[];
const zSpoza = spoza.innowacje as Rekord[];
const wybrane = [
  karta(zBiblioteki.find((i) => i.id === "bawita")!, false),
  karta(zBiblioteki.find((i) => i.etykieta === null && i.kategoria === "dla-seniorow")!, false),
  karta(zBiblioteki.find((i) => i.etykieta && i.kategoria === "dla-osob-z-niepelnosprawnoscia-sensoryczna")!, false),
  karta(zSpoza.find((i) => i.pewnosc === "pewne")!, true),
  karta(zSpoza.find((i) => i.pewnosc === "prawdopodobne")!, true),
];

const obszar = (o: Rekord) => ({
  id: o.id,
  nr: o.nr,
  nazwa: o.nazwa,
  definicja: o.definicja,
  dane: o.dane,
  slowa_kluczowe: o.slowa_kluczowe,
  kategorie_biblioteki: o.kategorie_biblioteki,
  zrodlo_url: mapa.zrodlo,
});

const seniorzy = (mapa.obszary as Rekord[]).find((o) => o.id === "seniorzy")!;
const persony = [seniorzy.persona].flat().map((p: Rekord) => ({
  id: "persona-seniorzy",
  obszar_id: "seniorzy",
  imie: p.imie,
  opis: p.opis,
  cele: p.cele,
  wyzwania: p.wyzwania,
  motywacje: p.motywacje,
}));

const fixtures = {
  kategorie,
  lista_innowacji: szukaj(
    wybrane,
    { kategoria: [], sprawdzona: false, film: false, pdf: false, strona: 1 },
    {
      kategorie,
      grupy: [...new Set(wybrane.flatMap((k) => k.dla_kogo))].sort(),
      etykiety: ["IWS", "Inkubator Dostępności", "MIIS", "MIWS"],
    },
  ),
  innowacja: wybrane[0],
  innowacje: wybrane,
  obszary: (mapa.obszary as Rekord[]).map(obszar),
  obszar_szczegoly: {
    ...obszar(seniorzy),
    wyzwania: (seniorzy.kluczowe_wyzwania as Rekord[]).map((w) => ({ id: w.id, obszar_id: "seniorzy", tekst: w.tekst })),
    persony,
    innowacje: wybrane.filter((k) => k.kategoria_id === "dla-seniorow").map(skrot),
  },
  zasoby: [
    ...(zasoby.raporty as Rekord[]).slice(0, 3).map((r) => ({
      id: r.id, typ: "raport", rok: r.rok, tytul: r.tytul, opis: null, tagi: r.tagi, url: r.url,
    })),
    ...(zasoby.publikacje as Rekord[]).slice(0, 2).map((p) => ({
      id: p.id, typ: "publikacja", rok: p.rok, tytul: p.tytul, opis: p.opis ?? null, tagi: [], url: p.url,
    })),
  ],
  edycja_innowacji: { opis_krotki: "Poprawiony opis z panelu ROPS.", sprawdzona_przez_rops: true },
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(fixtures, null, 2) + "\n", "utf8");
console.log(`fixtures: ${wybrane.length} innowacji, ${fixtures.obszary.length} obszarów, ${fixtures.zasoby.length} zasobów`);
