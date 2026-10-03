"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/input";
import { replyAction, type FormState } from "../_lib/actions";

export function ReplyForm({
  threadId,
  children,
}: {
  threadId: string;
  children?: React.ReactNode;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    replyAction.bind(null, threadId),
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.sentAt) formRef.current?.reset();
  }, [state.sentAt]);

  return (
    <form
      ref={formRef}
      action={action}
      className="border-border mt-auto flex flex-col gap-2 border-t pt-4"
    >
      <Field label="Odpowiedz" error={state.error}>
        {(p) => <Textarea {...p} name="tresc" rows={3} required maxLength={5000} />}
      </Field>
      <div className="flex flex-wrap gap-2.5">
        <Button type="submit" disabled={pending}>
          {pending ? "Wysyłamy…" : "Wyślij"}
        </Button>
        {children}
      </div>
      <p role="status" aria-live="polite" className="sr-only">
        {state.sentAt ? "Wiadomość wysłana." : ""}
      </p>
    </form>
  );
}
