"use client";

import { useActionState, useEffect, useRef } from "react";
import { submitKeepingValues } from "@/components/ui/submit-keeping-values";
import { announce } from "@/components/ui/announcer";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { focusFirstError } from "@/components/ui/focus";
import { Input } from "@/components/ui/input";
import { updateDisplayName } from "../actions";
import type { ProfileFormState } from "../_lib/profile";

const initialState: ProfileFormState = { status: "idle" };

export function DisplayNameForm({ name }: { name: string }) {
  const [state, action, pending] = useActionState(updateDisplayName, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  // Saved: a short announcement (focus stays on "Zapisz"). Error: focus the field or the message.
  useEffect(() => {
    if (state.status === "saved" && state.message) announce(state.message);
    if (state.status === "error") focusFirstError(formRef.current);
  }, [state]);

  return (
    <form
      ref={formRef}
      action={action}
      onSubmit={submitKeepingValues(action)}
      className="flex flex-wrap items-end gap-2.5"
      noValidate
    >
      <Field
        label="Jak mamy Cię nazywać"
        error={state.fieldError}
        required
        className="flex-[1_1_320px]"
      >
        {(p) => <Input {...p} name="name" autoComplete="nickname" defaultValue={name} required />}
      </Field>
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Zapisujemy…" : "Zapisz"}
      </Button>
      {state.message ? (
        <p
          data-form-error={state.status === "error" ? "" : undefined}
          className="basis-full text-base"
        >
          {state.status === "error" ? (
            <strong className="text-danger">{state.message}</strong>
          ) : (
            state.message
          )}
        </p>
      ) : null}
    </form>
  );
}
