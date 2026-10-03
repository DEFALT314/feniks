"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { sendLoginCode, verifyLoginCode } from "@/lib/auth/actions";
import type { LoginState } from "@/lib/auth/login";

const initialState: LoginState = { status: "idle" };

// Two-step sign-in from design/makiety/Logowanie.dc.html: e-mail → 6-digit code.
export function LoginForm({ next }: { next?: string }) {
  const [sendState, sendAction, sending] = useActionState(sendLoginCode, initialState);
  const [verifyState, verifyAction, verifying] = useActionState(verifyLoginCode, initialState);

  const codeSent = sendState.status === "code-sent";
  const email = verifyState.email ?? sendState.email ?? "";
  const codeError = verifyState.fieldErrors?.code;

  return (
    <div className="flex flex-col gap-[18px]">
      <form action={sendAction} className="flex flex-col gap-[18px]" noValidate>
        <input type="hidden" name="next" value={next ?? ""} />
        <Field label="Adres e-mail" error={sendState.fieldErrors?.email}>
          {(p) => (
            <Input
              {...p}
              name="email"
              type="email"
              autoComplete="email"
              required
              defaultValue={sendState.email}
            />
          )}
        </Field>
        <div className="flex flex-col gap-1.5">
          <label className="flex items-start gap-3 font-normal">
            <input
              type="checkbox"
              name="consent"
              required
              aria-invalid={sendState.fieldErrors?.consent ? true : undefined}
              aria-describedby={sendState.fieldErrors?.consent ? "consent-error" : undefined}
              className="accent-navy mt-1 size-5 shrink-0"
            />
            <span>
              Zgadzam się na przetwarzanie mojego adresu e-mail przez ROPS w Krakowie w celu
              logowania do HubMI.
            </span>
          </label>
          {sendState.fieldErrors?.consent ? (
            <p id="consent-error" className="text-danger text-base font-bold">
              {sendState.fieldErrors.consent}
            </p>
          ) : null}
        </div>
        <Button type="submit" className="self-start" disabled={sending}>
          {codeSent ? "Wyślij kod ponownie" : "Wyślij kod"}
        </Button>
      </form>

      <p aria-live="polite" className="text-base" role="status">
        {sending ? "Wysyłamy kod…" : null}
        {!sending && codeSent ? (
          <>
            Wysłaliśmy kod na adres <strong>{sendState.email}</strong>. Jeśli w mailu jest link
            „Zaloguj się”, możesz też go kliknąć.
          </>
        ) : null}
        {!sending && sendState.message ? (
          <strong className="text-danger">{sendState.message}</strong>
        ) : null}
      </p>

      {codeSent ? (
        <form action={verifyAction} className="flex flex-col gap-[18px]" noValidate>
          <input type="hidden" name="email" value={email} />
          <input type="hidden" name="next" value={next ?? ""} />
          <Field label="Kod z maila" error={codeError}>
            {(p) => (
              <Input
                {...p}
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                className="max-w-[240px] text-[1.625rem] tracking-[0.25em]"
              />
            )}
          </Field>
          <Button type="submit" variant="secondary" className="self-start" disabled={verifying}>
            {verifying ? "Logujemy…" : "Zaloguj"}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
