import { Card } from "@/components/ui/card";
import type { TestFeedback, TesterTest } from "@/lib/contracts/innovation-tester";
import { formatAverage, ratingsCount } from "../_lib/model";
import { TestDetails } from "./test-details";

const dateTime = new Intl.DateTimeFormat("pl-PL", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Warsaw",
});

// A test the user runs, with the ratings it collected. id="test-…" is the target of the
// notification link (/my/tester#test-…).
export function ManagedTest({ test, feedback }: { test: TesterTest; feedback: TestFeedback }) {
  const headingId = `test-${test.id}-heading`;
  return (
    <Card
      id={`test-${test.id}`}
      className="flex h-full scroll-mt-6 flex-col gap-3"
      role="article"
      aria-labelledby={headingId}
    >
      <h3 id={headingId} className="text-[1.375rem] leading-snug font-bold">
        {test.tytul}
      </h3>
      <p className="text-muted-foreground text-base">
        {test.przedmiot.typ === "innowacja"
          ? `Rozwiązanie z Biblioteki: ${test.przedmiot.nazwa}`
          : "Test Twojego pomysłu"}
        {` · zapisani: ${test.zajete}`}
      </p>
      <TestDetails test={test} />

      {feedback.srednia === null ? (
        <p className="bg-neutral-soft rounded-[10px] px-4 py-3 text-base">
          Nikt jeszcze nie ocenił tego testu.
        </p>
      ) : (
        <>
          <p className="text-lg">
            <strong>Średnia ocena: {formatAverage(feedback.srednia)} z 5</strong>{" "}
            <span className="text-muted-foreground">({ratingsCount(feedback.liczba_ocen)})</span>
          </p>
          <ul className="flex flex-col gap-2.5" aria-label={`Uwagi uczestników: ${test.tytul}`}>
            {feedback.uwagi.map((uwaga, index) => (
              <li
                key={`${uwaga.created_at}-${index}`}
                className="border-border flex flex-col gap-1 rounded-[10px] border px-4 py-3 text-base"
              >
                <p className="text-muted-foreground text-sm">
                  Ocena {uwaga.ocena} z 5 · {dateTime.format(new Date(uwaga.created_at))}
                </p>
                {uwaga.co_dzialalo ? (
                  <p>
                    <strong>Co działało:</strong> {uwaga.co_dzialalo}
                  </p>
                ) : null}
                {uwaga.co_poprawic ? (
                  <p>
                    <strong>Co poprawić:</strong> {uwaga.co_poprawic}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}
