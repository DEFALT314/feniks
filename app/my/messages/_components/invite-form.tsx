"use client";

import { useActionState, useEffect, useRef } from "react";
import { announce } from "@/components/ui/announcer";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { focusFirstError } from "@/components/ui/focus";
import { inviteAction, type InviteState } from "../_lib/actions";

// ROPS only: invite an expert (mentor), an organisation or a municipality into this conversation.
export function InviteForm({
  threadId,
  people,
}: {
  threadId: string;
  people: { value: string; label: string }[];
}) {
  const [state, action, pending] = useActionState<InviteState, FormData>(
    inviteAction.bind(null, threadId),
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.invitedAt) announce("Zaproszono do rozmowy. Ta osoba dostała powiadomienie.");
    else if (state.error) focusFirstError(formRef.current);
  }, [state]);
  if (people.length === 0) return null;

  return (
    <details className="border-border rounded-[10px] border px-4 py-2">
      <summary className="text-navy min-h-11 cursor-pointer content-center text-base font-bold">
        Zaproś eksperta albo partnera do tej rozmowy
      </summary>
      <form ref={formRef} action={action} className="flex flex-col gap-3 pt-2 pb-2">
        <Field label="Kogo zaprosić" error={state.error}>
          {(p) => (
            <select
              {...p}
              name="user"
              className="border-input text-ink focus:border-navy min-h-11 w-full rounded-[10px] border bg-white px-3 text-base"
            >
              {people.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Button type="submit" variant="secondary" className="self-start" disabled={pending}>
          {pending ? "Zapraszamy…" : "Zaproś"}
        </Button>
      </form>
    </details>
  );
}
