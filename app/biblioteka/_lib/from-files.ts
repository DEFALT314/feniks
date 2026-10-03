// The catalog straight from data/rops: a fallback when the database is not configured or not responding.
// Same rules as scripts/seed/build_seed.ts.
import library from "@/data/rops/biblioteka.json";
import outsideLibrary from "@/data/rops/biblioteka_spoza.json";
import type { Innovation, Category, Materials } from "@/lib/contracts/knowledge-base";

type SourceRecord = {
  id: string;
  nazwa: string;
  kategoria: string;
  etykieta: string | null;
  opis_krotki: string | null;
  problem: string | null;
  dla_kogo: string[];
  kto_moze_wdrozyc: string[];
  czy_dziala: string | null;
  materialy: Materials;
  url: string;
  slowa_kluczowe: string[];
  program?: string;
  zrodlo?: string;
  pewnosc?: string;
};

export function innovationFromRecord(r: SourceRecord, isOutsideLibrary: boolean): Innovation {
  const confidence = r.pewnosc === "pewne" || r.pewnosc === "prawdopodobne" ? r.pewnosc : null;
  return {
    id: r.id,
    nazwa: r.nazwa,
    kategoria_id: r.kategoria,
    etykieta: r.etykieta,
    sprawdzona_przez_rops: !isOutsideLibrary && r.etykieta !== null,
    opis_krotki: r.opis_krotki,
    dla_kogo: r.dla_kogo,
    slowa_kluczowe: r.slowa_kluczowe,
    spoza_biblioteki: isOutsideLibrary,
    opis_niepelny: isOutsideLibrary && confidence !== "pewne",
    ma_film: Boolean(r.materialy.film),
    ma_pdf: Boolean(r.materialy.opis_pdf),
    kto_moze_wdrozyc: r.kto_moze_wdrozyc,
    problem: r.problem,
    czy_dziala: r.czy_dziala,
    materialy: r.materialy,
    url: r.url,
    do_matchmakingu: !isOutsideLibrary || confidence === "pewne",
    program: r.program ?? null,
    zrodlo: r.zrodlo ?? null,
    pewnosc: confidence,
    opublikowana: true,
    updated_at: "2026-10-03T00:00:00.000Z",
  };
}

export function innovationsFromFiles(): Innovation[] {
  return [
    ...(library.innowacje as SourceRecord[]).map((r) => innovationFromRecord(r, false)),
    ...(outsideLibrary.innowacje as SourceRecord[]).map((r) => innovationFromRecord(r, true)),
  ];
}

export function categoriesFromFiles(): Category[] {
  return [
    ...library.kategorie.map((k) => ({ id: k.id, nazwa: k.nazwa, url: k.url })),
    { id: "inne", nazwa: "Inne", url: null },
  ];
}
