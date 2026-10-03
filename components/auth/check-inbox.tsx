"use client";

import { MailCheck } from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { announce } from "@/components/ui/announcer";
import { Button } from "@/components/ui/button";
import { useFocusFirstError } from "@/components/ui/focus";
import { resendSignupEmail } from "@/lib/auth/actions";
import type { AuthFormState } from "@/lib/auth/login";
import { FormMessage } from "./form-message";

const initialState: AuthFormState = { status: "idle" };

// Shown after sign-up: the account works once the link in the e-mail is clicked.
export function CheckInbox({ email, next }: { email: string; next?: string }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  // Move focus to the new content, so keyboard and screen-reader users notice the change.
  useEffect(() => headingRef.current?.focus(), []);

  return (
    <div className="flex flex-col gap-4">
      <div
        role="status"
        className="bg-success-soft border-success/30 flex flex-col gap-3 rounded-xl border p-5"
      >
        <div className="flex items-center gap-3">
          <MailCheck aria-hidden="true" className="text-success size-8 shrink-0" />
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="font-heading text-2xl font-bold outline-none"
          >
            Sprawdź skrzynkę
          </h2>
        </div>
        <p>
          Wysłaliśmy link na adres <strong className="break-all">{email}</strong>.
        </p>
        <ol className="flex list-decimal flex-col gap-1 pl-6">
          <li>Otwórz maila „Potwierdź adres e-mail w HubMI.pl”.</li>
          <li>Kliknij przycisk „Potwierdzam adres”.</li>
          <li>Zalogujemy Cię automatycznie.</li>
        </ol>
        <p className="text-muted-foreground text-base">
          Link jest ważny przez 24 godziny. Nie widzisz maila? Sprawdź folder Spam albo Oferty.
        </p>
      </div>
      <ResendConfirmation email={email} next={next} />
      <Link href="/login" className="inline-flex min-h-11 items-center self-start text-base">
        Wróć do logowania
      </Link>
    </div>
  );
}

// Sends the confirmation link again (after sign-up, or when sign-in says "not confirmed").
export function ResendConfirmation({ email, next }: { email: string; next?: string }) {
  const [state, action, pending] = useActionState(resendSignupEmail, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  useFocusFirstError(formRef, state.status === "error" ? state : undefined);
  // "Wysłaliśmy link ponownie" can repeat word for word, which a status region would not re-read
  useEffect(() => {
    if (state.status === "sent" && state.message) announce(state.message);
  }, [state]);
  return (
    <form ref={formRef} action={action} className="flex flex-col gap-2">
      <input type="hidden" name="email" value={email} />
      <input type="hidden" name="next" value={next ?? ""} />
      <p className="text-base">Mail nie przyszedł albo link wygasł?</p>
      <Button type="submit" variant="secondary" className="self-start" disabled={pending}>
        {pending ? "Wysyłamy…" : "Wyślij link ponownie"}
      </Button>
      {/* Info is announced above; the visible text stays here */}
      {state.status === "sent" ? (
        <p className="text-base">{state.message}</p>
      ) : (
        <FormMessage message={state.message} />
      )}
    </form>
  );
}
