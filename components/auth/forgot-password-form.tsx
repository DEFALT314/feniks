"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { useFocusFirstError } from "@/components/ui/focus";
import { Input } from "@/components/ui/input";
import { sendPasswordReset } from "@/lib/auth/actions";
import type { AuthFormState } from "@/lib/auth/login";
import { FormMessage } from "./form-message";
import { submitKeepingValues } from "@/components/ui/submit-keeping-values";

const initialState: AuthFormState = { status: "idle" };

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(sendPasswordReset, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  useFocusFirstError(formRef, state.status === "error" ? state : undefined);

  if (state.status === "sent" && state.email) return <ResetLinkSent email={state.email} />;

  return (
    <form
      ref={formRef}
      action={action}
      onSubmit={submitKeepingValues(action)}
      className="flex flex-col gap-5"
      noValidate
    >
      <p className="text-muted-foreground">
        Podaj adres e-mail konta. Wyślemy link do ustawienia nowego hasła.
      </p>
      <Field label="Adres e-mail" error={state.fieldErrors?.email} required>
        {(p) => (
          <Input
            {...p}
            name="email"
            type="email"
            autoComplete="email"
            required
            defaultValue={state.email}
          />
        )}
      </Field>
      <FormMessage message={state.message} />
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Wysyłamy…" : "Wyślij link"}
      </Button>
    </form>
  );
}

// Replaces the form, so the pressed button is gone: focus moves to this text, which reads it
// out (a status region mounted together with its text is often skipped, WCAG 4.1.3 and 2.4.3).
export function ResetLinkSent({ email }: { email: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => ref.current?.focus(), []);
  return (
    <p ref={ref} tabIndex={-1}>
      Jeśli konto <strong>{email}</strong> istnieje, wysłaliśmy na ten adres link do ustawienia
      nowego hasła. Sprawdź skrzynkę, także folder ze spamem.
    </p>
  );
}
