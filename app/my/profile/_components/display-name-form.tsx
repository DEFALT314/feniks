"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { updateDisplayName } from "../actions";
import type { ProfileFormState } from "../_lib/profile";

const initialState: ProfileFormState = { status: "idle" };

export function DisplayNameForm({ name }: { name: string }) {
  const [state, action, pending] = useActionState(updateDisplayName, initialState);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2.5" noValidate>
      <Field label="Jak mamy Cię nazywać" error={state.fieldError} className="flex-[1_1_320px]">
        {(p) => <Input {...p} name="name" autoComplete="nickname" defaultValue={name} required />}
      </Field>
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Zapisujemy…" : "Zapisz"}
      </Button>
      <p role="status" aria-live="polite" className="basis-full text-base empty:hidden">
        {state.message ? (
          state.status === "error" ? (
            <strong className="text-danger">{state.message}</strong>
          ) : (
            state.message
          )
        ) : null}
      </p>
    </form>
  );
}
