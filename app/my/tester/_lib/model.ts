import {
  Rating,
  TesterTest,
  type TestFeedback,
  type TestSubject,
} from "@/lib/contracts/innovation-tester";

// Pure logic of the tester: shapes database rows into the contract and maps database errors to
// plain Polish messages. No Supabase here, so it is unit tested without a database.

export type TestRow = {
  id: string;
  idea_id: string | null;
  innowacja_id: string | null;
  tytul: string;
  opis: string | null;
  miejsce: string | null;
  termin: string | null;
  liczba_miejsc: number | null;
};

export type RatingRow = {
  test_id: string;
  ocena: number;
  co_dzialalo: string | null;
  co_poprawic: string | null;
  created_at: string;
};

export type ListInput = {
  tests: TestRow[];
  seatsTaken: Map<string, number>;
  mySignups: Set<string>;
  myRatings: Map<string, RatingRow>;
  innovationNames: Map<string, string>;
  myIdeaIds: Set<string>;
  isRops: boolean;
  now: Date;
};

function subjectOf(row: TestRow, names: Map<string, string>): TestSubject | null {
  if (row.idea_id) return { typ: "pomysl", idea_id: row.idea_id };
  if (row.innowacja_id) {
    return {
      typ: "innowacja",
      innowacja_id: row.innowacja_id,
      nazwa: names.get(row.innowacja_id) ?? row.innowacja_id,
    };
  }
  return null;
}

function toRating(row: RatingRow | undefined): Rating | null {
  if (!row) return null;
  const rating = Rating.safeParse(row);
  return rating.success ? rating.data : null;
}

// Rows that do not fit the contract are skipped, not shown broken
export function buildTestList(input: ListInput): TesterTest[] {
  const list: TesterTest[] = [];
  for (const row of input.tests) {
    const przedmiot = subjectOf(row, input.innovationNames);
    if (!przedmiot) continue;
    const zajete = input.seatsTaken.get(row.id) ?? 0;
    const full = row.liczba_miejsc !== null && zajete >= row.liczba_miejsc;
    const past = row.termin !== null && new Date(row.termin) < input.now;
    const zarzadzam =
      przedmiot.typ === "pomysl" ? input.myIdeaIds.has(przedmiot.idea_id) : input.isRops;
    const test = TesterTest.safeParse({
      ...row,
      zajete,
      przedmiot,
      zapisany: input.mySignups.has(row.id),
      zapisy_otwarte: !full && !past,
      moja_ocena: toRating(input.myRatings.get(row.id)),
      zarzadzam,
    });
    if (test.success) list.push(test.data);
  }
  return list;
}

// Average rounded to one decimal place; newest comments first
export function summarizeFeedback(testIds: string[], ratings: RatingRow[]): TestFeedback[] {
  return testIds.map((testId) => {
    const uwagi = ratings
      .filter((r) => r.test_id === testId)
      .map((r) => toRating(r))
      .filter((r): r is Rating => r !== null)
      .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
    const sum = uwagi.reduce((total, r) => total + r.ocena, 0);
    return {
      test_id: testId,
      liczba_ocen: uwagi.length,
      srednia: uwagi.length ? Math.round((sum / uwagi.length) * 10) / 10 : null,
      uwagi,
    };
  });
}

// Messages for errors raised by the database (migration *_tester_innovations.sql and RLS)
export function signUpError(code: string | undefined): string {
  switch (code) {
    case "HM409":
      return "Brak wolnych miejsc na ten test.";
    case "HM410":
      return "Zapisy na ten test są już zamknięte.";
    case "HM404":
      return "Nie ma już takiego testu. Odśwież stronę.";
    default:
      return "Nie udało się zapisać. Spróbuj ponownie za chwilę.";
  }
}

export function ratingError(code: string | undefined): string {
  // 42501: RLS refused the row, i.e. the user is not signed up for the test
  if (code === "42501") return "Najpierw zapisz się na test, potem go oceń.";
  return "Nie udało się wysłać oceny. Spróbuj ponownie za chwilę.";
}

// "Kiedy" on a card: date and time in Polish, Warsaw time
export function formatTermin(termin: string | null): string {
  if (!termin) return "Termin do ustalenia";
  return new Intl.DateTimeFormat("pl-PL", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Warsaw",
  }).format(new Date(termin));
}

// "Miejsca" on a card
export function seatsLabel(test: Pick<TesterTest, "liczba_miejsc" | "zajete">): string {
  if (test.liczba_miejsc === null) return "bez limitu";
  const free = Math.max(test.liczba_miejsc - test.zajete, 0);
  if (free === 0) return `brak wolnych (z ${test.liczba_miejsc})`;
  return `wolne: ${free} z ${test.liczba_miejsc}`;
}

// "1 ocena", "3 oceny", "5 ocen", "22 oceny" (Polish plural rules)
export function ratingsCount(n: number): string {
  const lastTwo = n % 100;
  const last = n % 10;
  if (n === 1) return "1 ocena";
  if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return `${n} oceny`;
  return `${n} ocen`;
}

// 4.5 → "4,5"
export function formatAverage(average: number): string {
  return average.toLocaleString("pl-PL", { maximumFractionDigits: 1 });
}
