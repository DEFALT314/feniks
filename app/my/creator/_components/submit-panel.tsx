"use client";

import { useActionState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { IdeaStatus } from "@/lib/contracts/admin";
import { sendToRops } from "../actions";
import { authorStatus, canSubmit } from "../_lib/submission";
import type { SubmitState } from "../_lib/submit";

const dateTime = new Intl.DateTimeFormat("pl-PL", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Warsaw",
});

type Props = {
  ideaId: string;
  sentAt: string | null;
  status: IdeaStatus | null;
  comment: string | null;
  missing: string[]; // empty required card fields, from the current (unsaved) draft
  beforeSend: () => Promise<boolean>; // saves pending card edits first
  justSent: "first" | "again" | null; // after a successful send the page reloads with ?sent=
};

// "Wyślij do ROPS" (#35): sendToRops sends the idea, notifies ROPS and reloads the card with ?sent=
export function SubmitPanel({
  ideaId,
  sentAt,
  status,
  comment,
  missing,
  beforeSend,
  justSent,
}: Props) {
  const [state, send, pending] = useActionState<SubmitState>(
    async () => {
      if (!(await beforeSend())) {
        return { status: "error", message: "Najpierw zapisz fiszkę: sprawdź zaznaczone pola." };
      }
      return sendToRops(ideaId);
    },
    { status: "idle" },
  );

  // Show the confirmation once: drop ?sent= so a reload or Back doesn't repeat it
  useEffect(() => {
    if (!justSent) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("sent");
    window.history.replaceState(window.history.state, "", url);
  }, [justSent]);

  const label = authorStatus(sentAt, status);
  const allowed = canSubmit(sentAt, status) && state.status !== "sent";
  const resend = sentAt !== null;

  return (
    <section aria-labelledby="submit-heading" className="flex flex-col gap-3">
      <h2 id="submit-heading" className="sr-only">
        Wysyłka do ROPS
      </h2>
      {sentAt ? (
        <div className="flex flex-col gap-2">
          <Badge variant={label.badge} className="self-start">
            {label.label}
          </Badge>
          <p className="text-muted-foreground text-base">
            Wysłano {dateTime.format(new Date(sentAt))}.
          </p>
          {comment ? (
            <p className="bg-neutral-soft rounded-[10px] px-4 py-3 text-base">
              <strong>Uwagi ROPS:</strong> {comment}
            </p>
          ) : null}
        </div>
      ) : null}
      {allowed ? (
        <form action={send} className="flex flex-col gap-2">
          {missing.length ? (
            <p className="text-base">
              Żeby wysłać, uzupełnij: <strong>{missing.join(", ")}</strong>.
            </p>
          ) : null}
          <Button type="submit" disabled={pending || missing.length > 0}>
            {pending ? "Wysyłamy…" : resend ? "Wyślij poprawioną wersję" : "Wyślij do ROPS"}
          </Button>
          <p className="text-muted-foreground text-base">
            Zespół ROPS dostanie powiadomienie. Odpowiedź zobaczysz w Wiadomościach.
          </p>
        </form>
      ) : null}
      <div aria-live="polite">
        {justSent && sentAt ? (
          <p role="status" className="text-success font-bold">
            {justSent === "again" ? "Wysłano poprawioną wersję do ROPS." : "Wysłano do ROPS."}{" "}
            Dostaniesz powiadomienie, gdy zespół oceni pomysł.
          </p>
        ) : null}
        {state.status === "error" ? (
          <p role="alert" className="text-danger font-bold">
            {state.message}
            {state.missing?.length ? ` Brakuje: ${state.missing.join(", ")}.` : ""}
          </p>
        ) : null}
      </div>
    </section>
  );
}
