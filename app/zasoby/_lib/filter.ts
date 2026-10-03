import type { ResourceFilters, Resource } from "@/lib/contracts/knowledge-base";

// Newest first; filter by type, year and tag
export function filterResources<T extends Resource>(resources: T[], f: ResourceFilters): T[] {
  return resources
    .filter((r) => !f.typ || r.typ === f.typ)
    .filter((r) => !f.rok || r.rok === f.rok)
    .filter((r) => !f.tag || r.tagi.includes(f.tag))
    .sort((a, b) => (b.rok ?? 0) - (a.rok ?? 0) || a.tytul.localeCompare(b.tytul, "pl"));
}

export function availableValues(resources: Resource[]) {
  return {
    years: [...new Set(resources.flatMap((r) => (r.rok ? [r.rok] : [])))].sort((a, b) => b - a),
    tags: [...new Set(resources.flatMap((r) => r.tagi))].sort((a, b) => a.localeCompare(b, "pl")),
  };
}
