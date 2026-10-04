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

/** A shortcut to one of the signed-in user's own pages, for "Twoje sprawy" on the home page. */
export type PersonalTile = { href: string; title: string; text: string };

const PERSONAL_TEXT: Record<string, string> = {
  "/my/creator": "Zapisz pomysł jako krótką fiszkę i wyślij go do ROPS. Tu zobaczysz odpowiedź.",
  "/my/tester": "Zapisz się do testu rozwiązania, oceń je i zaproponuj poprawki.",
  "/my/messages": "Zadaj pytanie pracownikowi ROPS albo ekspertowi i czytaj odpowiedzi.",
  "/my/middleman": "Wybierz innowację i dopasuj ją do swojej gminy jako gotową usługę.",
  "/admin": "Nowe pomysły, karty usług, wiadomości i trendy w jednym miejscu.",
};

/**
 * The user's own pages for the home page, the role's main task first, so all modules are one
 * click from the start page (the header shows only the main one). The profile is left out.
 */
export function personalTiles(
  mainItems: { href: string; label: string }[],
  accountItems: { href: string; label: string }[],
): PersonalTile[] {
  const own = [...mainItems.filter((i) => i.href.startsWith("/my/") || i.href === "/admin")];
  for (const item of accountItems) if (!own.some((o) => o.href === item.href)) own.push(item);
  return own
    .filter((i) => PERSONAL_TEXT[i.href])
    .map((i) => ({ href: i.href, title: i.label, text: PERSONAL_TEXT[i.href] }));
}
