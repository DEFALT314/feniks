"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import type { MatchResponse, MatchRole } from "@/lib/contracts/match";
import {
  EXAMPLES,
  MAX_LENGTH,
  ROLE_OPTIONS,
  runTwoPhase,
  validate,
  type Phase,
} from "../_lib/request";
import { ResultSkeleton } from "./ai-progress";
import { MatchResult } from "./match-result";

const SELECT =
  "border-input text-ink hover:border-ink-muted focus:border-navy w-full rounded-[10px] border bg-white px-3.5 py-3 text-lg transition-[border-color,box-shadow] duration-200 focus:shadow-[0_0_0_1px_var(--navy)]";

export function MatchForm({ initialDescription }: { initialDescription: string }) {
  const [description, setDescription] = useState(initialDescription);
  const [role, setRole] = useState<MatchRole>("mieszkaniec");
  const [municipality, setMunicipality] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<MatchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const searchId = useRef(0);
  const resultRef = useRef<HTMLElement>(null);

  async function submit(text = description) {
    const problem = validate(text);
    setFieldError(problem);
    if (problem) return;
    const id = ++searchId.current;
    await runTwoPhase(
      { description: text, role, municipality },
      (next, data, message) => {
        setPhase(next);
        setError(message);
        setResult(data);
        if (next === "choosing") resultRef.current?.focus();
      },
      () => id === searchId.current,
    );
  }

  const busy = phase === "searching" || phase === "choosing";

  return (
    <>
      <section aria-labelledby="match-title" className="border-line border-b bg-white">
        <form
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
          >
            {(p) => (
              <Textarea
                {...p}
                name="description"
                value={description}
                maxLength={MAX_LENGTH}
                onChange={(e) => setDescription(e.target.value)}
              />
            )}
          </Field>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-ink-muted text-base">Przykłady:</span>
            {EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                className="hover:border-navy hover:bg-navy-soft hover:text-navy min-h-11 cursor-pointer rounded-[10px] border border-[#b8c0cd] bg-white px-3.5 py-1.5 text-left text-base transition-colors duration-200"
                onClick={() => {
                  setDescription(example);
                  void submit(example);
                }}
              >
                {example}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <Field label="Pytam jako" className="flex-[1_1_240px]">
              {(p) => (
                <select
                  {...p}
                  className={SELECT}
                  value={role}
                  onChange={(e) => setRole(e.target.value as MatchRole)}
                >
                  {ROLE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              )}
            </Field>
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
        ref={resultRef}
        tabIndex={-1}
        aria-labelledby={result ? "result-title" : undefined}
        aria-label={result ? undefined : "Wynik"}
        aria-live="polite"
        aria-busy={busy}
        className="mx-auto max-w-[920px] px-4 pt-12 pb-16 outline-none sm:px-10"
      >
        {error ? (
          <p role="alert" className="text-danger font-bold">
            {error}
          </p>
        ) : null}
        {phase === "searching" ? (
          <>
            <p role="status" className="sr-only">
              Szukam w Bibliotece ROPS…
            </p>
            <ResultSkeleton />
          </>
        ) : null}
        {result ? <MatchResult result={result} choosing={phase === "choosing"} /> : null}
      </section>
    </>
  );
}
