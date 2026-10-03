// Library search and filters. Pure functions: we filter the whole catalog (about 160 items) in memory.
import type {
  LibraryFilters,
  Innovation,
  InnovationSummary,
  InnovationList,
} from "@/lib/contracts/knowledge-base";

export const PAGE_SIZE = 20;

// "Samotność Seniorów" → "samotnosc seniorow"
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/ł/g, "l")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// A simple stem instead of full inflection: "seniorow" and "seniorzy" → "senio"
export function stem(word: string): string {
  return word.length <= 4 ? word : word.slice(0, Math.max(4, word.length - 3));
}

// Polish stop words
const STOP_WORDS = new Set([
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

export function queryStems(q: string | undefined): string[] {
  if (!q) return [];
  const words = normalize(q)
    .split(" ")
    .filter((s) => s.length >= 2 && !STOP_WORDS.has(s));
  return [...new Set(words.map(stem))];
}

const WEIGHTS = { name: 4, keywords: 3, audience: 2, description: 1 } as const;

// How many query stems match and with what weight; null = nothing matches
export function score(i: Innovation, stems: string[]): { matched: number; points: number } | null {
  if (stems.length === 0) return { matched: 0, points: 0 };
  const fields: [keyof typeof WEIGHTS, string][] = [
    ["name", i.nazwa],
    ["keywords", i.slowa_kluczowe.join(" ")],
    ["audience", i.dla_kogo.join(" ")],
    ["description", `${i.opis_krotki ?? ""} ${i.problem ?? ""}`],
  ];
  const fieldWords = fields.map(([key, text]) => [key, normalize(text).split(" ")] as const);
  let matched = 0;
  let points = 0;
  for (const s of stems) {
    let best = 0;
    for (const [key, words] of fieldWords) {
      if (words.some((w) => w.startsWith(s))) best = Math.max(best, WEIGHTS[key]);
    }
    if (best > 0) {
      matched += 1;
      points += best;
    }
  }
  return matched === 0 ? null : { matched, points };
}

export function toSummary(i: Innovation): InnovationSummary {
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

type FilterKey = "category" | "group" | "label" | "verified" | "video" | "pdf";

// Whether the innovation passes the filters; `skip` lets us compute the count next to a given filter
function passesFilters(i: Innovation, f: LibraryFilters, skip?: FilterKey): boolean {
  if (skip !== "category" && f.category.length > 0 && !f.category.includes(i.kategoria_id))
    return false;
  if (skip !== "group" && f.group && !i.dla_kogo.includes(f.group)) return false;
  if (skip !== "label" && f.label && i.etykieta !== f.label) return false;
  if (skip !== "verified" && f.verified && !i.sprawdzona_przez_rops) return false;
  if (skip !== "video" && f.video && !i.ma_film) return false;
  if (skip !== "pdf" && f.pdf && !i.ma_pdf) return false;
  return true;
}

export function search(
  all: Innovation[],
  filters: LibraryFilters,
  availableFilters: InnovationList["dostepne_filtry"],
  pageSize = PAGE_SIZE,
): InnovationList {
  const stems = queryStems(filters.q);
  const matching = all
    .filter((i) => i.opublikowana)
    .map((i) => ({ i, s: score(i, stems) }))
    .filter((x): x is { i: Innovation; s: { matched: number; points: number } } => x.s !== null);

  const counts: InnovationList["liczniki"] = { kategorie: {}, sprawdzona: 0, film: 0, pdf: 0 };
  for (const { i } of matching) {
    if (passesFilters(i, filters, "category")) {
      counts.kategorie[i.kategoria_id] = (counts.kategorie[i.kategoria_id] ?? 0) + 1;
    }
    if (i.sprawdzona_przez_rops && passesFilters(i, filters, "verified")) counts.sprawdzona += 1;
    if (i.ma_film && passesFilters(i, filters, "video")) counts.film += 1;
    if (i.ma_pdf && passesFilters(i, filters, "pdf")) counts.pdf += 1;
  }

  // Best matches first, then checked by ROPS, then from the online Library, incomplete descriptions last
  const results = matching
    .filter(({ i }) => passesFilters(i, filters))
    .sort(
      (a, b) =>
        b.s.matched - a.s.matched ||
        b.s.points - a.s.points ||
        Number(b.i.sprawdzona_przez_rops) - Number(a.i.sprawdzona_przez_rops) ||
        Number(a.i.spoza_biblioteki) - Number(b.i.spoza_biblioteki) ||
        Number(a.i.opis_niepelny) - Number(b.i.opis_niepelny) ||
        a.i.nazwa.localeCompare(b.i.nazwa, "pl"),
    )
    .map(({ i }) => i);

  const pageCount = Math.max(1, Math.ceil(results.length / pageSize));
  const page = Math.min(filters.page, pageCount);
  return {
    wyniki: results.slice((page - 1) * pageSize, page * pageSize).map(toSummary),
    liczba: results.length,
    strona: page,
    liczba_stron: pageCount,
    dostepne_filtry: availableFilters,
    liczniki: counts,
  };
}
