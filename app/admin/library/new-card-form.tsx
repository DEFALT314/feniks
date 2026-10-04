"use client";

import { useActionState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { useFocusFirstError } from "@/components/ui/focus";
import { Input } from "@/components/ui/input";
import type { Category } from "@/lib/contracts/knowledge-base";
import { addCard } from "./_lib/actions";
import type { NewCardState } from "./_lib/new-card";

const SELECT =
  "border-input text-ink focus:border-navy min-h-[50px] w-full rounded-[10px] border bg-white px-3 text-lg";

// A new card starts hidden; after "Dodaj kartę" the editor lands on its edit form
export function NewCardForm({ categories }: { categories: Category[] }) {
  const [state, action, pending] = useActionState<NewCardState, FormData>(addCard, {
    status: "idle",
  });
  const formRef = useRef<HTMLFormElement>(null);
  useFocusFirstError(formRef, state.status === "error" ? state : undefined);
  const typed = state.status === "error" ? state : { nazwa: "", kategoria_id: "" };

  return (
    <form
      ref={formRef}
      action={action}
      // A new key after an error re-applies the typed values as defaults
      key={
        state.status === "error" ? `${state.nazwa}|${state.kategoria_id}|${state.message}` : "new"
      }
      className="flex flex-col gap-4"
      noValidate
    >
      <Field label="Nazwa innowacji" required>
        {(p) => <Input {...p} name="nazwa" required maxLength={200} defaultValue={typed.nazwa} />}
      </Field>
      <Field label="Kategoria" required>
        {(p) => (
          <select
            {...p}
            name="kategoria_id"
            required
            defaultValue={typed.kategoria_id}
            className={SELECT}
          >
            <option value="" disabled>
              Wybierz kategorię
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nazwa}
              </option>
            ))}
          </select>
        )}
      </Field>
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "Dodawanie…" : "Dodaj kartę"}
        </Button>
        <p role="status" aria-live="polite" className="m-0 text-base font-bold">
          {state.status === "error" ? (
            <span data-form-error className="text-danger">
              {state.message}
            </span>
          ) : null}
        </p>
      </div>
    </form>
  );
}
