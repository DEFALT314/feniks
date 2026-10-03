"use client";

import { useActionState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { useFocusFirstError } from "@/components/ui/focus";
import { Input } from "@/components/ui/input";
import { startIdea, type NewIdeaState } from "../actions";

// Name the idea, then the wizard opens on the first canvas question. After a failed submit focus
// goes to the field, which reads its error (WCAG 3.3.1).
export function NewIdeaForm() {
  const [state, action, pending] = useActionState<NewIdeaState, FormData>(startIdea, {});
  const formRef = useRef<HTMLFormElement>(null);
  useFocusFirstError(formRef, state.error ? state : undefined);
  return (
    <form
      ref={formRef}
      action={action}
      noValidate
      className="mt-2 flex max-w-[760px] flex-wrap items-end gap-3"
    >
      <Field label="Nowy pomysł" error={state.error} required className="min-w-0 flex-[1_1_320px]">
        {(control) => (
          <Input
            {...control}
            name="title"
            maxLength={200}
            required
            defaultValue={state.title}
            placeholder="np. Sąsiedzki dyżur po wypisie"
          />
        )}
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "Tworzymy…" : "Zacznij kanwę"}
      </Button>
    </form>
  );
}
