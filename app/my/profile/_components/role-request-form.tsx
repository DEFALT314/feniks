"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { requestRole } from "../actions";
import { REQUESTABLE_LABELS, RequestableRole, type RoleRequestState } from "../_lib/role-request";

const initialState: RoleRequestState = { status: "idle" };

// Section "Działasz w imieniu instytucji?" from design/makiety/Profil.dc.html
export function RoleRequestForm({ pending }: { pending: RequestableRole | null }) {
  const [state, action, sending] = useActionState(requestRole, initialState);
  const waiting = state.status === "sent" ? state.role : pending;

  return (
    <form action={action} className="flex flex-col gap-3.5" noValidate>
      {waiting ? (
        <p className="bg-warning-soft text-warning m-0 rounded-[10px] px-4 py-3 font-bold">
          Prośba o rolę „{REQUESTABLE_LABELS[waiting]}” czeka na decyzję ROPS. Dostaniesz
          powiadomienie.
        </p>
      ) : null}
      <fieldset className="m-0 flex flex-col gap-1 border-0 p-0">
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
      <p role="status" aria-live="polite" className="m-0 text-base empty:hidden">
        {state.status === "error" ? <strong className="text-danger">{state.message}</strong> : null}
        {state.status === "sent" ? "Wysłano. ROPS zobaczy prośbę w panelu." : null}
      </p>
    </form>
  );
}
