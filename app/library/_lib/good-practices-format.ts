import type { IdeaStage } from "@/lib/contracts/ai";

// Words for good practices (#104): ideas from the Idea creator that ROPS approved and shows in the
// Library, with the author's consent. Plain language, no codes.

const STAGES: Record<IdeaStage, string> = {
  pomysl: "Na etapie pomysłu",
  prototyp: "Prototyp",
  przetestowane: "Przetestowane w małej skali",
  gotowe: "Gotowe do wdrożenia",
};

export function stageLabel(stage: IdeaStage | null): string | null {
  return stage ? STAGES[stage] : null;
}

// Polish plural: 1 ocena, 2–4 oceny (but 12–14 ocen), 5+ ocen
function plural(n: number, one: string, few: string, many: string): string {
  if (n === 1) return one;
  const tens = n % 100;
  const units = n % 10;
  return units >= 2 && units <= 4 && (tens < 12 || tens > 14) ? few : many;
}

const decimal = new Intl.NumberFormat("pl-PL", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/**
 * Results of tests with residents (module IV). The database sends the average only from three
 * ratings up, so with fewer only the count is shown.
 */
export function ratingSummary(count: number, average: number | null): string | null {
  if (count === 0) return null;
  const ratings = `${count} ${plural(count, "ocena", "oceny", "ocen")} mieszkańców`;
  return average === null ? ratings : `${ratings}, średnio ${decimal.format(average)} na 5`;
}

export function practiceCountLabel(n: number): string {
  return `${n} ${plural(n, "dobra praktyka", "dobre praktyki", "dobrych praktyk")}`;
}

const day = new Intl.DateTimeFormat("pl-PL", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Europe/Warsaw",
});

export function publishedOn(iso: string): string {
  return day.format(new Date(iso));
}

export function practicesTitle(practice?: string): string {
  return practice
    ? `${practice} – Dobre praktyki mieszkańców – HubMI.pl`
    : "Dobre praktyki mieszkańców – Biblioteka innowacji – HubMI.pl";
}

/** "Napisz do ROPS" about a practice. Never ?idea=: that is the author's own thread with ROPS. */
export function askAboutPracticeUrl(title: string): string {
  const p = new URLSearchParams({ topic: `Pytanie o dobrą praktykę: ${title}` });
  return `/my/messages/new?${p.toString()}`;
}
