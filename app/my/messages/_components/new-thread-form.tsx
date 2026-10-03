"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { startAction, type FormState } from "../_lib/actions";

export function NewThreadForm({
  topic,
  text,
  ideaId,
  innovationId,
  toUserId,
}: {
  topic?: string;
  text?: string;
  ideaId?: string;
  innovationId?: string;
  toUserId?: string;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(startAction, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="idea" value={ideaId ?? ""} />
      <input type="hidden" name="innovation" value={innovationId ?? ""} />
      <input type="hidden" name="to" value={toUserId ?? ""} />
      <Field label="Temat">
        {(p) => <Input {...p} name="temat" required maxLength={200} defaultValue={topic} />}
      </Field>
      <Field label="Wiadomość" hint="Odpowiedź dostaniesz tutaj i mailem." error={state.error}>
        {(p) => (
          <Textarea {...p} name="tresc" rows={6} required maxLength={5000} defaultValue={text} />
        )}
      </Field>
      <Button type="submit" className="self-start" disabled={pending}>
        {pending ? "Wysyłamy…" : "Wyślij do ROPS"}
      </Button>
    </form>
  );
}
