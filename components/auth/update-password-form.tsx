"use client";

import { useActionState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { useFocusFirstError } from "@/components/ui/focus";
import { PasswordInput } from "@/components/ui/password-input";
import { setNewPassword } from "@/lib/auth/actions";
import type { AuthFormState } from "@/lib/auth/login";
import { PASSWORD_MIN_LENGTH } from "@/lib/auth/validation";
import { FormMessage } from "./form-message";
import { submitKeepingValues } from "@/components/ui/submit-keeping-values";

const initialState: AuthFormState = { status: "idle" };

export function UpdatePasswordForm() {
  const [state, action, pending] = useActionState(setNewPassword, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  useFocusFirstError(formRef, state.status === "error" ? state : undefined);

  return (
    <form
      ref={formRef}
      action={action}
      onSubmit={submitKeepingValues(action)}
      className="flex flex-col gap-5"
      noValidate
    >
      <Field
        label="Nowe hasło"
        hint={`Co najmniej ${PASSWORD_MIN_LENGTH} znaków.`}
        error={state.fieldErrors?.password}
        required
      >
        {(p) => (
          <PasswordInput
            {...p}
            name="password"
            autoComplete="new-password"
            minLength={PASSWORD_MIN_LENGTH}
            required
          />
        )}
      </Field>
      <FormMessage message={state.message} />
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Zapisujemy…" : "Zapisz hasło"}
      </Button>
    </form>
  );
}
