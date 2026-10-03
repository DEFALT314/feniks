"use client";

import { useActionState, useEffect, useRef } from "react";
import { submitKeepingValues } from "@/components/ui/submit-keeping-values";
import { announce } from "@/components/ui/announcer";
import { Button } from "@/components/ui/button";
import { focusFirstError } from "@/components/ui/focus";
import { requestRole } from "../actions";
import { REQUESTABLE_LABELS, RequestableRole, type RoleRequestState } from "../_lib/role-request";

const initialState: RoleRequestState = { status: "idle" };

export const SENT_MESSAGE = "Prośba wysłana do ROPS. Dostaniesz powiadomienie o decyzji.";

/** True when the error is about the missing choice, so it belongs to the radio group. */
export function isChoiceError(state: RoleRequestState): boolean {
  return state.status === "error" && state.message.startsWith("Wybierz rolę");
}

// Section "Działasz w imieniu instytucji?" from design/makiety/Profil.dc.html
export function RoleRequestForm({ pending }: { pending: RequestableRole | null }) {
  const [state, action, sending] = useActionState(requestRole, initialState);
  const waiting = state.status === "sent" ? state.role : pending;
  const formRef = useRef<HTMLFormElement>(null);
  const choiceError = isChoiceError(state);

  // Sent: announce it (focus stays on the button). Error: focus the group (its name and the error are read) or the message.
  useEffect(() => {
    if (state.status === "sent") announce(SENT_MESSAGE);
    if (state.status === "error") focusFirstError(formRef.current);
  }, [state]);

  return (
    <form
      ref={formRef}
      action={action}
      onSubmit={submitKeepingValues(action)}
      className="flex flex-col gap-3.5"
      noValidate
    >
      {waiting ? (
        <p className="bg-warning-soft text-warning m-0 rounded-[10px] px-4 py-3 font-bold">
          Prośba o rolę „{REQUESTABLE_LABELS[waiting]}” czeka na decyzję ROPS. Dostaniesz
          powiadomienie.
        </p>
      ) : null}
      <fieldset
        role="radiogroup"
        aria-invalid={choiceError ? true : undefined}
        aria-describedby={choiceError ? "role-request-error" : undefined}
        className="m-0 flex flex-col gap-1 border-0 p-0"
      >
        <legend className="mb-1 font-bold">Rola, o którą prosisz</legend>
        {RequestableRole.options.map((role) => (
          <label
            key={role}
            className="flex min-h-11 cursor-pointer items-center gap-3 text-[1.0625rem]"
          >
            <input
              type="radio"
              name="role"
              value={role}
              defaultChecked={role === waiting}
              className="accent-navy size-5"
            />
            {REQUESTABLE_LABELS[role]}
          </label>
        ))}
      </fieldset>
      <Button type="submit" variant="secondary" disabled={sending} className="self-start">
        {sending ? "Wysyłamy…" : waiting ? "Zmień prośbę" : "Wyślij prośbę do ROPS"}
      </Button>
      {state.status === "error" ? (
        <p id="role-request-error" data-form-error className="m-0 text-base">
          <strong className="text-danger">{state.message}</strong>
        </p>
      ) : null}
      {state.status === "sent" ? <p className="m-0 text-base">{SENT_MESSAGE}</p> : null}
    </form>
  );
}
