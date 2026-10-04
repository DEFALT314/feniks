"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import type { NewTestState } from "../../_lib/tests";
import { createTestAction } from "../actions";

export function NewTestForm({ innovations }: { innovations: { id: string; nazwa: string }[] }) {
  const [state, action, pending] = useActionState<NewTestState, FormData>(createTestAction, {
    status: "idle",
  });
  const e = state.fieldErrors ?? {};
  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label="Rozwiązanie z Biblioteki" error={e.innowacja_id}>
        {(p) => (
          <select
            {...p}
            name="innowacja_id"
            defaultValue=""
            className="border-input text-ink focus:border-navy min-h-11 w-full rounded-[10px] border bg-white px-3 text-base"
          >
            <option value="" disabled>
              Wybierz…
            </option>
            {innovations.map((i) => (
              <option key={i.id} value={i.id}>
                {i.nazwa}
              </option>
            ))}
          </select>
        )}
      </Field>
      <Field
        label="Nazwa testu"
        hint="Np. „Merkury – symulator bankomatu, test w klubie seniora”."
        error={e.tytul}
      >
        {(p) => <Input {...p} name="tytul" required maxLength={200} />}
      </Field>
      <Field label="Na czym polega test" error={e.opis}>
        {(p) => <Textarea {...p} name="opis" rows={3} maxLength={3000} />}
      </Field>
      <Field label="Miejsce" hint="Adres albo „online”." error={e.miejsce}>
        {(p) => <Input {...p} name="miejsce" maxLength={200} />}
      </Field>
      <div className="flex flex-wrap gap-4">
        <Field label="Termin" className="min-w-[200px] flex-1" error={e.termin}>
          {(p) => <Input {...p} name="termin" type="datetime-local" />}
        </Field>
        <Field label="Liczba miejsc" className="min-w-[140px] flex-1" error={e.liczba_miejsc}>
          {(p) => (
            <Input
              {...p}
              name="liczba_miejsc"
              type="number"
              min={1}
              max={500}
              inputMode="numeric"
            />
          )}
        </Field>
      </div>
      <Button type="submit" className="self-start" disabled={pending}>
        {pending ? "Zakładamy…" : "Załóż test"}
      </Button>
      <p role="status" aria-live="polite" className="text-base">
        {state.status === "saved" ? (
          <strong className="text-success">{state.message}</strong>
        ) : null}
        {state.status === "error" && state.message ? (
          <strong className="text-danger">{state.message}</strong>
        ) : null}
      </p>
    </form>
  );
}
