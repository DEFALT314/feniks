"use client";

import { useRef, useState } from "react";
import { announce } from "@/components/ui/announcer";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { useFocusFirstError } from "@/components/ui/focus";
import { Input, Textarea } from "@/components/ui/input";
import type { MatchResponse } from "@/lib/contracts/match";
import {
  EXAMPLES,
  MAX_LENGTH,
  resultAnnouncement,
  runTwoPhase,
  validate,
  type Phase,
} from "../_lib/request";
import { ResultSkeleton } from "./ai-progress";
import { MatchResult } from "./match-result";

export function MatchForm({ initialDescription }: { initialDescription: string }) {
  const [description, setDescription] = useState(initialDescription);
  const [municipality, setMunicipality] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  // Counts failed submits, so every one of them moves focus back to the invalid field
  const [failedSubmits, setFailedSubmits] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<MatchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const searchId = useRef(0);
  const formRef = useRef<HTMLFormElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  useFocusFirstError(formRef, failedSubmits || undefined);

  async function submit() {
    const problem = validate(description);
    setFieldError(problem);
    if (problem) {
      setFailedSubmits((n) => n + 1);
      return;
    }
    const id = ++searchId.current;
    await runTwoPhase(
      { description, municipality },
      (next, data, message) => {
        setPhase(next);
        setError(message);
        setResult(data);
        // One short sentence instead of a live result region; focus stays where the user is
        const text = resultAnnouncement(next, data, message);
        if (text) announce(text);
      },
      () => id === searchId.current,
    );
  }

  return (
    <>
      <section aria-labelledby="match-title" className="border-line border-b bg-white">
        <form
          ref={formRef}
          className="mx-auto flex max-w-[920px] flex-col gap-5 px-4 pt-12 pb-12 sm:px-10"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          noValidate
        >
          <h1 id="match-title" className="text-[clamp(2rem,5vw,2.75rem)] leading-tight font-bold">
            Opisz problem, a znajdziemy, kto już go rozwiązał
          </h1>
          <Field
            label="Co się dzieje? Napisz własnymi słowami"
            hint="Bez imion, nazwisk i adresów. Wystarczy opis sytuacji."
            error={fieldError}
            required
          >
            {(p) => (
              <Textarea
                {...p}
                ref={descriptionRef}
                name="description"
                value={description}
                maxLength={MAX_LENGTH}
                required
                onChange={(e) => setDescription(e.target.value)}
              />
            )}
          </Field>
          <div
            role="group"
            aria-labelledby="examples-title"
            className="flex flex-wrap items-center gap-2"
          >
            <span id="examples-title" className="text-ink-muted text-base">
              Przykłady (kliknij, żeby wpisać do pola):
            </span>
            {EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                className="hover:border-navy hover:bg-navy-soft hover:text-navy border-field-border min-h-11 cursor-pointer rounded-[10px] border bg-white px-3.5 py-1.5 text-left text-base transition-colors duration-200"
                onClick={() => {
                  // Fills the field only: the search starts with "Dopasuj", as for a typed text
                  setDescription(example);
                  setFieldError(null);
                  descriptionRef.current?.focus();
                }}
              >
                {example}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <Field label="Gmina (nieobowiązkowo)" className="flex-[1_1_240px]">
              {(p) => (
                <Input
                  {...p}
                  name="municipality"
                  autoComplete="address-level2"
                  value={municipality}
                  onChange={(e) => setMunicipality(e.target.value)}
                />
              )}
            </Field>
            <Button type="submit" disabled={phase === "searching"}>
              {phase === "searching" ? "Szukam…" : "Dopasuj"}
            </Button>
          </div>
        </form>
      </section>

      <section
        aria-labelledby={result ? "result-title" : undefined}
        className="mx-auto max-w-[920px] px-4 pt-12 pb-16 sm:px-10"
      >
        {error ? <p className="text-danger font-bold">{error}</p> : null}
        {phase === "searching" ? <ResultSkeleton /> : null}
        {result ? <MatchResult result={result} choosing={phase === "choosing"} /> : null}
      </section>
    </>
  );
}
