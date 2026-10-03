// Wyszukiwanie i filtry Biblioteki. Czyste funkcje: cały katalog (ok. 160 pozycji) filtrujemy w pamięci.
import type {
  FiltryBiblioteki,
  Innowacja,
  InnowacjaSkrot,
  ListaInnowacji,
} from "@/lib/contracts/zasobnik";

export const NA_STRONE = 20;

// „Samotność Seniorów” → „samotnosc seniorow”
export function normalizuj(tekst: string): string {
  return tekst
    .toLowerCase()
    .replace(/ł/g, "l")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Prosty rdzeń zamiast pełnej odmiany: „seniorow” i „seniorzy” → „senio”
export function rdzen(slowo: string): string {
  return slowo.length <= 4 ? slowo : slowo.slice(0, Math.max(4, slowo.length - 3));
}

const POMIJANE = new Set([
  "i",
  "w",
  "z",
  "na",
  "do",
  "dla",
  "o",
  "od",
  "po",
  "oraz",
  "lub",
  "sie",
  "jak",
  "nie",
  "to",
]);

export function rdzenieZapytania(q: string | undefined): string[] {
  if (!q) return [];
  const slowa = normalizuj(q)
    .split(" ")
    .filter((s) => s.length >= 2 && !POMIJANE.has(s));
  return [...new Set(slowa.map(rdzen))];
}

const WAGI = { nazwa: 4, slowa: 3, dla_kogo: 2, opis: 1 } as const;

// Ile rdzeni zapytania pasuje i z jaką wagą; null = nic nie pasuje
export function ocena(
  i: Innowacja,
  rdzenie: string[],
): { trafione: number; punkty: number } | null {
  if (rdzenie.length === 0) return { trafione: 0, punkty: 0 };
  const pola: [keyof typeof WAGI, string][] = [
    ["nazwa", i.nazwa],
    ["slowa", i.slowa_kluczowe.join(" ")],
    ["dla_kogo", i.dla_kogo.join(" ")],
    ["opis", `${i.opis_krotki ?? ""} ${i.problem ?? ""}`],
  ];
  const slowaPol = pola.map(([klucz, tekst]) => [klucz, normalizuj(tekst).split(" ")] as const);
  let trafione = 0;
  let punkty = 0;
  for (const r of rdzenie) {
    let najlepsza = 0;
    for (const [klucz, slowa] of slowaPol) {
      if (slowa.some((s) => s.startsWith(r))) najlepsza = Math.max(najlepsza, WAGI[klucz]);
    }
    if (najlepsza > 0) {
      trafione += 1;
      punkty += najlepsza;
    }
  }
  return trafione === 0 ? null : { trafione, punkty };
}

export function skrot(i: Innowacja): InnowacjaSkrot {
  return {
    id: i.id,
    nazwa: i.nazwa,
    kategoria_id: i.kategoria_id,
    etykieta: i.etykieta,
    sprawdzona_przez_rops: i.sprawdzona_przez_rops,
    opis_krotki: i.opis_krotki,
    dla_kogo: i.dla_kogo,
    slowa_kluczowe: i.slowa_kluczowe,
    spoza_biblioteki: i.spoza_biblioteki,
    opis_niepelny: i.opis_niepelny,
    ma_film: i.ma_film,
    ma_pdf: i.ma_pdf,
    kto_moze_wdrozyc: i.kto_moze_wdrozyc,
  };
}

type Filtr = "kategoria" | "grupa" | "etykieta" | "sprawdzona" | "film" | "pdf";

// Czy innowacja przechodzi filtry; `pomin` pozwala policzyć liczniki przy danym filtrze
function przechodzi(i: Innowacja, f: FiltryBiblioteki, pomin?: Filtr): boolean {
  if (pomin !== "kategoria" && f.kategoria.length > 0 && !f.kategoria.includes(i.kategoria_id))
    return false;
  if (pomin !== "grupa" && f.grupa && !i.dla_kogo.includes(f.grupa)) return false;
  if (pomin !== "etykieta" && f.etykieta && i.etykieta !== f.etykieta) return false;
  if (pomin !== "sprawdzona" && f.sprawdzona && !i.sprawdzona_przez_rops) return false;
  if (pomin !== "film" && f.film && !i.ma_film) return false;
  if (pomin !== "pdf" && f.pdf && !i.ma_pdf) return false;
  return true;
}

export function szukaj(
  wszystkie: Innowacja[],
  filtry: FiltryBiblioteki,
  dostepneFiltry: ListaInnowacji["dostepne_filtry"],
  naStrone = NA_STRONE,
): ListaInnowacji {
  const rdzenie = rdzenieZapytania(filtry.q);
  const pasujace = wszystkie
    .filter((i) => i.opublikowana)
    .map((i) => ({ i, o: ocena(i, rdzenie) }))
    .filter((x): x is { i: Innowacja; o: { trafione: number; punkty: number } } => x.o !== null);

  const liczniki: ListaInnowacji["liczniki"] = { kategorie: {}, sprawdzona: 0, film: 0, pdf: 0 };
  for (const { i } of pasujace) {
    if (przechodzi(i, filtry, "kategoria")) {
      liczniki.kategorie[i.kategoria_id] = (liczniki.kategorie[i.kategoria_id] ?? 0) + 1;
    }
    if (i.sprawdzona_przez_rops && przechodzi(i, filtry, "sprawdzona")) liczniki.sprawdzona += 1;
    if (i.ma_film && przechodzi(i, filtry, "film")) liczniki.film += 1;
    if (i.ma_pdf && przechodzi(i, filtry, "pdf")) liczniki.pdf += 1;
  }

  // Najpierw najlepiej pasujące, potem sprawdzone przez ROPS, potem z Biblioteki online, na końcu z niepełnym opisem
  const wyniki = pasujace
    .filter(({ i }) => przechodzi(i, filtry))
    .sort(
      (a, b) =>
        b.o.trafione - a.o.trafione ||
        b.o.punkty - a.o.punkty ||
        Number(b.i.sprawdzona_przez_rops) - Number(a.i.sprawdzona_przez_rops) ||
        Number(a.i.spoza_biblioteki) - Number(b.i.spoza_biblioteki) ||
        Number(a.i.opis_niepelny) - Number(b.i.opis_niepelny) ||
        a.i.nazwa.localeCompare(b.i.nazwa, "pl"),
    )
    .map(({ i }) => i);

  const liczba_stron = Math.max(1, Math.ceil(wyniki.length / naStrone));
  const strona = Math.min(filtry.strona, liczba_stron);
  return {
    wyniki: wyniki.slice((strona - 1) * naStrone, strona * naStrone).map(skrot),
    liczba: wyniki.length,
    strona,
    liczba_stron,
    dostepne_filtry: dostepneFiltry,
    liczniki,
  };
}
