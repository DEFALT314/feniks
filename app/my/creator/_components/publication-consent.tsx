"use client";

import Link from "next/link";
import { useActionState, useEffect, useId, useRef } from "react";
import { announce } from "@/components/ui/announcer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { focusElement } from "@/components/ui/focus";
import { setIdeaConsent } from "../actions";
import type { ConsentState, PublicationView } from "../_lib/publication";

const day = new Intl.DateTimeFormat("pl-PL", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Europe/Warsaw",
});

type Props = {
  ideaId: string;
  consent: boolean;
  publishedAt: string | null;
  approved?: boolean; // the current ROPS decision is an approval
};

// "Pokazywanie innym" (#104): after sending, the author sees whether the idea is shown as a good
// practice and can give or withdraw consent at any time. One button that changes its label, so
// focus stays on it after the change; the result is announced once (WCAG 4.1.3).
export function PublicationConsent({ ideaId, consent, publishedAt, approved = true }: Props) {
  // Shown only with consent: the database clears the publication when consent is withdrawn
  const view: PublicationView = !consent
    ? { kind: "no-consent" }
    : publishedAt && approved
      ? { kind: "published", since: publishedAt }
      : { kind: "consent" };
  const [state, change, pending] = useActionState<ConsentState>(
    () => setIdeaConsent(ideaId, !consent),
    { status: "idle" },
  );
  const errorRef = useRef<HTMLParagraphElement>(null);
  const hintId = useId();

  useEffect(() => {
    if (state.status === "saved") announce(state.message);
    if (state.status === "error") focusElement(errorRef.current);
  }, [state]);

  return (
    <section
      aria-labelledby={`${hintId}-heading`}
      className="border-line flex flex-col gap-2.5 rounded-[10px] border bg-white p-4"
    >
      <h3 id={`${hintId}-heading`} className="text-base font-bold">
        Pokazywanie innym
      </h3>
      {view.kind === "published" ? (
        <>
          <Badge variant="success" className="self-start">
            Pokazujemy w Bibliotece
          </Badge>
          <p className="text-base">
            Pokazujemy od {day.format(new Date(view.since))}. Każdy może przeczytać fiszkę wśród
            dobrych praktyk mieszkańców, bez Twojego imienia i nazwiska.
          </p>
          <Link href={`/library/good-practices/${ideaId}`} className="self-start text-base">
            Zobacz, jak widzą go inni
          </Link>
        </>
      ) : view.kind === "consent" ? (
        <p className="text-base">
          Masz włączoną zgodę. Jeśli ROPS zatwierdzi pomysł, może pokazać fiszkę innym w Bibliotece,
          bez Twojego imienia i nazwiska.
        </p>
      ) : (
        <p className="text-base">
          Pomysł widzą tylko ROPS i eksperci. Możesz pozwolić ROPS pokazać fiszkę innym jako dobrą
          praktykę, bez Twojego imienia i nazwiska.
        </p>
      )}
      <form action={change} className="flex flex-col gap-1.5">
        <Button
          type="submit"
          variant="secondary"
          size="sm"
          disabled={pending}
          aria-describedby={view.kind === "published" ? hintId : undefined}
          className="self-start"
        >
          {consent ? "Wycofaj zgodę" : "Pozwól pokazać pomysł innym"}
        </Button>
        {view.kind === "published" ? (
          <p id={hintId} className="text-muted-foreground text-base">
            Pomysł od razu zniknie z Biblioteki. Żeby wrócił, ROPS musi go pokazać ponownie.
          </p>
        ) : null}
      </form>
      {state.status === "error" ? (
        <p ref={errorRef} tabIndex={-1} data-form-error className="text-danger text-base font-bold">
          {state.message}
        </p>
      ) : null}
    </section>
  );
}
