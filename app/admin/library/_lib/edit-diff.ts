import type { Innovation, InnovationEdit } from "@/lib/contracts/knowledge-base";

// What the edit form holds: plain strings and booleans, lists one item per line
export type InnovationForm = {
  nazwa: string;
  kategoria_id: string;
  opis_krotki: string;
  problem: string;
  dla_kogo: string;
  kto_moze_wdrozyc: string;
  czy_dziala: string;
  slowa_kluczowe: string;
  film: string;
  opis_pdf: string;
  pakiet_zip: string;
  zasady_wykorzystania: string;
  url: string;
  sprawdzona_przez_rops: boolean;
  opublikowana: boolean;
  do_matchmakingu: boolean;
};

export function formFromInnovation(i: Innovation): InnovationForm {
  return {
    nazwa: i.nazwa,
    kategoria_id: i.kategoria_id,
    opis_krotki: i.opis_krotki ?? "",
    problem: i.problem ?? "",
    dla_kogo: i.dla_kogo.join("\n"),
    kto_moze_wdrozyc: i.kto_moze_wdrozyc.join("\n"),
    czy_dziala: i.czy_dziala ?? "",
    slowa_kluczowe: i.slowa_kluczowe.join(", "),
    film: i.materialy.film ?? "",
    opis_pdf: i.materialy.opis_pdf ?? "",
    pakiet_zip: i.materialy.pakiet_zip ?? "",
    zasady_wykorzystania: i.materialy.zasady_wykorzystania ?? "",
    url: i.url,
    sprawdzona_przez_rops: i.sprawdzona_przez_rops,
    opublikowana: i.opublikowana,
    do_matchmakingu: i.do_matchmakingu,
  };
}

const lines = (s: string) =>
  s
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);
const keywords = (s: string) =>
  s
    .split(/[,\n]/)
    .map((x) => x.trim())
    .filter(Boolean);
const textOrNull = (s: string) => (s.trim() ? s.trim() : null);
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

// Only the fields that changed, so two editors don't overwrite each other's untouched fields
export function editFromForm(original: Innovation, form: InnovationForm): InnovationEdit {
  const next: Required<InnovationEdit> = {
    nazwa: form.nazwa.trim(),
    kategoria_id: form.kategoria_id,
    etykieta: original.etykieta,
    sprawdzona_przez_rops: form.sprawdzona_przez_rops,
    opis_krotki: textOrNull(form.opis_krotki),
    problem: textOrNull(form.problem),
    dla_kogo: lines(form.dla_kogo),
    kto_moze_wdrozyc: lines(form.kto_moze_wdrozyc),
    czy_dziala: textOrNull(form.czy_dziala),
    materialy: {
      ...original.materialy,
      film: textOrNull(form.film),
      opis_pdf: textOrNull(form.opis_pdf),
      pakiet_zip: textOrNull(form.pakiet_zip),
      zasady_wykorzystania: textOrNull(form.zasady_wykorzystania),
    },
    url: form.url.trim(),
    slowa_kluczowe: keywords(form.slowa_kluczowe),
    do_matchmakingu: form.do_matchmakingu,
    opublikowana: form.opublikowana,
  };
  const changes: InnovationEdit = {};
  for (const key of Object.keys(next) as (keyof InnovationEdit)[]) {
    if (!same(next[key], original[key])) Object.assign(changes, { [key]: next[key] });
  }
  return changes;
}
