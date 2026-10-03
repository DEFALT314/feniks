// Katalog wprost z data/rops: zapas, gdy baza nie jest skonfigurowana albo nie odpowiada.
// Te same reguły co scripts/seed/build_seed.ts.
import biblioteka from "@/data/rops/biblioteka.json";
import spoza from "@/data/rops/biblioteka_spoza.json";
import type { Innowacja, Kategoria, Materialy } from "@/lib/contracts/zasobnik";

type Rekord = {
  id: string;
  nazwa: string;
  kategoria: string;
  etykieta: string | null;
  opis_krotki: string | null;
  problem: string | null;
  dla_kogo: string[];
  kto_moze_wdrozyc: string[];
  czy_dziala: string | null;
  materialy: Materialy;
  url: string;
  slowa_kluczowe: string[];
  program?: string;
  zrodlo?: string;
  pewnosc?: string;
};

export function innowacjaZRekordu(r: Rekord, spozaBiblioteki: boolean): Innowacja {
  const pewnosc = r.pewnosc === "pewne" || r.pewnosc === "prawdopodobne" ? r.pewnosc : null;
  return {
    id: r.id,
    nazwa: r.nazwa,
    kategoria_id: r.kategoria,
    etykieta: r.etykieta,
    sprawdzona_przez_rops: !spozaBiblioteki && r.etykieta !== null,
    opis_krotki: r.opis_krotki,
    dla_kogo: r.dla_kogo,
    slowa_kluczowe: r.slowa_kluczowe,
    spoza_biblioteki: spozaBiblioteki,
    opis_niepelny: spozaBiblioteki && pewnosc !== "pewne",
    ma_film: Boolean(r.materialy.film),
    ma_pdf: Boolean(r.materialy.opis_pdf),
    kto_moze_wdrozyc: r.kto_moze_wdrozyc,
    problem: r.problem,
    czy_dziala: r.czy_dziala,
    materialy: r.materialy,
    url: r.url,
    do_matchmakingu: !spozaBiblioteki || pewnosc === "pewne",
    program: r.program ?? null,
    zrodlo: r.zrodlo ?? null,
    pewnosc,
    opublikowana: true,
    updated_at: "2026-10-03T00:00:00.000Z",
  };
}

export function innowacjeZPlikow(): Innowacja[] {
  return [
    ...(biblioteka.innowacje as Rekord[]).map((r) => innowacjaZRekordu(r, false)),
    ...(spoza.innowacje as Rekord[]).map((r) => innowacjaZRekordu(r, true)),
  ];
}

export function kategorieZPlikow(): Kategoria[] {
  return [
    ...biblioteka.kategorie.map((k) => ({ id: k.id, nazwa: k.nazwa, url: k.url })),
    { id: "inne", nazwa: "Inne", url: null },
  ];
}
