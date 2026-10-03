"use client";

import { useActionState, useEffect, useRef } from "react";
import { announce } from "@/components/ui/announcer";
import { submitKeepingValues } from "@/components/ui/submit-keeping-values";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { focusFirstError } from "@/components/ui/focus";
import { Textarea } from "@/components/ui/input";
import { replyAction, type FormState } from "../_lib/actions";
import { errorField } from "../_lib/announce";

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
  const fieldError = errorField(state.error) === "tresc" ? state.error : undefined;
  const formError = state.error && !fieldError ? state.error : undefined;

  // After sending: empty field, focus back in it for the next message, short confirmation.
  // After an error: focus the field or the message, so the error is read out (WCAG 3.3.1).
  useEffect(() => {
    if (state.sentAt) {
      formRef.current?.reset();
      formRef.current?.querySelector("textarea")?.focus();
      announce("Wiadomość wysłana.");
    } else if (state.error) {
      focusFirstError(formRef.current);
    }
  }, [state]);

  return (
    <form
      ref={formRef}
      action={action}
      onSubmit={submitKeepingValues(action)}
      className="border-border mt-auto flex flex-col gap-2 border-t pt-4"
      noValidate
    >
      <Field label="Odpowiedz" error={fieldError} required>
        {(p) => <Textarea {...p} name="tresc" rows={3} required maxLength={5000} />}
      </Field>
      <div className="flex flex-wrap gap-2.5">
        <Button type="submit" disabled={pending}>
          {pending ? "Wysyłamy…" : "Wyślij"}
        </Button>
        {children}
      </div>
      {formError ? (
        <p data-form-error className="text-danger text-base font-bold">
          {formError}
        </p>
      ) : null}
    </form>
  );
}
