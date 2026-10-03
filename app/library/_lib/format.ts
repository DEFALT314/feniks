import type { Category, LibraryFilters } from "@/lib/contracts/knowledge-base";

// Polish plural forms: 1 innowacja, 2–4 innowacje, 5+ innowacji
export function formatResultCount(n: number): string {
  if (n === 1) return "1 innowacja";
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} innowacje`;
  return `${n} innowacji`;
}

// What the visitor searched for, in words: "Dla seniorów · „pamięć” · z filmem"
export function filterSummary(filters: LibraryFilters, categories: Category[]): string {
  const selected = categories.filter((k) => filters.category.includes(k.id)).map((k) => k.nazwa);
  return [
    selected.length ? selected.join(", ") : null,
    filters.q ? `„${filters.q}”` : null,
    filters.verified ? "sprawdzone przez ROPS" : null,
    filters.video ? "z filmem" : null,
    filters.pdf ? "z opisem PDF" : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

// Page title that reflects the search and the page (WCAG 2.4.2), e.g.
// "Dla seniorów: 30 innowacji – strona 2 – Biblioteka innowacji – HubMI.pl"
export function libraryTitle({
  summary,
  count,
  page,
}: {
  summary: string;
  count: number;
  page: number;
}): string {
  const parts: string[] = [];
  if (summary) parts.push(`${summary}: ${formatResultCount(count)}`);
  if (page > 1) parts.push(`strona ${page}`);
  parts.push("Biblioteka innowacji – HubMI.pl");
  return parts.join(" – ");
}

// "Zapytaj ROPS" opens a new message about this innovation, not the list of conversations
export function askRopsUrl(id: string, name: string): string {
  const p = new URLSearchParams({ innovation: id, topic: `Pytanie o innowację: ${name}` });
  return `/my/messages/new?${p.toString()}`;
}
