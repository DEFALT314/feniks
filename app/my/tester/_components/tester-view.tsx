import type { TestFeedback, TesterTest } from "@/lib/contracts/innovation-tester";
import { ManagedTest } from "./managed-test";
import { TesterBoard } from "./tester-board";

// "Testy nowych rozwiązań" (design/makiety/Tester.dc.html): open tests with sign-up and rating, then
// the tests the user runs (idea author or ROPS) with the feedback they collected.
export function TesterView({ tests, feedback }: { tests: TesterTest[]; feedback: TestFeedback[] }) {
  // A test the user runs is not offered to them for sign-up; one they can no longer join is hidden
  const open = tests.filter((t) => !t.zarzadzam && (t.zapisy_otwarte || t.zapisany));
  const managed = tests.filter((t) => t.zarzadzam);
  const empty = { liczba_ocen: 0, srednia: null, uwagi: [] };

  return (
    <main id="main-content" className="flex-1">
      <div className="border-border border-b bg-white">
        <div
          data-ruch="wejscie"
          className="mx-auto flex max-w-[1200px] flex-col gap-3 px-4 pt-10 pb-8 sm:px-10"
        >
          <h1 className="text-[2.75rem] leading-tight font-bold">Testy nowych rozwiązań</h1>
          <p className="text-muted-foreground max-w-[760px]">
            Zapisz się na test, wypróbuj rozwiązanie, oceń je i zaproponuj, co poprawić. Twoja
            opinia trafia do autorów i do ROPS.
          </p>
        </div>
      </div>

      <TesterBoard tests={open} />

      {managed.length ? (
        <section
          aria-labelledby="managed-heading"
          className="mx-auto flex max-w-[1200px] flex-col gap-4 px-4 pb-16 sm:px-10"
        >
          <h2 id="managed-heading" className="text-[1.625rem] font-bold">
            Twoje testy i opinie
          </h2>
          <p className="text-muted-foreground max-w-[760px]">
            Oceny uczestników, bez ich imion. Nowa ocena pojawia się też w powiadomieniach.
          </p>
          <ul className="grid gap-4 lg:grid-cols-2">
            {managed.map((test) => (
              <li key={test.id}>
                <ManagedTest
                  test={test}
                  feedback={
                    feedback.find((f) => f.test_id === test.id) ?? { test_id: test.id, ...empty }
                  }
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
