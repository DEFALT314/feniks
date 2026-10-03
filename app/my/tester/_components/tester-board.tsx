"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { flushSync } from "react-dom";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { TesterTest } from "@/lib/contracts/innovation-tester";
import { signUpForTest, withdrawFromTest } from "../actions";
import { RatingForm } from "./rating-form";
import { TestDetails } from "./test-details";

// Which signed-up test the rating panel opens with: the first one not rated yet, else the first one
function firstToRate(tests: TesterTest[]): string | null {
  const signed = tests.filter((t) => t.zapisany);
  return (signed.find((t) => !t.moja_ocena) ?? signed[0])?.id ?? null;
}

// Open tests on the left, the rating of a chosen signed-up test on the right
export function TesterBoard({ tests }: { tests: TesterTest[] }) {
  const [chosen, setChosen] = useState<string | null>(null);
  const ratingHeading = useRef<HTMLHeadingElement>(null);
  const rated =
    tests.find((t) => t.id === chosen && t.zapisany) ??
    tests.find((t) => t.id === firstToRate(tests));

  const openRating = (id: string) => {
    // Render the chosen form now, then move keyboard and screen reader users to it
    flushSync(() => setChosen(id));
    ratingHeading.current?.focus();
  };

  return (
    <div className="mx-auto flex max-w-[1200px] flex-wrap gap-12 px-4 pt-9 pb-16 sm:px-10">
      <section
        data-ruch="pokaz"
        aria-labelledby="open-heading"
        className="flex min-w-0 flex-[999_1_520px] flex-col gap-4"
      >
        <h2 id="open-heading" className="text-[1.625rem] font-bold">
          Otwarte testy
        </h2>
        {tests.length === 0 ? (
          <p className="text-muted-foreground">
            Teraz nie ma otwartych testów. Zajrzyj tu później albo przejrzyj{" "}
            <Link href="/library">Bibliotekę rozwiązań</Link>.
          </p>
        ) : (
          <ul className="flex flex-col gap-4">
            {tests.map((test) => (
              <li key={test.id}>
                <TestCard test={test} onRate={() => openRating(test.id)} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <aside
        data-ruch="pokaz"
        aria-labelledby="rating-heading"
        className="flex max-w-[420px] flex-[1_1_360px] flex-col gap-4"
      >
        {rated ? (
          <RatingForm key={rated.id} test={rated} headingRef={ratingHeading} />
        ) : (
          <Card className="border-t-navy flex flex-col gap-3 border-t-4">
            <h2 id="rating-heading" className="text-[1.375rem] font-bold">
              Ocena testu
            </h2>
            <p className="text-muted-foreground text-base">
              Zapisz się na test. Po spotkaniu ocenisz go tutaj: od 1 do 5, co działało i co
              poprawić.
            </p>
          </Card>
        )}
        <p className="text-muted-foreground text-base">
          Ocenę zobaczą autorzy rozwiązania i ROPS. Nie pokazujemy przy niej Twojego imienia.
        </p>
      </aside>
    </div>
  );
}

function TestCard({ test, onRate }: { test: TesterTest; onRate: () => void }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);
  const headingId = `test-${test.id}-heading`;

  const run = (action: () => Promise<{ ok: boolean; error?: string }>, done: string) => {
    setMessage(null);
    startTransition(async () => {
      const result = await action();
      setMessage(
        result.ok ? { error: false, text: done } : { error: true, text: result.error ?? "" },
      );
    });
  };

  return (
    <Card
      id={`test-${test.id}`}
      role="article"
      aria-labelledby={headingId}
      className="flex scroll-mt-6 flex-col gap-2.5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h3 id={headingId} className="text-[1.375rem] leading-snug font-bold">
          {test.tytul}
        </h3>
        {test.zapisany ? <Badge variant="success">Jesteś zapisany</Badge> : null}
      </div>
      {test.opis ? <p>{test.opis}</p> : null}
      <TestDetails test={test} />
      {test.moja_ocena ? (
        <p className="text-base">
          <strong>Twoja ocena:</strong> {test.moja_ocena.ocena} z 5
        </p>
      ) : null}

      <div className="mt-1 flex flex-wrap gap-2.5">
        {test.zapisany ? (
          <>
            <Button type="button" onClick={onRate} aria-describedby={headingId}>
              {test.moja_ocena ? "Zmień ocenę" : "Oceń test"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              aria-describedby={headingId}
              onClick={() => run(() => withdrawFromTest(test.id), "Wypisano Cię z testu.")}
            >
              {pending ? "Wypisuję…" : "Wypisz się"}
            </Button>
          </>
        ) : (
          <Button
            type="button"
            disabled={pending}
            aria-describedby={headingId}
            onClick={() => run(() => signUpForTest(test.id), "Zapisano Cię na test.")}
          >
            {pending ? "Zapisuję…" : "Zapisz się"}
          </Button>
        )}
        {test.przedmiot.typ === "innowacja" ? (
          <Link
            href={`/library/${test.przedmiot.innowacja_id}`}
            className={buttonVariants({ variant: "secondary" })}
            aria-describedby={headingId}
          >
            O rozwiązaniu
          </Link>
        ) : null}
      </div>
      <p
        aria-live="polite"
        className={message?.error ? "text-danger text-base font-bold" : "text-success text-base"}
      >
        {message?.text}
      </p>
    </Card>
  );
}
