"use client";

import { useActionState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { useFocusFirstError } from "@/components/ui/focus";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { signUp } from "@/lib/auth/actions";
import type { AuthFormState } from "@/lib/auth/login";
import { PASSWORD_MIN_LENGTH } from "@/lib/auth/validation";
import { CheckInbox } from "./check-inbox";
import { FormMessage } from "./form-message";
import { submitKeepingValues } from "@/components/ui/submit-keeping-values";

const initialState: AuthFormState = { status: "idle" };

// Sign-up from design/makiety/Rejestracja.dc.html: e-mail, password, consent. No role choice:
// every new account is a resident; other roles are requested later and approved by ROPS.
export function RegisterForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(signUp, initialState);
  const consentError = state.fieldErrors?.consent;
  const formRef = useRef<HTMLFormElement>(null);
  useFocusFirstError(formRef, state.status === "error" ? state : undefined);

  // Supabase "Confirm email" is on: the account works after the link in the e-mail is clicked.
  if (state.status === "sent" && state.email) return <CheckInbox email={state.email} next={next} />;

  return (
    // submitKeepingValues: a failed sign-up keeps the password and the consent tick (WCAG 3.3.7)
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
      <Field
        label="Hasło"
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
      <div className="flex flex-col gap-1.5">
        <label className="flex min-h-11 items-start gap-3 font-normal">
          <input
            type="checkbox"
            name="consent"
            required
            aria-invalid={consentError ? true : undefined}
            aria-describedby={consentError ? "consent-error" : undefined}
            className="accent-navy mt-1 size-5 shrink-0"
          />
          <span>
            Zgadzam się na przetwarzanie mojego adresu e-mail przez ROPS w Krakowie w celu
            korzystania z HubMI. <span className="text-muted-foreground">(wymagane)</span>
          </span>
        </label>
        {consentError ? (
          <p id="consent-error" className="text-danger text-base font-bold">
            {consentError}
          </p>
        ) : null}
      </div>
      <FormMessage message={state.message} />
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Zakładamy konto…" : "Załóż konto"}
      </Button>
    </form>
  );
}
