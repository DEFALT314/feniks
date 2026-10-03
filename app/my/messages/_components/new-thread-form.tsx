"use client";

import { useActionState, useRef } from "react";
import { submitKeepingValues } from "@/components/ui/submit-keeping-values";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { useFocusFirstError } from "@/components/ui/focus";
import { Input, Textarea } from "@/components/ui/input";
import { startAction, type FormState } from "../_lib/actions";
import { errorField } from "../_lib/announce";

export function NewThreadForm({
  topic,
  text,
  ideaId,
  innovationId,
  toUserId,
  recipients,
}: {
  topic?: string;
  text?: string;
  ideaId?: string;
  innovationId?: string;
  toUserId?: string;
  recipients: { value: string; label: string }[] | null; // null: no choice (idea conversation)
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(startAction, {});
  const formRef = useRef<HTMLFormElement>(null);
  const field = errorField(state.error);
  useFocusFirstError(formRef, state.error ? state : undefined);
  return (
    <form
      ref={formRef}
      action={action}
      onSubmit={submitKeepingValues(action)}
      className="flex flex-col gap-4"
      noValidate
    >
      <input type="hidden" name="idea" value={ideaId ?? ""} />
      <input type="hidden" name="innovation" value={innovationId ?? ""} />
      {recipients && (!toUserId || recipients.some((r) => r.value === toUserId)) ? (
        <Field
          label="Do kogo"
          hint="Zespół ROPS czyta każdą rozmowę, także z ekspertem, organizacją albo gminą."
        >
          {(p) => (
            <select
              {...p}
              name="to"
              defaultValue={toUserId ?? ""}
              className="border-input text-ink focus:border-navy min-h-11 w-full rounded-[10px] border bg-white px-3 text-base"
            >
              {recipients.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          )}
        </Field>
      ) : (
        <input type="hidden" name="to" value={toUserId ?? ""} />
      )}
      <Field label="Temat" error={field === "temat" ? state.error : undefined} required>
        {(p) => <Input {...p} name="temat" required maxLength={200} defaultValue={topic} />}
      </Field>
      <Field
        label="Wiadomość"
        hint="Odpowiedź dostaniesz tutaj i mailem."
        error={field === "tresc" ? state.error : undefined}
        required
      >
        {(p) => (
          <Textarea {...p} name="tresc" rows={6} required maxLength={5000} defaultValue={text} />
        )}
      </Field>
      {state.error && !field ? (
        <p data-form-error className="text-danger text-base font-bold">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" className="self-start" disabled={pending}>
        {pending ? "Wysyłamy…" : "Wyślij"}
      </Button>
    </form>
  );
}
