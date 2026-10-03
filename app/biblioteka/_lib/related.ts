// Related items on the innovation card: similar innovations and challenges from the Challenges Map (no AI, by words).
import type { Innovation, ChallengeArea, Challenge } from "@/lib/contracts/knowledge-base";
import { normalize, stem } from "./search";

const stemSet = (texts: (string | null)[]): Set<string> =>
  new Set(
    texts
      .flatMap((t) => normalize(t ?? "").split(" "))
      .filter((s) => s.length >= 4)
      .map(stem),
  );

const countShared = (a: Set<string>, b: Set<string>) => [...a].filter((x) => b.has(x)).length;

const innovationStems = (i: Innovation) => stemSet([...i.slowa_kluczowe, ...i.dla_kogo]);

export function similarInnovations(i: Innovation, catalog: Innovation[], limit = 3): Innovation[] {
  const own = innovationStems(i);
  return catalog
    .filter((x) => x.id !== i.id && x.opublikowana && !x.opis_niepelny)
    .map((x) => ({
      x,
      points: countShared(own, innovationStems(x)) + (x.kategoria_id === i.kategoria_id ? 1 : 0),
    }))
    .filter(({ points }) => points >= 2)
    .sort(
      (a, b) =>
        b.points - a.points ||
        Number(b.x.sprawdzona_przez_rops) - Number(a.x.sprawdzona_przez_rops) ||
        a.x.nazwa.localeCompare(b.x.nazwa, "pl"),
    )
    .slice(0, limit)
    .map(({ x }) => x);
}

export type ChallengeWithArea = { area: ChallengeArea; challenge: Challenge };

// Challenges from areas linked to the innovation's category, ranked by shared words
export function challengesForInnovation(
  i: Innovation,
  areas: (ChallengeArea & { wyzwania: Challenge[] })[],
  limit = 3,
): ChallengeWithArea[] {
  const own = stemSet([...i.slowa_kluczowe, ...i.dla_kogo, i.opis_krotki, i.problem]);
  return areas
    .filter((a) => a.kategorie_biblioteki.includes(i.kategoria_id))
    .flatMap((area) =>
      area.wyzwania.map((challenge) => ({
        area,
        challenge,
        points: countShared(own, stemSet([challenge.tekst])),
      })),
    )
    .filter(({ points }) => points > 0)
    .sort((a, b) => b.points - a.points)
    .slice(0, limit)
    .map(({ area, challenge }) => ({ area, challenge }));
}
