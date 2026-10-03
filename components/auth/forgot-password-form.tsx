"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { sendPasswordReset } from "@/lib/auth/actions";
import type { AuthFormState } from "@/lib/auth/login";
import { FormMessage } from "./form-message";

const initialState: AuthFormState = { status: "idle" };

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(sendPasswordReset, initialState);

  if (state.status === "sent") {
    return (
      <p role="status" aria-live="polite">
        Jeśli konto <strong>{state.email}</strong> istnieje, wysłaliśmy na ten adres link do
        ustawienia nowego hasła. Sprawdź skrzynkę, także folder ze spamem.
      </p>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <p className="text-muted-foreground">
        Podaj adres e-mail konta. Wyślemy link do ustawienia nowego hasła.
      </p>
      <Field label="Adres e-mail" error={state.fieldErrors?.email}>
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
