import type { Category, InnovationSummary } from "@/lib/contracts/knowledge-base";

export type HomeStats = {
  libraryInnovations: number;
  checkedByRops: number;
  challenges: number;
  categories: number;
};

type AreaWithChallenges = { wyzwania: unknown[] };

/** The numbers under the hero: only ROPS Library items count, not the ones from outside it. */
export function homeStats(
  innovations: InnovationSummary[],
  categories: Category[],
  areas: AreaWithChallenges[],
): HomeStats {
  const library = innovations.filter((i) => !i.spoza_biblioteki);
  const usedCategories = new Set(library.map((i) => i.kategoria_id));
  return {
    libraryInnovations: library.length,
    checkedByRops: library.filter((i) => i.sprawdzona_przez_rops).length,
    challenges: areas.reduce((sum, a) => sum + a.wyzwania.length, 0),
    categories: categories.filter((k) => usedCategories.has(k.id)).length,
  };
}

/**
 * Innovations for "Wybrane do upowszechniania": the preferred ones first (in order), then other
 * ROPS-checked ones, so the section stays full if an id disappears from the Library.
 */
export function pickFeatured<T extends InnovationSummary>(
  innovations: T[],
  preferredIds: readonly string[],
  count = 3,
): T[] {
  const checked = innovations.filter((i) => i.sprawdzona_przez_rops && !i.spoza_biblioteki);
  const preferred = preferredIds.flatMap((id) => checked.filter((i) => i.id === id));
  const rest = checked.filter((i) => !preferredIds.includes(i.id));
  return [...preferred, ...rest].slice(0, count);
}

/** Polish plural form for the stat labels: 1 innowacja, 2–4 innowacje, 5+ innowacji. */
export function plural(n: number, one: string, few: string, many: string): string {
  if (n === 1) return one;
  const lastTwo = n % 100;
  const last = n % 10;
  if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return few;
  return many;
}
