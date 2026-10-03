"use client";

import Link from "next/link";
import { useActionState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { useFocusFirstError } from "@/components/ui/focus";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { signIn } from "@/lib/auth/actions";
import type { AuthFormState } from "@/lib/auth/login";
import { ResendConfirmation } from "./check-inbox";
import { FormMessage } from "./form-message";
import { submitKeepingValues } from "@/components/ui/submit-keeping-values";

const initialState: AuthFormState = { status: "idle" };

// E-mail and password sign-in from design/makiety/Logowanie.dc.html
export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(signIn, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  // After a failed sign-in: focus the first wrong field, or the message ("Nieprawidłowy…")
  useFocusFirstError(formRef, state.status === "error" ? state : undefined);

  return (
    <div className="flex flex-col gap-5">
      <form
        ref={formRef}
        action={action}
        onSubmit={submitKeepingValues(action)}
        className="flex flex-col gap-5"
        noValidate
      >
        <input type="hidden" name="next" value={next ?? ""} />
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
        <div className="relative">
          {/* Before the field in the DOM, as it is on screen (next to the label): WCAG 1.3.2, 2.4.3 */}
          <Link
            href="/forgot-password"
            className="absolute -top-2.5 right-0 inline-flex min-h-11 items-center text-base"
          >
            Nie pamiętasz hasła?
          </Link>
          <Field label="Hasło" error={state.fieldErrors?.password} required>
            {(p) => (
              <PasswordInput {...p} name="password" autoComplete="current-password" required />
            )}
          </Field>
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
