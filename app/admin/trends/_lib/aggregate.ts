// Needs in the region (#9): match queries and ideas sent to ROPS, counted by Challenges Map area and challenge.
import type { FullChallengeArea } from "@/app/challenge-map/_lib/from-files";

export type QueryRow = {
  area_id: string | null;
  challenge_id: string | null;
  match_quality: "strong" | "weak";
};
export type IdeaRow = { obszar_id: string | null };

export type AreaTrend = {
  id: string;
  name: string;
  queries: number;
  ideas: number;
  total: number;
  // Queries without a good match: a possible gap in the Library
  weak: number;
};

export type ChallengeTrend = {
  id: string;
  text: string;
  areaName: string;
  count: number;
  // Of these, searches without a good match: a gap in the Library for this exact challenge
  weak: number;
};

export type Trends = {
  areas: AreaTrend[];
  challenges: ChallengeTrend[];
  total: number;
  unassigned: number;
};

export const PERIODS = [7, 30, 90] as const;
export type Period = (typeof PERIODS)[number];

export function parsePeriod(value: unknown): Period {
  const n = Number(value);
  return (PERIODS as readonly number[]).includes(n) ? (n as Period) : 30;
}

export function aggregateTrends(
  areas: FullChallengeArea[],
  queries: QueryRow[],
  ideas: IdeaRow[],
  topChallenges = 5,
): Trends {
  const byArea = new Map<string, AreaTrend>(
    areas.map((a) => [a.id, { id: a.id, name: a.nazwa, queries: 0, ideas: 0, total: 0, weak: 0 }]),
  );
  let unassigned = 0;

  for (const q of queries) {
    const area = q.area_id ? byArea.get(q.area_id) : undefined;
    if (!area) {
      unassigned += 1;
      continue;
    }
    area.queries += 1;
    area.total += 1;
    if (q.match_quality === "weak") area.weak += 1;
  }
  for (const i of ideas) {
    const area = i.obszar_id ? byArea.get(i.obszar_id) : undefined;
    if (!area) {
      unassigned += 1;
      continue;
    }
    area.ideas += 1;
    area.total += 1;
  }

  const challengeInfo = new Map(
    areas.flatMap((a) =>
      a.wyzwania.map((w) => [w.id, { text: w.tekst, areaName: a.nazwa }] as const),
    ),
  );
  const challengeCounts = new Map<string, { count: number; weak: number }>();
  for (const q of queries) {
    if (q.challenge_id && challengeInfo.has(q.challenge_id)) {
      const c = challengeCounts.get(q.challenge_id) ?? { count: 0, weak: 0 };
      c.count += 1;
      if (q.match_quality === "weak") c.weak += 1;
      challengeCounts.set(q.challenge_id, c);
    }
  }

  return {
    areas: [...byArea.values()].sort(
      (a, b) => b.total - a.total || a.name.localeCompare(b.name, "pl"),
    ),
    challenges: [...challengeCounts.entries()]
      .map(([id, c]) => ({ id, ...c, ...challengeInfo.get(id)! }))
      .sort((a, b) => b.count - a.count || a.text.localeCompare(b.text, "pl"))
      .slice(0, topChallenges),
    total: queries.length + ideas.length,
    unassigned,
  };
}

// Text alternative for the bar chart (role="img")
export function chartLabel(areas: AreaTrend[]): string {
  const withData = areas.filter((a) => a.total > 0);
  if (withData.length === 0) return "Wykres słupkowy: brak zgłoszeń w tym okresie.";
  return `Wykres słupkowy: ${withData.map((a) => `${a.name} ${a.total}`).join(", ")}.`;
}
