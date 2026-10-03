// How reports and publications are shown: plain Polish, honest link text, language of parts.
import type { Resource, ResourceFilters } from "@/lib/contracts/knowledge-base";

// Polish plural forms: 1 pozycja, 2–4 pozycje, 5+ pozycji
export function formatItemCount(n: number): string {
  if (n === 1) return "1 pozycja";
  const mod10 = n % 10;
  const mod100 = n % 100;
  return mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? `${n} pozycje` : `${n} pozycji`;
}

// English publication titles get lang="en", so a screen reader switches voice (WCAG 3.1.2).
// Polish titles never contain these words.
const ENGLISH = /\((EN|ENG)\)|\b(the|of|and|to|guide|social|innovations?|canvas)\b/i;

export function resourceLang(r: Pick<Resource, "tytul">): "en" | undefined {
  return ENGLISH.test(r.tytul) ? "en" : undefined;
}

// The source data points at internal files ("– patrz canvas_innowacji.json"); don't show that
export function resourceDescription(opis: string | null): string | null {
  if (!opis) return null;
  const clean = opis.replace(/\s*[–-]\s*patrz\s+[\w.-]+\.json\.?/gi, "").trim();
  if (!clean) return null;
  return /[.!?]$/.test(clean) ? clean : `${clean}.`;
}

// Several reports share a title and differ only by year: put the year into the link text, so
// every link says where it leads (WCAG 2.4.4)
export function resourceLinkLabel(r: Pick<Resource, "tytul" | "rok">, all: Resource[]): string {
  const sameTitle = all.filter((x) => x.tytul === r.tytul).length;
  return sameTitle > 1 && r.rok ? `${r.tytul} (${r.rok})` : r.tytul;
}

// Topic tags in plain words: no unexplained abbreviations
const TAG_LABELS: Record<string, string> = {
  NGO: "organizacje pozarządowe",
  "osoby opuszczające ZK": "osoby opuszczające zakład karny",
};

export function tagLabel(tag: string): string {
  return TAG_LABELS[tag] ?? tag;
}

// Title that reflects the filters (WCAG 2.4.2)
export function resourcesTitle(filters: ResourceFilters, count: number): string {
  const parts = [
    filters.type === "raport" ? "Raporty z badań" : null,
    filters.type === "publikacja" ? "Publikacje o innowacjach" : null,
    filters.year ? String(filters.year) : null,
    filters.tag ? tagLabel(filters.tag) : null,
  ].filter(Boolean);
  const base = "Wiedza o innowacjach – HubMI.pl";
  return parts.length ? `${parts.join(", ")}: ${formatItemCount(count)} – ${base}` : base;
}
