"use client";

import Link from "next/link";
import { useId, useRef, useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { planIdeaTest } from "../actions";
import { EMPTY_PLAN as EMPTY, type PlanTestDraft as Draft } from "../_lib/model";

// "Test z mieszkańcami" on the idea card: the author plans a test, residents sign up and rate it
// in the Innovation tester (/my/tester), where the author reads the feedback.
export function PlanTestPanel({
  ideaId,
  testCount,
  defaults = EMPTY,
}: {
  ideaId: string;
  testCount: number;
  defaults?: Draft;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(defaults);
  const [titleError, setTitleError] = useState(false);
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const formId = useId();
  const toggle = useRef<HTMLButtonElement>(null);
  const titleInput = useRef<HTMLInputElement>(null);

  const set = (key: keyof Draft) => (value: string) => setDraft((d) => ({ ...d, [key]: value }));

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    if (draft.tytul.trim() === "") {
      setTitleError(true);
      titleInput.current?.focus();
      return;
    }
    startTransition(async () => {
      const result = await planIdeaTest({
        idea_id: ideaId,
        tytul: draft.tytul,
        opis: draft.opis,
        miejsce: draft.miejsce,
        // datetime-local has no time zone: the browser's local time is what the author meant
        termin: draft.termin ? new Date(draft.termin).toISOString() : null,
        liczba_miejsc: draft.miejsca ? Number(draft.miejsca) : null,
      });
      if (result.ok) {
        setDraft(defaults);
        setOpen(false);
        setMessage({ error: false, text: "Test zaplanowany. Mieszkańcy widzą go w Testerze." });
        toggle.current?.focus();
      } else {
        setMessage({ error: true, text: result.error ?? "" });
      }
    });
  };

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-[1.375rem] leading-snug font-bold">Test z mieszkańcami</h2>
      <p className="text-base">
        Sprawdź pomysł w praktyce: zaplanuj test, a mieszkańcy zapiszą się i ocenią go od 1 do 5.
      </p>
      {testCount > 0 ? (
        <p className="text-base">
          Zaplanowane testy: {testCount}.{" "}
          <Link href="/my/tester#managed-heading">Zobacz zapisy i opinie</Link>
        </p>
      ) : null}
      <Button
        ref={toggle}
        type="button"
        variant="secondary"
        aria-expanded={open}
        aria-controls={formId}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? "Zwiń formularz" : "Zaplanuj test"}
      </Button>
      <form id={formId} hidden={!open} onSubmit={submit} noValidate className="flex flex-col gap-4">
        <Field label="Nazwa testu" error={titleError ? "Wpisz nazwę testu." : undefined} required>
          {(control) => (
            <Input
              {...control}
              ref={titleInput}
              maxLength={200}
              required
              value={draft.tytul}
              onChange={(e) => {
                set("tytul")(e.target.value);
                setTitleError(false);
              }}
            />
          )}
        </Field>
        <Field
          label="Na czym polega?"
          hint="Co uczestnicy zrobią i ile to potrwa. Mieszkańcy zobaczą ten opis przy zapisie."
        >
          {(control) => (
            <Textarea
              {...control}
              rows={3}
              maxLength={3000}
              value={draft.opis}
              onChange={(e) => set("opis")(e.target.value)}
            />
          )}
        </Field>
        <Field label="Gdzie" hint="Adres albo „online”.">
          {(control) => (
            <Input
              {...control}
              maxLength={200}
              value={draft.miejsce}
              onChange={(e) => set("miejsce")(e.target.value)}
            />
          )}
        </Field>
        <Field label="Kiedy" hint="Możesz zostawić puste, jeśli termin nie jest jeszcze znany.">
          {(control) => (
            <Input
              {...control}
              type="datetime-local"
              value={draft.termin}
              onChange={(e) => set("termin")(e.target.value)}
            />
          )}
        </Field>
        <Field label="Liczba miejsc" hint="Puste: bez limitu.">
          {(control) => (
            <Input
              {...control}
              type="number"
              inputMode="numeric"
              min={1}
              max={500}
              value={draft.miejsca}
              onChange={(e) => set("miejsca")(e.target.value)}
            />
          )}
        </Field>
        <Button type="submit" disabled={pending}>
          {pending ? "Zapisuję…" : "Zapisz test"}
        </Button>
      </form>
      <p
        aria-live="polite"
        className={message?.error ? "text-danger text-base font-bold" : "text-success text-base"}
      >
        {message?.text}
      </p>
    </Card>
  );
}
