"use client";

import Link from "next/link";
import { useActionState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { useFocusFirstError } from "@/components/ui/focus";
import { Input, Textarea } from "@/components/ui/input";
import type { Call } from "@/lib/contracts/admin";
import type { CallFormState } from "@/lib/calls";
import { saveCallAction } from "../actions";

type Area = { id: string; nazwa: string };

export function CallForm({ call, areas }: { call: Call | null; areas: Area[] }) {
  const [state, action, pending] = useActionState<CallFormState, FormData>(
    saveCallAction.bind(null, call?.id ?? null),
    { status: "idle" },
  );
  const e = state.fieldErrors ?? {};
  const formRef = useRef<HTMLFormElement>(null);
  useFocusFirstError(formRef, state.status === "error" ? state : undefined);

  return (
    <form
      ref={formRef}
      action={action}
      className="flex flex-col gap-4"
      key={call?.id ?? "new"}
      noValidate
    >
      <Field label="Nazwa naboru" error={e.nazwa} required>
        {(p) => <Input {...p} name="nazwa" required defaultValue={call?.nazwa} />}
      </Field>
      <Field
        label="Identyfikator"
        hint={
          call ? "Nie zmienia się po dodaniu." : "Małe litery i myślniki, np. nabor-seniorzy-2027."
        }
        error={e.id}
        required={!call}
      >
        {(p) => (
          <Input {...p} name="id" required defaultValue={call?.id} readOnly={Boolean(call)} />
        )}
      </Field>
      <Field label="Organizator" error={e.organizator}>
        {(p) => (
          <Input
            {...p}
            name="organizator"
            defaultValue={call?.organizator ?? "Regionalny Ośrodek Polityki Społecznej w Krakowie"}
          />
        )}
      </Field>
      <Field label="Na co są pieniądze" hint="Prostym językiem, 1–2 zdania." error={e.cel}>
        {(p) => <Textarea {...p} name="cel" rows={3} defaultValue={call?.cel ?? ""} />}
      </Field>
      <Field label="Strona naboru" error={e.url}>
        {(p) => (
          <Input {...p} name="url" type="url" inputMode="url" defaultValue={call?.url ?? ""} />
        )}
      </Field>
      <div className="flex flex-wrap gap-4">
        <Field label="Początek" className="min-w-[180px] flex-1" error={e.termin_od}>
          {(p) => (
            <Input {...p} name="termin_od" type="date" defaultValue={call?.termin_od ?? ""} />
          )}
        </Field>
        <Field label="Koniec (termin)" className="min-w-[180px] flex-1" error={e.termin_do}>
          {(p) => (
            <Input {...p} name="termin_do" type="date" defaultValue={call?.termin_do ?? ""} />
          )}
        </Field>
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 font-bold">Obszary Mapy Wyzwań</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {areas.map((a) => (
            <label key={a.id} className="flex min-h-11 items-center gap-3 font-normal">
              <input
                type="checkbox"
                name="obszary"
                value={a.id}
                defaultChecked={call?.obszary.includes(a.id)}
                className="accent-navy size-5 shrink-0"
              />
              {a.nazwa}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex min-h-11 items-center gap-3 font-bold">
        <input
          type="checkbox"
          name="opublikowany"
          defaultChecked={call?.opublikowany ?? false}
          className="accent-navy size-5 shrink-0"
        />
        Nabór włączony (widoczny w generatorze wniosków)
      </label>
      <p className="text-muted-foreground -mt-2 text-base">
        Gdy włączysz nabór albo zmienisz jego termin, autorzy pomysłów z wybranych obszarów dostaną
        powiadomienie i maila.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Zapisujemy…" : call ? "Zapisz zmiany" : "Dodaj nabór"}
        </Button>
        {call ? (
          <Link href="/admin/calls" className="inline-flex min-h-11 items-center text-base">
            Anuluj
          </Link>
        ) : null}
      </div>
      <p role="status" aria-live="polite" className="text-base">
        {state.status === "saved" ? (
          <strong className="text-success">
            {state.message}
            {state.notified !== undefined
              ? ` Powiadomiliśmy autorów pasujących pomysłów: ${state.notified}.`
              : ""}
          </strong>
        ) : null}
        {state.status === "error" && state.message ? (
          <strong data-form-error className="text-danger">
            {state.message}
          </strong>
        ) : null}
      </p>
    </form>
  );
}
