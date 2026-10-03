"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { resendSignupEmail, signIn } from "@/lib/auth/actions";
import type { AuthFormState } from "@/lib/auth/login";
import { FormMessage } from "./form-message";

const initialState: AuthFormState = { status: "idle" };

// E-mail and password sign-in from design/makiety/Logowanie.dc.html
export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(signIn, initialState);

  return (
    <div className="flex flex-col gap-5">
      <form action={action} className="flex flex-col gap-5" noValidate>
        <input type="hidden" name="next" value={next ?? ""} />
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
        <div className="relative">
          <Field label="Hasło" error={state.fieldErrors?.password}>
            {(p) => (
              <PasswordInput {...p} name="password" autoComplete="current-password" required />
            )}
          </Field>
          <Link href="/forgot-password" className="absolute top-0 right-0 text-base">
            Nie pamiętasz hasła?
          </Link>
        </div>
        <FormMessage message={state.message} />
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Logujemy…" : "Zaloguj"}
        </Button>
      </form>
      {state.unconfirmed && state.email ? (
        <ResendConfirmation email={state.email} next={next} />
      ) : null}
    </div>
  );
}

// Shown when the account exists but the address was never confirmed.
function ResendConfirmation({ email, next }: { email: string; next?: string }) {
  const [state, action, pending] = useActionState(resendSignupEmail, initialState);
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="email" value={email} />
      <input type="hidden" name="next" value={next ?? ""} />
      <p className="text-base">Nie dostałeś maila z linkiem albo link wygasł?</p>
      <Button type="submit" variant="secondary" className="self-start" disabled={pending}>
        {pending ? "Wysyłamy…" : "Wyślij link ponownie"}
      </Button>
      <FormMessage message={state.message} tone={state.status === "sent" ? "info" : "error"} />
    </form>
  );
}
