// Link from a challenge to the Library. The words of the challenge + the area's Library categories
// usually find innovations; when they find none, the link falls back to the whole area, so a
// visitor never lands on an empty list.
import {
  LibraryFilters,
  type Innovation,
  type InnovationList,
} from "@/lib/contracts/knowledge-base";
import { search } from "@/app/library/_lib/search";
import { libraryUrl } from "@/app/library/_lib/url-params";

export type ChallengeLink = {
  href: string;
  count: number;
  // true: nothing matched the words, so the link shows every innovation of the area
  wholeArea: boolean;
};

export function challengeLibraryLink(
  area: { kategorie_biblioteki: string[] },
  challengeText: string,
  innovations: Innovation[],
  available: InnovationList["dostepne_filtry"],
): ChallengeLink {
  const byWords = LibraryFilters.parse({ q: challengeText, category: area.kategorie_biblioteki });
  const count = search(innovations, byWords, available).liczba;
  if (count > 0) return { href: libraryUrl(byWords), count, wholeArea: false };
  const byArea = LibraryFilters.parse({ category: area.kategorie_biblioteki });
  return {
    href: libraryUrl(byArea),
    count: search(innovations, byArea, available).liczba,
    wholeArea: true,
  };
}
