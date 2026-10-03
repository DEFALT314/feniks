"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { requestRole } from "../actions";
import { REQUESTABLE_ROLE_LABELS, REQUESTABLE_ROLES, type ProfileFormState } from "../_lib/profile";

const initialState: ProfileFormState = { status: "idle" };

export function RoleRequestForm() {
  const [state, action, pending] = useActionState(requestRole, initialState);
  return (
    <form action={action} className="flex flex-col gap-3.5" noValidate>
      <fieldset
        className="m-0 flex flex-col gap-2 border-0 p-0"
        aria-describedby={state.fieldError ? "role-error" : undefined}
      >
        <legend className="sr-only">Rola, o którą prosisz</legend>
        {state.fieldError ? (
          <p id="role-error" className="text-danger text-base font-bold">
            {state.fieldError}
          </p>
        ) : null}
        {REQUESTABLE_ROLES.map((role) => (
          <label
            key={role}
            className="border-border has-checked:border-navy flex min-h-12 cursor-pointer items-center gap-3 rounded-[10px] border px-4 py-3 font-normal has-checked:border-2"
          >
            <input type="radio" name="role" value={role} className="accent-navy size-5 shrink-0" />
            {REQUESTABLE_ROLE_LABELS[role]}
          </label>
        ))}
      </fieldset>
      {state.message && state.status === "error" ? (
        <p role="alert" className="text-danger font-bold">
          {state.message}
        </p>
      ) : null}
      <Button type="submit" variant="secondary" className="self-start" disabled={pending}>
        {pending ? "Wysyłamy…" : "Wyślij prośbę do ROPS"}
      </Button>
    </form>
  );
}
