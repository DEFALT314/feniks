"use client";

import { useRef, useState, useTransition, type FormEvent, type RefObject } from "react";
import { Button, pressClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { useFocusFirstError } from "@/components/ui/focus";
import { Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { TesterTest } from "@/lib/contracts/innovation-tester";
import { rateTest } from "../actions";

const SCORES = [1, 2, 3, 4, 5] as const;
const MAX_TEXT = 2000;

// "Oceń: …" panel: 1–5 (.sc tiles in design/makiety/Tester.dc.html), what worked, what to improve.
// Sending again replaces the earlier rating.
export function RatingForm({
  test,
  headingRef,
}: {
  test: TesterTest;
  headingRef: RefObject<HTMLHeadingElement | null>;
}) {
  const [score, setScore] = useState<number | null>(test.moja_ocena?.ocena ?? null);
  const [worked, setWorked] = useState(test.moja_ocena?.co_dzialalo ?? "");
  const [improve, setImprove] = useState(test.moja_ocena?.co_poprawic ?? "");
  const [scoreError, setScoreError] = useState(false);
  // Each failed submit is a new value, so focus moves to the first score again (WCAG 3.3.1)
  const [failedAttempt, setFailedAttempt] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  useFocusFirstError(formRef, failedAttempt || undefined);
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    if (score === null) {
      setScoreError(true);
      setFailedAttempt((n) => n + 1);
      return;
    }
    const again = test.moja_ocena !== null;
    startTransition(async () => {
      const result = await rateTest({
        test_id: test.id,
        ocena: score,
        co_dzialalo: worked,
        co_poprawic: improve,
      });
      setMessage(
        result.ok
          ? {
              error: false,
              text: again ? "Zapisano zmienioną ocenę." : "Dziękujemy! Ocena trafiła do autorów.",
            }
          : { error: true, text: result.error },
      );
    });
  };

  return (
    <Card className="border-t-navy border-t-4">
      <form ref={formRef} onSubmit={submit} noValidate className="flex flex-col gap-4">
        <h2
          id="rating-heading"
          ref={headingRef}
          tabIndex={-1}
          className="text-[1.375rem] leading-snug font-bold"
        >
          Oceń: {test.przedmiot.typ === "innowacja" ? test.przedmiot.nazwa : test.tytul}
        </h2>
        <fieldset data-ruch="wybor" className="flex flex-col gap-2">
          <legend className="mb-2 font-bold">
            Na ile pomaga? (1 – wcale, 5 – bardzo)
            <span className="text-muted-foreground font-normal"> (wymagane)</span>
          </legend>
          {scoreError ? (
            <p id="rating-score-error" className="text-danger text-base font-bold">
              Wybierz ocenę od 1 do 5.
            </p>
          ) : null}
          <div className="grid max-w-[332px] grid-cols-5 gap-2">
            {SCORES.map((value) => (
              <label
                key={value}
                className={cn(
                  "border-input hover:border-navy hover:text-navy has-checked:border-navy has-checked:bg-navy has-focus-visible:outline-ring relative flex h-14 min-w-11 cursor-pointer items-center justify-center rounded-[10px] border bg-white text-xl font-bold transition-[color,background-color,border-color,scale] duration-200 has-checked:text-white has-focus-visible:outline-3 has-focus-visible:outline-offset-2",
                  pressClass,
                )}
              >
                <input
                  type="radio"
                  name={`score-${test.id}`}
                  value={value}
                  checked={score === value}
                  required
                  aria-describedby={scoreError ? "rating-score-error" : undefined}
                  // Radios can't be aria-invalid: the first one is the focus target for the error
                  data-form-error={scoreError && value === SCORES[0] ? true : undefined}
                  onChange={() => {
                    setScore(value);
                    setScoreError(false);
                  }}
                  className="absolute size-px opacity-0"
                />
                {value}
              </label>
            ))}
          </div>
        </fieldset>
        <Field label="Co działało?">
          {(control) => (
            <Textarea
              {...control}
              rows={2}
              maxLength={MAX_TEXT}
              value={worked}
              onChange={(e) => setWorked(e.target.value)}
            />
          )}
        </Field>
        <Field label="Co poprawić?">
          {(control) => (
            <Textarea
              {...control}
              rows={2}
              maxLength={MAX_TEXT}
              value={improve}
              onChange={(e) => setImprove(e.target.value)}
            />
          )}
        </Field>
        <Button type="submit" disabled={pending}>
          {pending ? "Wysyłam…" : test.moja_ocena ? "Zapisz zmienioną ocenę" : "Wyślij ocenę"}
        </Button>
        <p
          aria-live="polite"
          className={message?.error ? "text-danger text-base font-bold" : "text-success text-base"}
        >
          {message?.text}
        </p>
      </form>
    </Card>
  );
}
