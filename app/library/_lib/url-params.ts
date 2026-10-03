import type { LibraryFilters } from "@/lib/contracts/knowledge-base";

// The /library URL with filters; `overrides` replace the current filters (e.g. a different page)
export function libraryUrl(
  filters: LibraryFilters,
  overrides: Partial<LibraryFilters> = {},
): string {
  const f = { ...filters, ...overrides };
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  for (const k of f.category) p.append("category", k);
  if (f.group) p.set("group", f.group);
  if (f.label) p.set("label", f.label);
  if (f.verified) p.set("verified", "1");
  if (f.video) p.set("video", "1");
  if (f.pdf) p.set("pdf", "1");
  if (f.page > 1) p.set("page", String(f.page));
  const query = p.toString();
  return query ? `/library?${query}` : "/library";
}
