import type { LibraryFilters } from "@/lib/contracts/knowledge-base";

// The /biblioteka URL with filters; `overrides` replace the current filters (e.g. a different page)
export function libraryUrl(
  filters: LibraryFilters,
  overrides: Partial<LibraryFilters> = {},
): string {
  const f = { ...filters, ...overrides };
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  for (const k of f.kategoria) p.append("kategoria", k);
  if (f.grupa) p.set("grupa", f.grupa);
  if (f.etykieta) p.set("etykieta", f.etykieta);
  if (f.sprawdzona) p.set("sprawdzona", "1");
  if (f.film) p.set("film", "1");
  if (f.pdf) p.set("pdf", "1");
  if (f.strona > 1) p.set("strona", String(f.strona));
  const query = p.toString();
  return query ? `/biblioteka?${query}` : "/biblioteka";
}
